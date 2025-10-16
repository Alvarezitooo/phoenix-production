export type CvThemeKey = 'FEU' | 'EAU' | 'TERRE' | 'AIR' | 'ETHER';

export const CV_THEMES: Record<CvThemeKey, { label: string; gradient: string; border: string; text: string; accent: string }> = {
  FEU: {
    label: 'Feu',
    gradient: 'from-orange-500/70 via-rose-500/60 to-red-500/70',
    border: 'border-orange-400/50',
    text: 'text-orange-100',
    accent: 'text-orange-300',
  },
  EAU: {
    label: 'Eau',
    gradient: 'from-cyan-500/60 via-sky-500/50 to-blue-500/60',
    border: 'border-cyan-400/50',
    text: 'text-cyan-100',
    accent: 'text-cyan-300',
  },
  TERRE: {
    label: 'Terre',
    gradient: 'from-amber-500/30 via-lime-600/40 to-emerald-500/30',
    border: 'border-lime-400/50',
    text: 'text-lime-100',
    accent: 'text-emerald-200',
  },
  AIR: {
    label: 'Air',
    gradient: 'from-slate-200/30 via-indigo-300/30 to-blue-200/30',
    border: 'border-indigo-300/40',
    text: 'text-slate-100',
    accent: 'text-indigo-200',
  },
  ETHER: {
    label: 'Éther',
    gradient: 'from-purple-500/40 via-fuchsia-500/40 to-sky-500/40',
    border: 'border-fuchsia-400/50',
    text: 'text-fuchsia-100',
    accent: 'text-sky-200',
  },
};

export function resolveCvTheme(element?: string | null): CvThemeKey {
  if (!element) return 'AIR';
  const normalized = element.toUpperCase();
  if (normalized in CV_THEMES) {
    return normalized as CvThemeKey;
  }
  return 'AIR';
}
