// =============================================================================
// components/auth/simple-auth-guard.tsx - Simple Authentication Guard
// =============================================================================

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface SimpleAuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const SimpleAuthGuard: React.FC<SimpleAuthGuardProps> = ({
  children,
  redirectTo = '/auth/signin',
}) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (status === 'unauthenticated') {
      // Store the current URL to redirect back after login
      const currentUrl = window.location.pathname + window.location.search;
      const encodedUrl = encodeURIComponent(currentUrl);
      router.push(`${redirectTo}?callbackUrl=${encodedUrl}`);
    }
  }, [status, redirectTo, router]);

  // Show loading state
  if (status === 'loading') {
    return (
      <div style={{
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  // Don't render children if not authenticated
  if (status === 'unauthenticated') {
    return null;
  }

  // Check if user account is active
  if (session?.user && !session.user.isActive) {
    return (
      <div style={{
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2 style={{ color: '#e53e3e', marginBottom: '16px' }}>Account Inactive</h2>
        <p style={{ color: '#666' }}>
          Your account has been deactivated. Please contact an administrator for assistance.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};