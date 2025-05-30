import express, { Request, Response, Router } from 'express';
import { z } from 'zod';
import { WorkflowService } from '../services/workflow-service';
import { createLogger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { simpleAuthMiddleware } from '../middleware/auth'; // Assuming a simple API key auth middleware
import type { APIResponse, WorkflowStatus } from '../types'; // Assuming WorkflowStatus is exported from types

const router: Router = express.Router();
const workflowService = new WorkflowService();
const logger = createLogger('workflow-routes');

// Define the possible WorkflowStatus values based on your types/index.ts
const workflowStatusValues: [WorkflowStatus, ...WorkflowStatus[]] = [
  'PENDING', 'IN_PROGRESS', 'WAITING_APPROVAL', 'APPROVED', 'COMPLETED', 'FAILED', 'CANCELLED'
];

// Zod schema for the AI agent callback
const workflowUpdateSchema = z.object({
  session_id: z.string(),
  status: z.enum(workflowStatusValues),
  current_step: z.string(),
  completed_steps: z.array(z.string()).optional().default([]),
  failed_steps: z.array(z.string()).optional().default([]),
  error_message: z.string().optional(), // This can be mapped to the errors array if needed
  generated_content: z.record(z.any()).optional(),
});

/**
 * POST /api/workflow/update
 * Webhook endpoint for AI agents to post progress updates.
 */
router.post(
  '/update',
  simpleAuthMiddleware, // Protect this callback endpoint
  validateRequest(workflowUpdateSchema),
  async (req: Request, res: Response) => {
    const {
      session_id: sessionId,
      status,
      current_step: currentStep,
      completed_steps: completedSteps,
      failed_steps: failedSteps,
      error_message: errorMessage,
      generated_content: generatedContent,
    } = req.body as z.infer<typeof workflowUpdateSchema>; // Get typed body

    try {
      logger.info(
        `Received workflow update for session ${sessionId}: status ${status}, step ${currentStep}`,
        { sessionId, status, currentStep }
      );

      await workflowService.updateWorkflowProgress(
        sessionId,
        status,
        currentStep,
        completedSteps,
        failedSteps,
        errorMessage,
        generatedContent
      );

      const response: APIResponse = {
        success: true,
        message: 'Workflow update received successfully',
      };
      res.status(200).json(response);
    } catch (error) {
      logger.error(
        `Failed to process workflow update for session ${sessionId}:`,
        error
      );
      const apiResponse: APIResponse = {
        success: false,
        message: 'Failed to process workflow update',
        errors: [
          {
            field: 'general',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      };
      res.status(500).json(apiResponse);
    }
  }
);

export default router; 