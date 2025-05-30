import { PrismaClient, Event, EventType, EventStatus } from '@prisma/client';
console.log('DEBUG: Prisma Client version:', require('@prisma/client/package.json').version);
import { createLogger } from '../utils/logger';
import type { EventFormData, EventListItem } from '../types';

const logger = createLogger('event-service');

// =============================================================================
// Event Service Class
// =============================================================================

export class EventService {
  constructor(private prisma: PrismaClient) {}

  // ===========================================================================
  // Event Creation
  // ===========================================================================

  /**
   * Creates a new event from form wizard data
   */
  async createEvent(data: EventFormData & { slug: string; createdBy: string }) {
    try {
      // Ensure eventType is uppercase to match Prisma enum
      const eventTypeValidated = data.eventType.toUpperCase() as EventType;

      const event = await this.prisma.event.create({
        data: {
          // Basic Information
          title: data.title,
          description: data.description,
          slug: data.slug,
          eventType: eventTypeValidated,
          
          // Date & Time
          startDate: data.startDate,
          endDate: data.endDate,
          timezone: data.timezone,
          
          // Location
          locationName: data.location.name,
          locationAddress: data.location.address,
          isOnline: data.location.isOnline,
          meetingLink: data.location.meetingLink,
          
          // Ticketing
          isFree: data.ticketInfo.isFree,
          ticketPrice: data.ticketInfo.price,
          ticketCurrency: data.ticketInfo.currency,
          registrationRequired: data.ticketInfo.registrationRequired,
          registrationDeadline: data.ticketInfo.registrationDeadline,
          maxAttendees: data.ticketInfo.maxAttendees,
          
          // Status & Visibility
          status: 'DRAFT',
          isPublished: false,
          
          // Metadata
          tags: data.tags || [],
          customFields: {
            contentPreferences: data.contentPreferences as any,
          },
          
          // Ownership & Consents from EventFormData
          createdBy: data.createdBy,
          consentDataAccuracy: data.consentDataAccuracy,
          consentAiGeneration: data.consentAiGeneration,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      logger.info(`Event created successfully: ${event.id} (${event.title})`);
      
      // Log audit trail
      await this.logEventAction(event.id, data.createdBy, 'event_created', null, {
        title: event.title,
        eventType: event.eventType,
      });

      return event;
    } catch (error) {
      logger.error('Failed to create event:', error);
      throw new Error('Failed to create event');
    }
  }

  // ===========================================================================
  // Event Retrieval
  // ===========================================================================

  /**
   * Gets paginated list of user's events
   */
  async getUserEvents(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: EventStatus;
      search?: string;
    } = {}
  ) {
    const { page = 1, limit = 10, status, search } = options;
    const skip = (page - 1) * limit;

    try {
      const where: any = {
        createdBy: userId,
      };

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [events, totalCount] = await Promise.all([
        this.prisma.event.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            generatedContent: {
              select: {
                flyerUrl: true,
                instagramCaption: true,
                linkedinCaption: true,
                whatsAppMessageText: true,
                generatedAt: true,
              },
            },
            _count: {
              select: {
                workflowSessions: true,
              },
            },
          },
        }),
        this.prisma.event.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        items: events.map(this.transformEventForList),
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Failed to fetch user events:', error);
      throw new Error('Failed to fetch events');
    }
  }

  /**
   * Gets single event by ID with user access check
   */
  async getEventById(eventId: string, userId: string) {
    try {
      const event = await this.prisma.event.findFirst({
        where: {
          id: eventId,
          OR: [
            { createdBy: userId },
            // Allow admins/organizers to view all events
            { 
              creator: { 
                role: { in: ['ADMIN', 'ORGANIZER'] } 
              } 
            },
          ],
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          generatedContent: true,
          workflowSessions: {
            orderBy: { startedAt: 'desc' },
            take: 5,
            select: {
              id: true,
              sessionId: true,
              status: true,
              currentStep: true,
              completedSteps: true,
              startedAt: true,
              completedAt: true,
            },
          },
        },
      });

      if (event) {
        logger.debug(`Event retrieved: ${event.id} by user ${userId}`);
      }

      return event;
    } catch (error) {
      logger.error(`Failed to fetch event ${eventId}:`, error);
      throw new Error('Failed to fetch event');
    }
  }

  // ===========================================================================
  // Event Updates
  // ===========================================================================

  /**
   * Updates an existing event
   */
  async updateEvent(
    eventId: string,
    userId: string,
    updates: Partial<EventFormData>
  ) {
    try {
      // First check if user has permission to update
      const existingEvent = await this.prisma.event.findFirst({
        where: {
          id: eventId,
          createdBy: userId,
        },
      });

      if (!existingEvent) {
        return null;
      }

      const updateData: any = {};

      // Map form data to database fields
      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.eventType) updateData.eventType = updates.eventType;
      if (updates.startDate) updateData.startDate = updates.startDate;
      if (updates.endDate) updateData.endDate = updates.endDate;
      if (updates.timezone) updateData.timezone = updates.timezone;
      
      if (updates.location) {
        updateData.locationName = updates.location.name;
        updateData.locationAddress = updates.location.address;
        updateData.isOnline = updates.location.isOnline;
        updateData.meetingLink = updates.location.meetingLink;
      }

      if (updates.ticketInfo) {
        updateData.isFree = updates.ticketInfo.isFree;
        updateData.ticketPrice = updates.ticketInfo.price;
        updateData.registrationRequired = updates.ticketInfo.registrationRequired;
        updateData.maxAttendees = updates.ticketInfo.maxAttendees;
      }

      if (updates.tags) updateData.tags = updates.tags;

      // Update custom fields with new preferences
      if (updates.contentPreferences || updates.ticketInfo) {
        const currentCustomFields = existingEvent.customFields as any || {};
        updateData.customFields = {
          ...currentCustomFields,
          ...(updates.contentPreferences && { contentPreferences: updates.contentPreferences }),
          ...(updates.ticketInfo?.currency && { currency: updates.ticketInfo.currency }),
          ...(updates.ticketInfo?.registrationDeadline && { 
            registrationDeadline: updates.ticketInfo.registrationDeadline 
          }),
        } as any;
      }

      updateData.updatedAt = new Date();

      const updatedEvent = await this.prisma.event.update({
        where: { id: eventId },
        data: updateData,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          generatedContent: true,
        },
      });

      logger.info(`Event updated: ${eventId}`);
      
      // Log audit trail
      await this.logEventAction(eventId, userId, 'event_updated', existingEvent, updateData);

      return updatedEvent;
    } catch (error) {
      logger.error(`Failed to update event ${eventId}:`, error);
      throw new Error('Failed to update event');
    }
  }

  /**
   * Updates event status
   */
  async updateEventStatus(eventId: string, userId: string, status: EventStatus) {
    try {
      const existingEvent = await this.prisma.event.findFirst({
        where: {
          id: eventId,
          createdBy: userId,
        },
      });

      if (!existingEvent) {
        return null;
      }

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      // Set publish date when publishing
      if (status === 'PUBLISHED' && !existingEvent.publishedAt) {
        updateData.publishedAt = new Date();
        updateData.isPublished = true;
      } else if (status !== 'PUBLISHED') {
        updateData.isPublished = false;
      }

      const updatedEvent = await this.prisma.event.update({
        where: { id: eventId },
        data: updateData,
      });

      logger.info(`Event status updated: ${eventId} -> ${status}`);
      
      // Log audit trail
      await this.logEventAction(eventId, userId, 'status_changed', 
        { status: existingEvent.status }, 
        { status }
      );

      return updatedEvent;
    } catch (error) {
      logger.error(`Failed to update event status ${eventId}:`, error);
      throw new Error('Failed to update event status');
    }
  }

  // ===========================================================================
  // Event Deletion
  // ===========================================================================

  /**
   * Soft deletes an event
   */
  async deleteEvent(eventId: string, userId: string): Promise<boolean> {
    try {
      const existingEvent = await this.prisma.event.findFirst({
        where: {
          id: eventId,
          createdBy: userId,
        },
      });

      if (!existingEvent) {
        return false;
      }

      // Soft delete by updating status
      await this.prisma.event.update({
        where: { id: eventId },
        data: {
          status: 'CANCELLED',
          isPublished: false,
          updatedAt: new Date(),
        },
      });

      logger.info(`Event soft deleted: ${eventId}`);
      
      // Log audit trail
      await this.logEventAction(eventId, userId, 'event_deleted', existingEvent, {
        deletedAt: new Date(),
      });

      return true;
    } catch (error) {
      logger.error(`Failed to delete event ${eventId}:`, error);
      throw new Error('Failed to delete event');
    }
  }

  // ===========================================================================
  // Event Statistics
  // ===========================================================================

  /**
   * Gets event statistics for a user
   */
  async getUserEventStats(userId: string) {
    try {
      const stats = await this.prisma.event.groupBy({
        by: ['status'],
        where: { createdBy: userId },
        _count: true,
      });

      const totalEvents = await this.prisma.event.count({
        where: { createdBy: userId },
      });

      const recentEvents = await this.prisma.event.count({
        where: {
          createdBy: userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      });

      return {
        total: totalEvents,
        recent: recentEvents,
        byStatus: stats.reduce((acc, stat) => {
          acc[stat.status.toLowerCase()] = stat._count;
          return acc;
        }, {} as Record<string, number>),
      };
    } catch (error) {
      logger.error(`Failed to fetch event stats for user ${userId}:`, error);
      throw new Error('Failed to fetch event statistics');
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Transforms event data for list display
   */
  private transformEventForList(event: any): EventListItem {
    return {
      id: event.id,
      title: event.title,
      slug: event.slug,
      eventType: event.eventType,
      startDate: event.startDate,
      location: {
        name: event.locationName,
        address: event.locationAddress,
        isOnline: event.isOnline,
        meetingLink: event.meetingLink,
      },
      status: event.status,
      isPublished: event.isPublished,
      createdAt: event.createdAt,
      generatedContent: event.generatedContent,
    };
  }

  /**
   * Logs event actions for audit trail
   */
  private async logEventAction(
    eventId: string,
    userId: string,
    action: string,
    beforeData?: any,
    afterData?: any
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          eventId,
          action,
          entityType: 'event',
          entityId: eventId,
          beforeData,
          afterData,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to log event action:', error);
      // Don't throw - audit logging failures shouldn't break the main flow
    }
  }

  /**
   * Validates event ownership
   */
  async validateEventOwnership(eventId: string, userId: string): Promise<boolean> {
    try {
      const event = await this.prisma.event.findFirst({
        where: {
          id: eventId,
          createdBy: userId,
        },
        select: { id: true },
      });

      return !!event;
    } catch (error) {
      logger.error(`Failed to validate event ownership: ${eventId}`, error);
      return false;
    }
  }

  /**
   * Gets events that need content generation
   */
  async getEventsForContentGeneration(limit: number = 10) {
    try {
      return await this.prisma.event.findMany({
        where: {
          status: 'DRAFT',
          generatedContent: null,
          workflowSessions: {
            none: {
              status: { in: ['IN_PROGRESS', 'PENDING'] },
            },
          },
        },
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          creator: {
            select: { id: true, email: true, name: true },
          },
        },
      });
    } catch (error) {
      logger.error('Failed to fetch events for content generation:', error);
      throw new Error('Failed to fetch events for content generation');
    }
  }
}