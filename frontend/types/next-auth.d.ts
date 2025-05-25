import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { UserRole } from '@/shared/types';

// =============================================================================
// NextAuth Type Extensions
// =============================================================================

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      isActive: boolean;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: UserRole;
    isActive: boolean;
    password?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole;
    isActive: boolean;
  }
}