import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      subscriptionPlan: string;
      subscriptionStatus: string;
      currentPeriodEnd?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    subscriptionPlan?: string;
    subscriptionStatus?: string;
    currentPeriodEnd?: Date;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    subscriptionPlan?: string;
    subscriptionStatus?: string;
    currentPeriodEnd?: string;
  }
}
