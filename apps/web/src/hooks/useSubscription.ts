'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export interface PlanLimits {
  maxStudents: number;
  ai: boolean;
  challenges: boolean;
  scheduleCalendar: boolean;
  billing: boolean;
  pdfReports: boolean;
  csvReports: boolean;
  gamification: boolean;
  musicPlayer: boolean;
}

export type SubscriptionPlan = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';

export interface SubscriptionData {
  plan: SubscriptionPlan;
  displayName: string;
  limits: PlanLimits;
  subscription: any;
}

const UPGRADE_PRICE: Record<SubscriptionPlan, string | null> = {
  FREE: 'R$35/mês',
  BASIC: 'R$55/mês',
  PRO: 'R$95/mês',
  ENTERPRISE: null,
};

const UPGRADE_PLAN: Record<SubscriptionPlan, string | null> = {
  FREE: 'starter',
  BASIC: 'pro',
  PRO: 'elite',
  ENTERPRISE: null,
};

export function useSubscription() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery<SubscriptionData>({
    queryKey: ['subscription-my'],
    queryFn: () => api.get('/subscriptions/my').then((r) => r.data?.data ?? r.data),
    enabled: !!user && user.role !== 'ADMIN',
    staleTime: 5 * 60 * 1000,
  });

  const plan: SubscriptionPlan = data?.plan ?? 'FREE';
  const limits = data?.limits;

  return {
    plan,
    displayName: data?.displayName ?? 'Grátis',
    limits,
    isLoading,
    canUseFeature: (feature: keyof PlanLimits): boolean => {
      if (feature === 'maxStudents') return true;
      return limits?.[feature as keyof Omit<PlanLimits, 'maxStudents'>] ?? false;
    },
    isAtStudentLimit: (count: number): boolean => {
      const max = limits?.maxStudents ?? 1;
      return max !== -1 && count >= max;
    },
    upgradePrice: UPGRADE_PRICE[plan],
    upgradePlan: UPGRADE_PLAN[plan],
    isMaxPlan: plan === 'ENTERPRISE',
  };
}
