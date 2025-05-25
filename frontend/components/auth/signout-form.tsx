'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const SignOutForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut({
        callbackUrl: '/',
        redirect: true
      });
    } catch (error) {
      console.error('Sign out error:', error);
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-8">
      {/* User Info */}
      {session?.user && (
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg mb-6">
          <Avatar className="h-12 w-12">
            <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
            <AvatarFallback>
              {session.user.name
                ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase()
                : session.user.email?.[0].toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {session.user.name || 'User'}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {session.user.email}
            </p>
            <p className="text-xs text-gray-400 capitalize">
              {session.user.role?.toLowerCase() || 'member'}
            </p>
          </div>
        </div>
      )}

      {/* Sign Out Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleSignOut}
          disabled={isLoading}
          className="w-full"
          variant="destructive"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing out...
            </>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              Yes, sign me out
            </>
          )}
        </Button>

        <Button
          onClick={handleCancel}
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          Cancel
        </Button>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          You can always sign back in anytime
        </p>
      </div>
    </div>
  );
};