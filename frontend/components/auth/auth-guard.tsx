'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { UserRole } from '@/shared/types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, LogIn } from 'lucide-react';

// =============================================================================
// Auth Guard Types
// =============================================================================

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: UserRole[];
  redirectTo?: string;
  fallback?: React.ReactNode;
}

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

// =============================================================================
// Auth Guard Component
// =============================================================================

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  allowedRoles,
  redirectTo = '/auth/signin',
  fallback,
}) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (requireAuth && status === 'unauthenticated') {
      // Store the current URL to redirect back after login
      const currentUrl = window.location.pathname + window.location.search;
      const encodedUrl = encodeURIComponent(currentUrl);
      router.push(`${redirectTo}?callbackUrl=${encodedUrl}`);
    }
  }, [status, requireAuth, redirectTo, router]);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  // Not authenticated and auth required
  if (requireAuth && status === 'unauthenticated') {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert>
            <LogIn className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription className="mt-2 mb-4">
              You need to sign in to access this page.
            </AlertDescription>
            <Button 
              onClick={() => router.push(redirectTo)}
              className="w-full"
              variant="italian"
            >
              Sign In
            </Button>
          </Alert>
        </div>
      </div>
    );
  }

  // Authenticated but inactive user
  if (session?.user && !session.user.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Account Inactive</AlertTitle>
            <AlertDescription className="mt-2">
              Your account has been deactivated. Please contact an administrator 
              at admin@uniteditalian.org for assistance.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Role-based access control
  if (allowedRoles && session?.user) {
    return (
      <RoleGuard allowedRoles={allowedRoles} fallback={fallback}>
        {children}
      </RoleGuard>
    );
  }

  // All checks passed
  return <>{children}</>;
};

// =============================================================================
// Role Guard Component
// =============================================================================

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback,
}) => {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session?.user) {
    return null;
  }

  const userRole = session.user.role;
  const hasPermission = allowedRoles.includes(userRole);

  if (!hasPermission) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription className="mt-2 mb-4">
              You don't have permission to access this page. 
              Required role(s): {allowedRoles.join(', ')}.
              Your role: {userRole}.
            </AlertDescription>
            <Button 
              onClick={() => router.back()}
              variant="outline"
              className="w-full"
            >
              Go Back
            </Button>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// =============================================================================
// Higher-Order Component Version
// =============================================================================

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    requireAuth?: boolean;
    allowedRoles?: UserRole[];
    redirectTo?: string;
  } = {}
) {
  const AuthenticatedComponent = (props: P) => {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  
  return AuthenticatedComponent;
}

// =============================================================================
// Utility Hooks
// =============================================================================

export const useAuthGuard = (requiredRoles?: UserRole[]) => {
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const user = session?.user;

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const hasPermission = requiredRoles ? hasAnyRole(requiredRoles) : true;

  return {
    isLoading,
    isAuthenticated,
    user,
    hasRole,
    hasAnyRole,
    hasPermission,
    isActive: user?.isActive ?? false,
  };
};