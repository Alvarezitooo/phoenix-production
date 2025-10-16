import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      preferredCareerMatchId?: string;
      energyBalance?: number;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    preferredCareerMatchId?: string | null;
    energyBalance?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    preferredCareerMatchId?: string | null;
    energyBalance?: number;
  }
}
