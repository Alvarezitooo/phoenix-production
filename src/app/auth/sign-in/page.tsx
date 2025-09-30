'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

function SignInContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(params.get('error'));
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const result = await signIn('credentials', {
      email: values.email,
      password: values.password,
      redirect: false,
      callbackUrl: '/dashboard',
    });

    if (result?.error) {
      setError(result.error);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="space-y-6 text-white">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400">
          <Rocket className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold">Connexion à Phoenix</h1>
        <p className="text-sm text-white/60">Reprenez votre parcours de développement de carrière.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Email</label>
          <Input type="email" placeholder="vous@exemple.com" {...form.register('email')} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Mot de passe</label>
          <Input type="password" placeholder="********" {...form.register('password')} />
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <Button type="submit" className="w-full">
          Se connecter
        </Button>
      </form>

      <p className="text-center text-xs text-white/50">
        Pas encore de compte ?{' '}
        <Link href="/auth/register" className="text-emerald-200 hover:text-emerald-100">
          Créer mon espace
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}
