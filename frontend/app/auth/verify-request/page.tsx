import { Metadata } from 'next';
import Link from 'next/link';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Check Your Email | UIS Event Hub',
  description: 'Please check your email for a sign-in link',
};

interface VerifyRequestPageProps {
  searchParams: {
    provider?: string;
    type?: string;
  };
}

export default function VerifyRequestPage({ searchParams }: VerifyRequestPageProps) {
  const provider = searchParams.provider;
  const type = searchParams.type;

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

        {/* Success Message */}
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Check your email
            </h2>
            
            <p className="text-gray-600 mb-6">
              We've sent you a secure sign-in link. Click the link in your email to access your UIS Event Hub account.
            </p>

            {/* Email Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <h3 className="text-sm font-medium text-blue-800 mb-2">What to do next:</h3>
              <ul className="text-sm text-blue-700 text-left space-y-1">
                <li>1. Check your email inbox (and spam folder)</li>
                <li>2. Look for an email from UIS Event Hub</li>
                <li>3. Click the "Sign in to UIS Event Hub" button</li>
                <li>4. You'll be automatically signed in</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/signin">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Send Another Link
                </Link>
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">Security Note</h3>
          <p className="text-sm text-yellow-700">
            The sign-in link will expire in 24 hours for security reasons. 
            If you don't see the email within a few minutes, please check your spam folder.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Having trouble? Contact{' '}
            <Link href="mailto:support@uniteditalian.org" className="text-italian-green hover:underline">
              support@uniteditalian.org
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}