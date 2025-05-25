import { Metadata } from 'next';
import { SignOutForm } from '@/components/auth/signout-form';

export const metadata: Metadata = {
  title: 'Sign Out | UIS Event Hub',
  description: 'Sign out of your UIS Event Hub account',
};

export default function SignOutPage() {
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
            Sign out
          </h2>
          <p className="text-sm text-gray-600">
            Are you sure you want to sign out of your account?
          </p>
        </div>

        {/* Sign Out Form */}
        <SignOutForm />
      </div>
    </div>
  );
}