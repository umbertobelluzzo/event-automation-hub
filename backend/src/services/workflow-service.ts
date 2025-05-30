import { PrismaClient, WorkflowStatus } from '@prisma/client';
import { createLogger } from '../utils/logger';
import { RedisService } from './redis-service';
import axios from 'axios';
import type { WorkflowProgress, ContentPreferences } from '../types';
import { Prisma } from '@prisma/client';

const logger = createLogger('workflow-service');

// =============================================================================
// Workflow Service Class
// =============================================================================

export class WorkflowService {
  private prisma: PrismaClient;
  private redis: RedisService;
  private agentsUrl: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.redis = new RedisService();
    this.agentsUrl = process.env.AGENTS_URL || 'http://localhost:8000';
  }

  // ===========================================================================
  // Workflow Creation & Management
  // ===========================================================================

  /**
   * Starts a new AI workflow for event content generation
   */
  async startWorkflow(params: {
    eventId: string;
    userId: string;
    contentPreferences: ContentPreferences;
  }) {
    const { eventId, userId, contentPreferences } = params;
    
    try {
      // Generate unique session ID
      const sessionId = this.generateSessionId();

      // Create workflow session in database
      const workflowSession = await this.prisma.workflowSession.create({
        data: {
          sessionId,
          eventId,
          userId,
          status: 'PENDING',
          currentStep: 'validate_input',
          completedSteps: [],
          failedSteps: [],
          startedAt: new Date(),
          llmModel: process.env.OPENROUTER_MODEL || 'openai/gpt-4o',
          agentConfig: {
            temperature: 0.7,
            maxTokens: 2000,
            contentPreferences,
          } as any,
        },
      });

      logger.info(`Workflow session created: ${sessionId} for event ${eventId}`);

      // Store initial progress in Redis for real-time updates
      await this.redis.setWorkflowProgress(sessionId, {
        sessionId,
        status: 'PENDING',
        currentStep: 'validate_input',
        completedSteps: [],
        failedSteps: [],
        estimatedTimeRemaining: 180, // 3 minutes estimate
      });

      // Trigger AI agents asynchronously (don't await)
      this.triggerAIWorkflow(sessionId, eventId, contentPreferences)
        .catch(error => {
          logger.error(`Failed to trigger AI workflow for session ${sessionId}:`, error);
          this.handleWorkflowError(sessionId, 'Failed to start AI workflow', error instanceof Error ? error.message : String(error), 'startWorkflow');
        });

      return workflowSession;
    } catch (error) {
      logger.error('Failed to start workflow:', error);
      throw error instanceof Error ? error : new Error('Failed to start AI workflow');
    }
  }

  /**
   * Gets current workflow status for an event
   */
  async getWorkflowStatus(eventId: string): Promise<WorkflowProgress | null> {
    try {
      // Get latest workflow session for event
      const workflowSession = await this.prisma.workflowSession.findFirst({
        where: { eventId },
        orderBy: { startedAt: 'desc' },
        include: {
          event: {
            include: {
              generatedContent: true,
            },
          },
        },
      });

      if (!workflowSession) {
        return null;
      }

      // Try to get real-time progress from Redis first
      const redisProgress = await this.redis.getWorkflowProgress(workflowSession.sessionId);
      
      if (redisProgress) {
        return {
          ...redisProgress,
          generatedContent: workflowSession.event?.generatedContent || [],
        };
      }

      // Fallback to database data
      return {
        sessionId: workflowSession.sessionId,
        status: workflowSession.status,
        currentStep: workflowSession.currentStep || '',
        completedSteps: workflowSession.completedSteps,
        failedSteps: workflowSession.failedSteps,
        errorMessage: workflowSession.errorMessage || undefined,
        generatedContent: workflowSession.event?.generatedContent || [],
      };
    } catch (error) {
      logger.error(`Failed to get workflow status for event ${eventId}:`, error);
      throw error instanceof Error ? error : new Error('Failed to get workflow status');
    }
  }

  /**
   * Cleanup old workflow sessions
   */
  async cleanupOldSessions(daysOld: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deletedCount = await this.prisma.workflowSession.deleteMany({
        where: {
          startedAt: { lt: cutoffDate },
          status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
        },
      });

      logger.info(`Cleaned up ${deletedCount.count} old workflow sessions`);
      return deletedCount.count;
    } catch (error) {
      logger.error('Failed to cleanup old workflow sessions:', error);
      throw new Error('Failed to cleanup old sessions');
    }
  }

  /**
   * Triggers content regeneration for an event
   */
  async regenerateContent(
    eventId: string,
    userId: string,
    contentType: 'flyer' | 'social' | 'whatsapp' | 'all' = 'all'
  ) {
    try {
      // Get existing content preferences from the event
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: { 
          customFields: true,
          generatedContent: true,
        },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      const contentPreferences = (event.customFields as any)?.contentPreferences;
      if (!contentPreferences) {
        throw new Error('No content preferences found for event');
      }

      // Create new workflow session for regeneration
      const sessionId = this.generateSessionId();
      
      const workflowSession = await this.prisma.workflowSession.create({
        data: {
          sessionId,
          eventId,
          userId,
          status: 'PENDING',
          currentStep: `regenerate_${contentType}`,
          completedSteps: [],
          failedSteps: [],
          startedAt: new Date(),
          llmModel: process.env.OPENROUTER_MODEL || 'openai/gpt-4o',
          agentConfig: {
            regenerationType: contentType,
            contentPreferences,
          },
        },
      });

      logger.info(`Content regeneration started: ${sessionId} for event ${eventId} (${contentType})`);

      // Update Redis with regeneration progress
      await this.redis.setWorkflowProgress(sessionId, {
        sessionId,
        status: 'IN_PROGRESS',
        currentStep: `regenerate_${contentType}`,
        completedSteps: [],
        failedSteps: [],
        estimatedTimeRemaining: 120, // 2 minutes for regeneration
      });

      // Trigger regeneration workflow
      this.triggerRegenerationWorkflow(sessionId, eventId, contentType, contentPreferences)
        .catch(error => {
          logger.error(`Failed to trigger regeneration workflow for session ${sessionId}:`, error);
          this.handleWorkflowError(sessionId, 'Failed to regenerate content', error instanceof Error ? error.message : String(error), `regenerate_${contentType}`);
        });

      return workflowSession;
    } catch (error) {
      logger.error(`Failed to start content regeneration for event ${eventId}:`, error);
      throw new Error('Failed to start content regeneration');
    }
  }

  // ===========================================================================
  // AI Agent Communication
  // ===========================================================================

  /**
   * Triggers the AI workflow with the agents system
   */
  private async triggerAIWorkflow(
    sessionId: string,
    eventId: string,
    contentPreferences: ContentPreferences
  ) {
    try {
      // Get event details
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          creator: {
            select: { email: true, name: true },
          },
        },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Prepare payload for AI agents
      const payload = {
        session_id: sessionId,
        event_id: eventId,
        event_data: {
          title: event.title,
          description: event.description,
          event_type: event.eventType,
          start_date: event.startDate.toISOString(),
          end_date: event.endDate?.toISOString(),
          location: {
            name: event.locationName,
            address: event.locationAddress,
            is_online: event.isOnline,
            meeting_link: event.meetingLink,
          },
          ticket_info: {
            is_free: event.isFree,
            price: event.ticketPrice,
            registration_required: event.registrationRequired,
            max_attendees: event.maxAttendees,
          },
        },
        content_preferences: {
          flyer_style: contentPreferences.flyerStyle,
          target_audience: contentPreferences.targetAudience,
          key_messages: contentPreferences.keyMessages,
          social_tone: contentPreferences.socialTone,
          include_logo: contentPreferences.includeLogo,
        },
        user_info: {
          email: event.creator.email,
          name: event.creator.name,
        },
      };

      logger.info(`Triggering AI workflow: ${sessionId}`);

      // Call AI agents system
      const response = await axios.post(
        `${this.agentsUrl}/workflow/start`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.AGENTS_API_KEY || ''}`,
          },
          timeout: 10000, // 10 second timeout for initial trigger
        }
      );

      if (response.status === 200 || response.status === 202) {
        logger.info(`AI workflow triggered successfully: ${sessionId}`);
        
        // Update workflow status to IN_PROGRESS
        await this.updateWorkflowStatus(sessionId, 'IN_PROGRESS', 'create_flyer');
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      logger.error(`Failed to trigger AI workflow for session ${sessionId}:`, error);
      await this.handleWorkflowError(sessionId, 'Failed to communicate with AI agents', error instanceof Error ? error.message : String(error), 'create_flyer');
    }
  }

  /**
   * Triggers content regeneration workflow
   */
  private async triggerRegenerationWorkflow(
    sessionId: string,
    eventId: string,
    contentType: string,
    contentPreferences: ContentPreferences
  ) {
    try {
      const payload = {
        session_id: sessionId,
        event_id: eventId,
        regeneration_type: contentType,
        content_preferences: contentPreferences,
      };

      logger.info(`Triggering regeneration workflow: ${sessionId} (${contentType})`);

      const response = await axios.post(
        `${this.agentsUrl}/workflow/regenerate`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.AGENTS_API_KEY || ''}`,
          },
          timeout: 10000,
        }
      );

      if (response.status === 200 || response.status === 202) {
        logger.info(`Regeneration workflow triggered successfully: ${sessionId}`);
        await this.updateWorkflowStatus(sessionId, 'IN_PROGRESS', `regenerate_${contentType}`);
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      logger.error(`Failed to trigger regeneration workflow for session ${sessionId}:`, error);
      await this.handleWorkflowError(sessionId, 'Failed to start content regeneration', error instanceof Error ? error.message : String(error), `regenerate_${contentType}`);
    }
  }

  // ===========================================================================
  // Workflow Progress Updates (Called by AI Agents)
  // ===========================================================================

  /**
   * Updates workflow progress (called by AI agents via webhook)
   */
  async updateWorkflowProgress(
    sessionId: string,
    status: WorkflowStatus,
    currentStep: string,
    completedSteps: string[] = [],
    failedSteps: string[] = [],
    errorMessage?: string,
    generatedContent?: any
  ) {
    try {
      const updateData: any = {
        status,
        currentStep,
        completedSteps,
        failedSteps,
        errorMessage: errorMessage === null ? undefined : errorMessage,
      };

      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }

      const workflowSession = await this.prisma.workflowSession.update({
        where: { sessionId },
        data: updateData,
        select: { eventId: true }
      });

      const progress: WorkflowProgress = {
        sessionId,
        status,
        currentStep,
        completedSteps,
        failedSteps,
        errorMessage: errorMessage === null ? undefined : errorMessage,
        generatedContent,
      };
      await this.redis.setWorkflowProgress(sessionId, progress);

      if (status === 'COMPLETED' && generatedContent && workflowSession.eventId) {
        await this.saveGeneratedContent(workflowSession.eventId, generatedContent);
      }

      logger.info(`Workflow progress updated: ${sessionId} -> ${status} (${currentStep})`);
    } catch (error) {
      logger.error(`Failed to update workflow progress for session ${sessionId}:`, error);
      throw new Error('Failed to update workflow progress');
    }
  }

  /**
   * Saves generated content to database
   */
  private async saveGeneratedContent(
    eventId: string,
    generatedContent: Record<string, any> // Content from agent (snake_case)
  ): Promise<void> {
    if (!eventId || !generatedContent || Object.keys(generatedContent).length === 0) {
      logger.warn(
        `Skipping saveGeneratedContent for event ${eventId}: No content provided`
      );
      return;
    }

    logger.info(`Saving generated content for event ${eventId}`, {
      keys: Object.keys(generatedContent),
    });

    const dataToCreate: Prisma.GeneratedContentCreateInput = {
      event: { connect: { id: eventId } },
      flyerUrl: generatedContent.flyer_url as string | undefined,
      flyerRenderId: generatedContent.flyer_render_id as string | undefined,
      flyerTemplateId: generatedContent.flyer_template_id as string | undefined,
      flyerFormat: generatedContent.flyer_format as string | undefined,
      flyerDesignNotes: generatedContent.design_notes ? JSON.parse(JSON.stringify(generatedContent.design_notes)) : Prisma.JsonNull,
      
      // Social Media Captions
      instagramCaption: generatedContent.instagram_caption as string | undefined,
      linkedinCaption: generatedContent.linkedin_caption as string | undefined,
      twitterCaption: generatedContent.twitter_caption as string | undefined,
      // social_media_error can be stored in processingErrorDetails or a dedicated field if added to schema

      // WhatsApp Message
      whatsAppMessage: generatedContent.whatsapp_message as string | undefined,

      // TODO: Map other content types as they are implemented
    };

    const dataToUpdate: Prisma.GeneratedContentUpdateInput = {
      flyerUrl: generatedContent.flyer_url as string | undefined,
      flyerRenderId: generatedContent.flyer_render_id as string | undefined,
      flyerTemplateId: generatedContent.flyer_template_id as string | undefined,
      flyerFormat: generatedContent.flyer_format as string | undefined,
      flyerDesignNotes: generatedContent.design_notes ? JSON.parse(JSON.stringify(generatedContent.design_notes)) : Prisma.JsonNull,
      
      // Social Media Captions
      instagramCaption: generatedContent.instagram_caption as string | undefined,
      linkedinCaption: generatedContent.linkedin_caption as string | undefined,
      twitterCaption: generatedContent.twitter_caption as string | undefined,
      // social_media_error can be stored in processingErrorDetails or a dedicated field if added to schema

      // WhatsApp Message
      whatsAppMessage: generatedContent.whatsapp_message as string | undefined,

      // TODO: Map other content types
      generationCount: { increment: 1 },
      lastRegenerated: new Date(),
    };

    // Remove undefined fields from create and update objects to avoid Prisma errors
    Object.keys(dataToCreate).forEach(key => (dataToCreate as any)[key] === undefined && delete (dataToCreate as any)[key]);
    Object.keys(dataToUpdate).forEach(key => (dataToUpdate as any)[key] === undefined && delete (dataToUpdate as any)[key]);

    try {
      await this.prisma.generatedContent.upsert({
        where: { eventId },
        create: dataToCreate as any, // Cast to any to handle potential new fields not yet in Prisma type
        update: dataToUpdate as any, // Cast to any
      });
      logger.info(`Generated content saved successfully for event ${eventId}`);
    } catch (error) {
      logger.error(
        `Failed to save generated content for event ${eventId}:`,
        error
      );
      // Re-throw to be caught by the calling function (updateWorkflowProgress)
      // which will then result in a 500 error for the agent callback
      throw error;
    }
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Updates workflow status
   */
  private async updateWorkflowStatus(
    sessionId: string,
    status: WorkflowStatus,
    currentStep?: string
  ) {
    try {
      await this.prisma.workflowSession.update({
        where: { sessionId },
        data: {
          status,
          currentStep,
        },
      });

      const existingProgress = await this.redis.getWorkflowProgress(sessionId);
      if (existingProgress) {
        let nextCurrentStepForRedis: string;
        if (currentStep !== undefined) {
          nextCurrentStepForRedis = currentStep;
        } else {
          nextCurrentStepForRedis = existingProgress.currentStep;
        }

        await this.redis.setWorkflowProgress(sessionId, {
          ...existingProgress,
          status,
          currentStep: nextCurrentStepForRedis,
        });
      }
    } catch (error) {
      logger.error(`Failed to update workflow status for session ${sessionId}:`, error);
    }
  }

  /**
   * Handles workflow errors
   */
  private async handleWorkflowError(sessionId: string, message: string, errorDetails: string, step?: string) {
    logger.error(`Workflow Error for session ${sessionId} at step ${step || 'unknown'}: ${message}`, errorDetails);
    try {
      await this.prisma.workflowSession.update({
        where: { sessionId },
        data: {
          status: 'FAILED',
          errorMessage: `${message} - ${errorDetails}`,
          currentStep: step ?? 'unknown',
          failedSteps: { push: step ?? 'unknown' },
          completedAt: new Date(),
        },
      });
      await this.redis.setWorkflowProgress(sessionId, {
        sessionId,
        status: 'FAILED',
        errorMessage: `${message} - ${errorDetails}`,
        currentStep: step ?? 'unknown',
        completedSteps: [],
        failedSteps: [step ?? 'unknown'],
      });
    } catch (dbError) {
      logger.error(`Failed to update workflow status to FAILED for session ${sessionId}:`, dbError);
    }
  }

  /**
   * Generates unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Gets workflow metrics for monitoring
   */
  async getWorkflowMetrics() {
    try {
      const [
        totalSessions,
        completedSessions,
        failedSessions,
        inProgressSessions,
      ] = await Promise.all([
        this.prisma.workflowSession.count(),
        this.prisma.workflowSession.count({ where: { status: 'COMPLETED' } }),
        this.prisma.workflowSession.count({ where: { status: 'FAILED' } }),
        this.prisma.workflowSession.count({ where: { status: 'IN_PROGRESS' } }),
        Promise.resolve({ _avg: { retryCount: 0 } })
      ]);

      const avgProcessingTimeResult = 0;

      return {
        totalSessions,
        completedSessions,
        failedSessions,
        inProgressSessions,
        avgProcessingTime: avgProcessingTimeResult,
      };
    } catch (error) {
      logger.error('Failed to get workflow metrics:', error);
      throw new Error('Failed to get workflow metrics');
    }
  }
}