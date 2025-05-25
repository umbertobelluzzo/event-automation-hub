import { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const metadata: Metadata = {
  title: 'Authentication Error | UIS Event Hub',
  description: 'An error occurred during authentication',
};

interface AuthErrorPageProps {
  searchParams: {
    error?: string;
  };
}

export default function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const error = searchParams.error;

  const getErrorInfo = (errorCode?: string) => {
    switch (errorCode) {
      case 'Configuration':
        return {
          title: 'Server Configuration Error',
          description: 'There is a problem with the server configuration. Please contact support.',
          showContactAdmin: true,
        };
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          description: 'You do not have permission to sign in. Contact an administrator if you believe this is an error.',
          showContactAdmin: true,
        };
      case 'Verification':
        return {
          title: 'Unable to Verify',
          description: 'The verification token has expired or has already been used. Please request a new sign-in link.',
          showRetry: true,
        };
      case 'OAuthSignin':
      case 'OAuthCallback':
      case 'OAuthCreateAccount':
      case 'EmailCreateAccount':
      case 'Callback':
        return {
          title: 'Sign-in Error',
          description: 'An error occurred while signing in. This could be due to a network issue or temporary service problem.',
          showRetry: true,
        };
      case 'OAuthAccountNotLinked':
        return {
          title: 'Account Already Exists',
          description: 'An account with this email already exists but is associated with a different sign-in method. Try signing in with your original method.',
          showRetry: true,
        };
      case 'EmailSignin':
        return {
          title: 'Email Sign-in Error',
          description: 'Unable to send the sign-in email. Please check your email address and try again.',
          showRetry: true,
        };
      case 'CredentialsSignin':
        return {
          title: 'Invalid Credentials',
          description: 'The email or password you entered is incorrect. Please check your credentials and try again.',
          showRetry: true,
        };
      case 'SessionRequired':
        return {
          title: 'Sign-in Required',
          description: 'You must be signed in to access this page.',
          showRetry: true,
        };
      default:
        return {
          title: 'Authentication Error',
          description: 'An unexpected error occurred during sign-in. Please try again.',
          showRetry: true,
        };
    }
  };

  const errorInfo = getErrorInfo(error);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-italian-green rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">UIS</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Event Hub</h1>
          </div>
        </div>

        {/* Error Alert */}
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{errorInfo.title}</AlertTitle>
          <AlertDescription className="mt-2">
            {errorInfo.description}
          </AlertDescription>
        </Alert>

        {/* Error Details */}
        {error && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Error Details</h3>
            <p className="text-xs text-gray-600 font-mono">
              Error Code: {error}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {errorInfo.showRetry && (
            <Button asChild className="w-full" variant="italian">
              <Link href="/auth/signin">
                Try Signing In Again
              </Link>
            </Button>
          )}

          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>

          {errorInfo.showContactAdmin && (
            <Button asChild variant="outline" className="w-full">
              <Link href="mailto:admin@uniteditalian.org">
                <Mail className="mr-2 h-4 w-4" />
                Contact Administrator
              </Link>
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Need Help?</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Make sure you're using the correct email address</li>
            <li>• Check if you have an existing account with a different sign-in method</li>
            <li>• Try clearing your browser cache and cookies</li>
            <li>• Contact support if the problem persists</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            If you continue to experience issues, please contact{' '}
            <Link href="mailto:support@uniteditalian.org" className="text-italian-green hover:underline">
              support@uniteditalian.org
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}