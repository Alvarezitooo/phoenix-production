'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Rocket } from 'lucide-react';
import { useRouter } from 'next/navigation';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 text-center text-white/70">
          <p>Chargement du formulaire…</p>
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const router = useRouter();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(values: FormValues) {
    setError(null);
    setSuccess(false);
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.message ?? 'Impossible de créer le compte');
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/auth/sign-in'), 1200);
  }

  return (
    <div className="space-y-6 text-white">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400">
          <Rocket className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold">Créez votre compte</h1>
        <p className="text-sm text-white/60">
          Activez votre espace Phoenix pour accéder aux modules IA personnalisés et recevoir 40 points d’énergie de bienvenue.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/60">Nom complet</label>
          <Input placeholder="Votre nom" {...form.register('name')} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/60">Email</label>
          <Input type="email" placeholder="vous@exemple.com" {...form.register('email')} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/60">Mot de passe</label>
          <Input type="password" placeholder="Minimum 8 caractères" {...form.register('password')} />
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        {success && <p className="text-sm text-emerald-300">Compte créé ! Redirection...</p>}
        <Button type="submit" className="w-full">
          Démarrer Phoenix
        </Button>
      </form>

      <p className="text-center text-xs text-white/50">
        Déjà inscrit ?{' '}
        <Link href="/auth/sign-in" className="text-emerald-200 hover:text-emerald-100">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
