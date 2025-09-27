import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <div className="space-y-6 text-center text-white">
      <h1 className="text-2xl font-semibold">Oups, une erreur est survenue</h1>
      <p className="text-sm text-white/60">Réessayez de vous connecter ou contactez l&apos;assistance Phoenix.</p>
      <Link href="/auth/sign-in" className="text-emerald-200 hover:text-emerald-100">
        Revenir à la connexion
      </Link>
    </div>
  );
}
