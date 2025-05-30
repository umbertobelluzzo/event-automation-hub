// backend/src/index.ts - Fixed version
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createLogger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { authMiddleware, simpleAuthMiddleware, type AuthenticatedRequest } from './middleware/auth';
import { validateEnv } from './utils/validate-env';
import path from 'path';

// Route imports
import eventRoutes from './routes/events';
// import authRoutes from './routes/auth'; // Removed, no default export
import healthRoutes from './routes/health';
import workflowRoutes from './routes/workflowRoutes';

// =============================================================================
// Environment & Configuration
// =============================================================================

// const rootEnvPath = path.resolve(__dirname, '..', '..', '..', '.env'); // Original thought, one too many '..'
const rootEnvPath = path.resolve(__dirname, '..', '..', '.env'); 
// console.log(`Attempting to load .env from: ${rootEnvPath}`); // Optional: for debugging
const dotenvResult = dotenv.config({ path: rootEnvPath });
console.log('DEBUG: DATABASE_URL at startup:', process.env.DATABASE_URL);

// if (dotenvResult.error) { // Optional: for debugging
//   console.error('Error loading .env file for backend:', dotenvResult.error);
// } else if (dotenvResult.parsed) {
//   console.log('Backend .env file loaded successfully. DATABASE_URL:', dotenvResult.parsed.DATABASE_URL ? 'Found' : 'NOT FOUND');
// } else {
//   console.log('Backend .env file not found or empty at expected path.');
// }

// Skip validation in development to allow starting without all services
if (process.env.NODE_ENV === 'production') {
  validateEnv();
}

const app: Application = express();
const logger = createLogger('server');
const PORT = process.env.BACKEND_PORT || 4000;

// =============================================================================
// Security & Rate Limiting
// =============================================================================

// Basic security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000', // Allow Next.js dev server
  ],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// =============================================================================
// Middleware Setup
// =============================================================================

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Trust proxy for Heroku deployment
app.set('trust proxy', 1);

// =============================================================================
// API Routes
// =============================================================================

// Health check routes (no auth required)
app.use('/api/health', healthRoutes);

// Authentication routes (public)
// app.use('/api/auth', authRoutes); // Removed, no default export

// Protected routes
app.use('/api/events', authMiddleware, eventRoutes);

// Workflow callback routes (requires simple API key auth)
app.use('/api/workflow', workflowRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'UIS Event-Automation Hub API',
    version: '1.0.0',
    description: 'Backend API for event management and AI automation',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      events: '/api/events',
    },
    documentation: 'https://github.com/UIS-org/event-automation-hub',
    status: 'operational',
  });
});

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path,
  });
});

// Global error handler
app.use(errorHandler);

// =============================================================================
// Server Startup
// =============================================================================

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 UIS Backend API Server running on port ${PORT}`);
  logger.info(`📖 API Documentation: http://localhost:${PORT}/api`);
  logger.info(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;