'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

function clamp(value: number) {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export type EnergyMeterProps = {
  value?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  element?: 'FEU' | 'EAU' | 'AIR' | 'TERRE' | 'ETHER';
};

const SIZE_MAP = {
  sm: 120,
  md: 160,
  lg: 200,
};

export function EnergyMeter({ value = 62, label, size = 'md', element = 'AIR' }: EnergyMeterProps) {
  const diameter = SIZE_MAP[size];
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const safeValue = clamp(value);
  const dashoffset = circumference - (circumference * safeValue) / 100;
  const glowClass = useMemo(() => {
    switch (element) {
      case 'FEU':
        return 'halo-feu';
      case 'EAU':
        return 'halo-eau';
      case 'TERRE':
        return 'halo-terre';
      case 'ETHER':
        return 'halo-ether';
      default:
        return 'halo-air';
    }
  }, [element]);

  return (
    <div className="relative grid place-items-center" style={{ width: diameter, height: diameter }}>
      <div className={`absolute inset-0 -z-10 rounded-full blur-2xl ${glowClass}`} />
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="rgba(148, 163, 184, 0.15)"
          strokeWidth="10"
          fill="none"
        />
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          stroke="url(#luna-energy-gradient)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashoffset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="luna-energy-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <motion.div
        className="absolute text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <p className="text-3xl font-semibold text-white">{safeValue}</p>
        <p className="text-xs uppercase tracking-wide text-white/50">{label ?? 'Énergie'}</p>
      </motion.div>
    </div>
  );
}
