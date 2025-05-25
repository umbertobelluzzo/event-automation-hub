import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// =============================================================================
// NextAuth Configuration
// =============================================================================

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

    // Email/Magic Link Provider
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),

    // Credentials Provider for existing UIS members
    CredentialsProvider({
      id: 'credentials',
      name: 'UIS Credentials',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email',
          placeholder: 'your.email@uniteditalian.org'
        },
        password: { 
          label: 'Password', 
          type: 'password' 
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          // Find user in database
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
          });

          if (!user) {
            throw new Error('No user found with this email');
          }

          if (!user.isActive) {
            throw new Error('Account is disabled. Contact an administrator.');
          }

          // Check if user has a password set
          if (!user.password) {
            throw new Error('Please use Google sign-in or reset your password');
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error('Invalid password');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          throw error;
        }
      },
    }),
  ],

  // Database session strategy
  session: {
    strategy: 'database',
    maxAge: parseInt(process.env.SESSION_TIMEOUT || '7200'), // 2 hours default
  },

  // JWT configuration
  jwt: {
    maxAge: parseInt(process.env.SESSION_TIMEOUT || '7200'), // 2 hours default
  },

  // Custom pages
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },

  // Callbacks
  callbacks: {
    async signIn({ user, account, profile, email }) {
      // Allow OAuth sign-ins
      if (account?.provider === 'google') {
        try {
          // Check if user exists in our database
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (!existingUser) {
            // Check if email domain is allowed for auto-registration
            const emailDomain = user.email!.split('@')[1];
            const allowedDomains = ['uniteditalian.org', 'gmail.com']; // Add your allowed domains
            
            if (!allowedDomains.includes(emailDomain)) {
              console.log(`Sign-in denied for domain: ${emailDomain}`);
              return false;
            }

            // Auto-create user with VOLUNTEER role for new Google sign-ins
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name || '',
                role: 'VOLUNTEER',
                isActive: true,
                image: user.image,
              },
            });
          } else if (!existingUser.isActive) {
            console.log(`Sign-in denied for inactive user: ${user.email}`);
            return false;
          }

          return true;
        } catch (error) {
          console.error('Sign-in error:', error);
          return false;
        }
      }

      // Allow email sign-ins for existing users
      if (account?.provider === 'email') {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          return existingUser?.isActive || false;
        } catch (error) {
          console.error('Email sign-in error:', error);
          return false;
        }
      }

      // Allow credentials sign-in (handled in authorize function)
      if (account?.provider === 'credentials') {
        return true;
      }

      return false;
    },

    async session({ session, user, token }) {
      if (session.user) {
        try {
          // Fetch fresh user data from database
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email! },
          });

          if (dbUser) {
            session.user.id = dbUser.id;
            session.user.role = dbUser.role;
            session.user.isActive = dbUser.isActive;
            session.user.name = dbUser.name;
            session.user.image = dbUser.image;
          }
        } catch (error) {
          console.error('Session callback error:', error);
        }
      }

      return session;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role;
        token.isActive = user.isActive;
      }
      return token;
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      
      return baseUrl;
    },
  },

  // Events
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User signed in: ${user.email} via ${account?.provider}`);
      
      // Log successful sign-ins to audit log
      try {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'user_signin',
            entityType: 'user',
            entityId: user.id,
            afterData: {
              provider: account?.provider,
              isNewUser,
            },
          },
        });
      } catch (error) {
        console.error('Failed to log sign-in event:', error);
      }
    },

    async signOut({ token }) {
      console.log(`User signed out: ${token?.email}`);
      
      // Log sign-outs to audit log
      try {
        if (token?.sub) {
          await prisma.auditLog.create({
            data: {
              userId: token.sub,
              action: 'user_signout',
              entityType: 'user',
              entityId: token.sub,
            },
          });
        }
      } catch (error) {
        console.error('Failed to log sign-out event:', error);
      }
    },
  },

  // Enable debug in development
  debug: process.env.NODE_ENV === 'development',

  // Custom logger
  logger: {
    error(code, metadata) {
      console.error('[NextAuth Error]', code, metadata);
    },
    warn(code) {
      console.warn('[NextAuth Warning]', code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[NextAuth Debug]', code, metadata);
      }
    },
  },
};