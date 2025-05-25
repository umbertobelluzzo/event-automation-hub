'use client';

import { useState } from 'react';
import { signIn, getProviders } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// =============================================================================
// Form Schemas
// =============================================================================

const credentialsSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type CredentialsFormData = z.infer<typeof credentialsSchema>;
type EmailFormData = z.infer<typeof emailSchema>;

// =============================================================================
// Sign In Form Component
// =============================================================================

interface SignInFormProps {
  callbackUrl?: string;
}

export const SignInForm: React.FC<SignInFormProps> = ({ callbackUrl }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Credentials form
  const credentialsForm = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Email form
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  });

  // =============================================================================
  // Sign In Handlers
  // =============================================================================

  const handleCredentialsSignIn = async (data: CredentialsFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push(callbackUrl || '/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (data: EmailFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('email', {
        email: data.email,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        setEmailSent(true);
      }
    } catch (err) {
      setError('Failed to send email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signIn('google', {
        callbackUrl: callbackUrl || '/dashboard',
      });
    } catch (err) {
      setError('Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  // =============================================================================
  // Email Success State
  // =============================================================================

  if (emailSent) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <Mail className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Check your email
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            We sent a sign-in link to <strong>{emailForm.getValues('email')}</strong>
          </p>
          <Button
            variant="outline"
            onClick={() => setEmailSent(false)}
            className="w-full"
          >
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  // =============================================================================
  // Main Form
  // =============================================================================

  return (
    <div className="bg-white shadow-lg rounded-lg p-8">
      {/* Google Sign In */}
      <div className="mb-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full h-11 text-sm"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Continue with Google
        </Button>
      </div>

      <div className="relative mb-6">
        <Separator />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="bg-white px-2 text-xs text-gray-500">Or continue with</span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs for different sign-in methods */}
      <Tabs defaultValue="credentials" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="credentials">Password</TabsTrigger>
          <TabsTrigger value="email">Magic Link</TabsTrigger>
        </TabsList>

        {/* Credentials Tab */}
        <TabsContent value="credentials">
          <form
            onSubmit={credentialsForm.handleSubmit(handleCredentialsSignIn)}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="credentials-email">Email address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="credentials-email"
                  type="email"
                  placeholder="your.email@uniteditalian.org"
                  className="pl-10"
                  disabled={isLoading}
                  {...credentialsForm.register('email')}
                />
              </div>
              {credentialsForm.formState.errors.email && (
                <p className="text-sm text-red-600 mt-1">
                  {credentialsForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="credentials-password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="credentials-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  disabled={isLoading}
                  {...credentialsForm.register('password')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {credentialsForm.formState.errors.password && (
                <p className="text-sm text-red-600 mt-1">
                  {credentialsForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              variant="italian"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email">
          <form
            onSubmit={emailForm.handleSubmit(handleEmailSignIn)}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="magic-email">Email address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="magic-email"
                  type="email"
                  placeholder="your.email@uniteditalian.org"
                  className="pl-10"
                  disabled={isLoading}
                  {...emailForm.register('email')}
                />
              </div>
              {emailForm.formState.errors.email && (
                <p className="text-sm text-red-600 mt-1">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
              We'll send you a secure link to sign in without a password.
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              variant="italian"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send magic link'
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};