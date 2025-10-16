'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useEnergySnapshot } from '@/hooks/use-energy';
import { useToast } from '@/components/ui/toast';

const LAST_BONUS_KEY = 'phoenix:lastEnergyBonusAt';
const LAST_LOW_ENERGY_KEY = 'phoenix:lastLowEnergyToast';
const LOW_ENERGY_THRESHOLD = 10;

function setLocalStorage(key: string, value: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value);
}

function getLocalStorage(key: string) {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
}

export function EnergyToastWatcher() {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const { data } = useEnergySnapshot(isAuthenticated);
  const { showToast } = useToast();
  const previousBalanceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!data?.lastBonusAt || !isAuthenticated) return;

    const alreadyNotified = getLocalStorage(LAST_BONUS_KEY);
    if (alreadyNotified === data.lastBonusAt) {
      return;
    }

    setLocalStorage(LAST_BONUS_KEY, data.lastBonusAt);

    showToast({
      title: 'Bonus de streak débloqué',
      description: `+${data.bonus.amount} points d’énergie. Continue sur ta lancée !`,
      variant: 'success',
    });
  }, [data?.lastBonusAt, data?.bonus.amount, isAuthenticated, showToast]);

  useEffect(() => {
    if (!data || !isAuthenticated) return;

    const previousBalance = previousBalanceRef.current;
    previousBalanceRef.current = data.balance;

    if (data.balance > LOW_ENERGY_THRESHOLD) {
      return;
    }

    if (previousBalance !== null && previousBalance <= LOW_ENERGY_THRESHOLD && data.balance <= previousBalance) {
      return;
    }

    const datedKey = `${new Date().toISOString().slice(0, 10)}`;
    const lastNotificationDate = getLocalStorage(LAST_LOW_ENERGY_KEY);
    if (lastNotificationDate === datedKey) {
      return;
    }

    setLocalStorage(LAST_LOW_ENERGY_KEY, datedKey);

    showToast({
      title: 'Énergie faible',
      description: 'Recharge ton énergie ou complète un rituel pour conserver ton streak.',
      variant: 'info',
    });
  }, [data, isAuthenticated, showToast]);

  return null;
}
