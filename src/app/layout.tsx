import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { cn } from '@/utils/cn';

export const metadata: Metadata = {
  title: 'Phoenix | Career Development Platform',
  description:
    'Phoenix aide les professionnels à piloter leur trajectoire avec des évaluations psychométriques, de l’IA personnalisée et des parcours d’abonnement clairs.',
  metadataBase: new URL(process.env.APP_BASE_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('bg-slate-950 text-slate-100 antialiased font-sans')}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
