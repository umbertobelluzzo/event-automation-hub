import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { SignInForm } from '@/components/auth/signin-form';

export const metadata: Metadata = {
  title: 'Sign In | UIS Event Hub',
  description: 'Sign in to your UIS Event Hub account',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  const session = await getServerSession(authOptions);

  // Redirect if already signed in
  if (session) {
    redirect(searchParams.callbackUrl || '/dashboard');
  }

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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Welcome back
          </h2>
          <p className="text-sm text-gray-600">
            Sign in to your account to manage UIS events
          </p>
        </div>

        {/* Error Message */}
        {searchParams.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-700">
              {getErrorMessage(searchParams.error)}
            </div>
          </div>
        )}

        {/* Sign In Form */}
        <SignInForm callbackUrl={searchParams.callbackUrl} />

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

function getErrorMessage(error: string): string {
  switch (error) {
    case 'CredentialsSignin':
      return 'Invalid email or password. Please try again.';
    case 'EmailCreateAccount':
      return 'Could not create account with this email.';
    case 'OAuthCreateAccount':
      return 'Could not create account with this provider.';
    case 'EmailSignin':
      return 'Check your email for a sign-in link.';
    case 'OAuthSignin':
      return 'Error occurred during sign-in. Please try again.';
    case 'OAuthCallback':
      return 'Error in OAuth callback. Please try again.';
    case 'OAuthAccountNotLinked':
      return 'Email already in use with different provider.';
    case 'SessionRequired':
      return 'Please sign in to access this page.';
    case 'AccessDenied':
      return 'Access denied. Contact an administrator if you need access.';
    default:
      return 'An error occurred during sign-in. Please try again.';
  }
}