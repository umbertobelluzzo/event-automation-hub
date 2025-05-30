import express, { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { generateSlug } from '../utils/slug';
import { EventService } from '../services/event-service';
import { WorkflowService } from '../services/workflow-service';
import type { EventFormData, APIResponse, EventCreationResponse } from '../types';
import type { AuthenticatedRequest } from '../middleware/auth';

const router: Router = express.Router();
const prisma = new PrismaClient();
const logger = createLogger('events-routes');
const eventService = new EventService(prisma);
const workflowService = new WorkflowService();

// =============================================================================
// Validation Schemas
// =============================================================================

const eventFormSchema = z.object({
  // Step 1: Event Basics
  eventType: z.enum(['community', 'speaker', 'networking', 'cultural', 'educational', 'social']),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description must be less than 1000 characters'),
  
  // Step 2: Date & Location
  startDate: z.string().datetime().transform(val => new Date(val)),
  endDate: z.string().datetime().transform(val => new Date(val)).optional(),
  timezone: z.string().default('Europe/London'),
  location: z.object({
    name: z.string().min(1, 'Location name is required'),
    address: z.string(),
    isOnline: z.boolean(),
    meetingLink: z.string().url().optional(),
  }).refine(data => {
    if (data.isOnline && !data.meetingLink) {
      return false;
    }
    if (!data.isOnline && !data.address.trim()) {
      return false;
    }
    return true;
  }, {
    message: 'Online events require meeting link, in-person events require address',
  }),
  
  // Step 3: Tickets & Registration
  ticketInfo: z.object({
    isFree: z.boolean(),
    price: z.number().optional(),
    currency: z.string().default('GBP'),
    registrationRequired: z.boolean(),
    maxAttendees: z.number().min(1).optional(),
    registrationDeadline: z.string().datetime().transform(val => new Date(val)).optional(),
  }).refine(data => {
    if (!data.isFree && (!data.price || data.price <= 0)) {
      return false;
    }
    return true;
  }, {
    message: 'Paid events must have a price greater than 0',
  }),
  
  // Step 4: Content Preferences
  contentPreferences: z.object({
    flyerStyle: z.enum(['professional', 'casual', 'festive', 'artistic']),
    targetAudience: z.array(z.string()).min(1, 'At least one target audience is required'),
    keyMessages: z.array(z.string()).min(1, 'At least one key message is required'),
    socialTone: z.enum(['formal', 'friendly', 'enthusiastic']),
    includeLogo: z.boolean().default(true),
  }),
  
  // Step 5: Additional Fields
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(true),
});

// =============================================================================
// Event Creation Route
// =============================================================================

/**
 * POST /api/events/create
 * Creates a new event from form wizard data and triggers AI workflow
 */
router.post('/create', validateRequest(eventFormSchema), async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  try {
    logger.info(`Creating event for user ${userId}`, {
      title: req.body.title,
      eventType: req.body.eventType,
    });

    // Generate event slug
    const slug = generateSlug(req.body.title, req.body.startDate);

    // Create event in database
    const event = await eventService.createEvent({
      ...req.body,
      slug,
      createdBy: userId,
    });

    logger.info(`Event created successfully: ${event.id}`);

    // Start AI workflow asynchronously
    const workflowSession = await workflowService.startWorkflow({
      eventId: event.id,
      userId,
      contentPreferences: req.body.contentPreferences,
    });

    logger.info(`AI workflow started: ${workflowSession.sessionId}`);

    const response: EventCreationResponse = {
      success: true,
      event: {
        id: event.id,
        slug: event.slug,
        title: event.title,
        status: event.status,
      },
      workflowSession: {
        id: workflowSession.id,
        sessionId: workflowSession.sessionId,
        status: workflowSession.status,
      },
    };

    res.status(201).json(response);
    return;

  } catch (error) {
    logger.error('Event creation failed:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create event. Please try again.',
    });
    return;
  }
});

// =============================================================================
// Event Listing Routes
// =============================================================================

/**
 * GET /api/events
 * Returns paginated list of user's events
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;

  try {
    const events = await eventService.getUserEvents(userId!, {
      page,
      limit,
      status: status as any,
    });

    res.json({
      success: true,
      data: events.items,
      pagination: events.pagination,
    });
    return;

  } catch (error) {
    logger.error('Failed to fetch events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
    });
    return;
  }
});

/**
 * GET /api/events/:id
 * Returns single event details
 */
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const event = await eventService.getEventById(id, userId!);

    if (!event) {
      res.status(404).json({
        success: false,
        message: 'Event not found',
      });
      return;
    }

    res.json({
      success: true,
      data: event,
    });
    return;

  } catch (error) {
    logger.error(`Failed to fetch event ${id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
    });
    return;
  }
});

// =============================================================================
// Event Update Routes
// =============================================================================

/**
 * PUT /api/events/:id
 * Updates an existing event
 */
router.put('/:id', validateRequest(eventFormSchema.partial()), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const event = await eventService.updateEvent(id, userId!, req.body);

    if (!event) {
      res.status(404).json({
        success: false,
        message: 'Event not found or you do not have permission to update it',
      });
      return;
    }

    logger.info(`Event updated: ${event.id}`);

    res.json({
      success: true,
      data: event,
      message: 'Event updated successfully',
    });
    return;

  } catch (error) {
    logger.error(`Failed to update event ${id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event',
    });
    return;
  }
});

// =============================================================================
// Event Status Management
// =============================================================================

/**
 * PATCH /api/events/:id/status
 * Updates event status (publish, unpublish, cancel)
 */
router.patch('/:id/status', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user?.id;

  const validStatuses = ['draft', 'in_review', 'approved', 'published', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status',
    });
  }

  try {
    const event = await eventService.updateEventStatus(id, userId!, status);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or you do not have permission to update it',
      });
    }

    logger.info(`Event status updated: ${event.id} -> ${status}`);

    res.json({
      success: true,
      data: event,
      message: `Event ${status} successfully`,
    });
    return;

  } catch (error) {
    logger.error(`Failed to update event status ${id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event status',
    });
    return;
  }
});

// =============================================================================
// Workflow Status Routes
// =============================================================================

/**
 * GET /api/events/:id/workflow
 * Returns AI workflow status for an event
 */
router.get('/:id/workflow', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    // Verify user has access to this event
    const event = await eventService.getEventById(id, userId!);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const workflow = await workflowService.getWorkflowStatus(id);

    res.json({
      success: true,
      data: workflow,
    });
    return;

  } catch (error) {
    logger.error(`Failed to fetch workflow status for event ${id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow status',
    });
    return;
  }
});

/**
 * POST /api/events/:id/regenerate
 * Triggers AI content regeneration for an event
 */
router.post('/:id/regenerate', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { contentType } = req.body; // 'flyer', 'social', 'whatsapp', or 'all'

  try {
    // Verify user has access to this event
    const event = await eventService.getEventById(id, userId!);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const workflowSession = await workflowService.regenerateContent(id, userId!, contentType);

    logger.info(`Content regeneration started for event ${id}: ${contentType}`);

    res.json({
      success: true,
      data: workflowSession,
      message: 'Content regeneration started',
    });
    return;

  } catch (error) {
    logger.error(`Failed to regenerate content for event ${id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to start content regeneration',
    });
    return;
  }
});

// =============================================================================
// Event Deletion
// =============================================================================

/**
 * DELETE /api/events/:id
 * Deletes an event (soft delete)
 */
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const deleted = await eventService.deleteEvent(id, userId!);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or you do not have permission to delete it',
      });
    }

    logger.info(`Event deleted: ${id}`);

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
    return;

  } catch (error) {
    logger.error(`Failed to delete event ${id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
    });
    return;
  }
});

export default router;