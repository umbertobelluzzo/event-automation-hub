// =============================================================================
// utils/logger.ts - Winston Logger Configuration
// =============================================================================

import winston from 'winston';
import path from 'path';

const LOG_DIR = process.env.LOG_FILE_PATH || './storage/logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Create logs directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: process.env.NODE_ENV === 'development' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let log = `${timestamp} [${service || 'APP'}] ${level}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ' ' + JSON.stringify(meta, null, 2);
    }
    
    return log;
  })
);

// Logger configuration
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    
    // File output for all logs
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

export const createLogger = (service: string) => {
  return logger.child({ service });
};

export default logger;
