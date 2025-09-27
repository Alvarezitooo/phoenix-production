import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from './prisma';
import { getServerSession } from 'next-auth';

const DEFAULT_PLAN = (process.env.DEFAULT_SUBSCRIPTION_PLAN ?? 'ESSENTIAL') as
  | 'ESSENTIAL'
  | 'PRO';

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
          },
        });

        token.subscriptionPlan = subscription?.subscriptionPlan ?? DEFAULT_PLAN;
        token.subscriptionStatus = subscription?.subscriptionStatus ?? 'INACTIVE';
        token.currentPeriodEnd = subscription?.currentPeriodEnd?.toISOString();
      }

      if (token.sub) {
        if (!token.subscriptionPlan || !token.subscriptionStatus) {
          const subscription = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              subscriptionPlan: true,
              subscriptionStatus: true,
              currentPeriodEnd: true,
            },
          });

          token.subscriptionPlan = subscription?.subscriptionPlan ?? DEFAULT_PLAN;
          token.subscriptionStatus = subscription?.subscriptionStatus ?? 'INACTIVE';
          token.currentPeriodEnd = subscription?.currentPeriodEnd?.toISOString();
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
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionPlan: DEFAULT_PLAN,
          subscriptionStatus: 'ACTIVE',
        },
      });
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);

export type AppSession = Awaited<ReturnType<typeof getAuthSession>>;
