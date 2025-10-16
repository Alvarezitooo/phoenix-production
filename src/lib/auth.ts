import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from './prisma';
import { getServerSession } from 'next-auth';
import { EnergyTransactionType } from '@prisma/client';
const INITIAL_ENERGY_BALANCE = Number.parseInt(process.env.INITIAL_ENERGY_BALANCE ?? '40', 10);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/sign-in',
    error: '/auth/error',
  },
  providers: [
    CredentialsProvider({
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error('Email and password are required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user?.hashedPassword) {
          throw new Error('Invalid login credentials');
        }

        const isValid = await compare(credentials.password, user.hashedPassword);
        if (!isValid) {
          throw new Error('Invalid login credentials');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
        } satisfies Partial<NextAuthUser>;
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? '';
        session.user.preferredCareerMatchId = token.preferredCareerMatchId as string | undefined;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            preferredCareerMatchId: true,
          },
        });

        token.preferredCareerMatchId = dbUser?.preferredCareerMatchId ?? null;
      }

      return token;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }

      if (new URL(url).origin === baseUrl) {
        return url;
      }

      return baseUrl;
    },
  },
  events: {
    async createUser({ user }) {
      const balance = Number.isFinite(INITIAL_ENERGY_BALANCE) ? Math.max(INITIAL_ENERGY_BALANCE, 0) : 0;

      await prisma.$transaction(async (tx) => {
        await tx.energyWallet.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            balance,
            lifetimeEarned: balance,
          },
        });

        if (balance > 0) {
          await tx.energyTransaction.create({
            data: {
              userId: user.id,
              type: EnergyTransactionType.BONUS,
              amount: balance,
              balanceAfter: balance,
              reference: 'signup_bonus',
              metadata: { reason: 'signup' },
            },
          });
        }
      });
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);

export type AppSession = Awaited<ReturnType<typeof getAuthSession>>;
