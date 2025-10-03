import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from './prisma';
import { getServerSession } from 'next-auth';
import type { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

const DEFAULT_PLAN = (process.env.DEFAULT_SUBSCRIPTION_PLAN ?? 'DISCOVERY') as SubscriptionPlan;
const INACTIVE_STATUS: SubscriptionStatus = 'INACTIVE';

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
        session.user.subscriptionPlan = (token.subscriptionPlan as string | undefined) ?? 'ESSENTIAL';
        session.user.subscriptionStatus = (token.subscriptionStatus as string | undefined) ?? 'INACTIVE';
        session.user.currentPeriodEnd = token.currentPeriodEnd as string | undefined;
        session.user.preferredCareerMatchId = token.preferredCareerMatchId as string | undefined;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        const subscription = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            subscriptionPlan: true,
            subscriptionStatus: true,
            currentPeriodEnd: true,
            preferredCareerMatchId: true,
          },
        });

        token.subscriptionPlan = subscription?.subscriptionPlan ?? DEFAULT_PLAN;
        token.subscriptionStatus = subscription?.subscriptionStatus ?? INACTIVE_STATUS;
        token.currentPeriodEnd = subscription?.currentPeriodEnd?.toISOString();
        token.preferredCareerMatchId = subscription?.preferredCareerMatchId ?? null;
      }

      if (token.sub) {
        if (!token.subscriptionPlan || !token.subscriptionStatus) {
          const subscription = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              subscriptionPlan: true,
              subscriptionStatus: true,
              currentPeriodEnd: true,
              preferredCareerMatchId: true,
            },
          });

          token.subscriptionPlan = subscription?.subscriptionPlan ?? DEFAULT_PLAN;
          token.subscriptionStatus = subscription?.subscriptionStatus ?? INACTIVE_STATUS;
          token.currentPeriodEnd = subscription?.currentPeriodEnd?.toISOString();
          token.preferredCareerMatchId = subscription?.preferredCareerMatchId ?? token.preferredCareerMatchId ?? null;
        }
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
      const plan = (user.subscriptionPlan as SubscriptionPlan | null) ?? DEFAULT_PLAN;
      const status = (user.subscriptionStatus as SubscriptionStatus | null) ?? INACTIVE_STATUS;
      const now = new Date();
      const data: {
        subscriptionPlan: SubscriptionPlan;
        subscriptionStatus: SubscriptionStatus;
        currentPeriodStart?: Date | null;
        currentPeriodEnd?: Date | null;
        preferredCareerMatchId?: string | null;
      } = {
        subscriptionPlan: plan,
        subscriptionStatus: status,
      };

      if (plan === 'DISCOVERY' && status === INACTIVE_STATUS) {
        data.subscriptionStatus = 'ACTIVE';
        data.currentPeriodStart = now;
        data.currentPeriodEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        data.preferredCareerMatchId = null;
      }
      await prisma.user.update({
        where: { id: user.id },
        data,
      });
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);

export type AppSession = Awaited<ReturnType<typeof getAuthSession>>;
