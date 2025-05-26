/**
 * Validates NextAuth session token and attaches user info to request
 */
export const authMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Get token from NextAuth JWT
      const token = await getToken({
        req: req as any,
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: process.env.NODE_ENV === 'production',
      });
  
      if (!token || !token.email) {
        logger.warn('Authentication failed: No valid token found');
        res.status(401).json({
          success: false,
          message: 'Authentication required. Please sign in.',
          code: 'UNAUTHORIZED',
        });
        return;
      }
  
      // Fetch fresh user data from database
      const user = await prisma.user.findUnique({
        where: { email: token.email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      });
  
      if (!user) {
        logger.warn(`Authentication failed: User not found for email ${token.email}`);
        res.status(401).json({
          success: false,
          message: 'User not found. Please contact support.',
          code: 'USER_NOT_FOUND',
        });
        return;
      }
  
      if (!user.isActive) {
        logger.warn(`Authentication failed: Inactive user ${user.email}`);
        res.status(403).json({
          success: false,
          message: 'Account is inactive. Please contact an administrator.',
          code: 'ACCOUNT_INACTIVE',
        });
        return;
      }
  
      // Attach user info to request
      req.user = user;
      req.session = token;
  
      logger.debug(`User authenticated: ${user.email} (${user.role})`);
      next();
  
    } catch (error) {
      logger.error('Authentication middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Authentication error. Please try again.',
        code: 'AUTH_ERROR',
      });
    }
  };