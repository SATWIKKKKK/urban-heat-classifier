import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      role: string;
      cityId: string | null;
      onboardingComplete: boolean;
    };
    role?: string;
    cityId?: string | null;
    onboardingComplete?: boolean;
  }

  interface User {
    role?: string;
    cityId?: string | null;
    onboardingComplete?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    role: string;
    cityId: string | null;
    onboardingComplete?: boolean;
  }
}
