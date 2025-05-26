export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    // Skip logging for health checks and static assets
    if (req.path === '/api/health' || req.path.includes('/static/')) {
      return next();
    }
  
    const logger = createLogger('http');
  
    // Log request
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: req.get('Content-Length'),
    });
  
    // Log response on finish
    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      
      logger.log(level, `${req.method} ${req.path} ${res.statusCode}`, {
        duration: `${duration}ms`,
        contentLength: res.get('Content-Length'),
      });
    });
  
    next();
  };