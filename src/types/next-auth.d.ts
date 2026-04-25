import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      role: string;
      cityId: string | undefined;
      onboardingComplete: boolean;
      needsRoleSelection?: boolean;
    };
  }

  interface User {
    id: string;
    role?: string;
    cityId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub: string;
    role?: string;
    cityId?: string;
    needsRoleSelection?: boolean;
  }
}
