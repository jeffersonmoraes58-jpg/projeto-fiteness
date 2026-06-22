import { SubscriptionPlan } from '@prisma/client';

export interface PlanLimits {
  maxStudents: number; // -1 = unlimited
  ai: boolean;
  challenges: boolean;
  scheduleCalendar: boolean;
  billing: boolean;
  pdfReports: boolean;
  csvReports: boolean;
  gamification: boolean;
  musicPlayer: boolean;
}

export type PlanFeature = keyof Omit<PlanLimits, 'maxStudents'>;

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  FREE: {
    maxStudents: 1,
    ai: false,
    challenges: false,
    scheduleCalendar: false,
    billing: false,
    pdfReports: false,
    csvReports: false,
    gamification: false,
    musicPlayer: false,
  },
  BASIC: {
    maxStudents: 20,
    ai: false,
    challenges: false,
    scheduleCalendar: true,
    billing: true,
    pdfReports: false,
    csvReports: true,
    gamification: false,
    musicPlayer: false,
  },
  PRO: {
    maxStudents: 60,
    ai: true,
    challenges: true,
    scheduleCalendar: true,
    billing: true,
    pdfReports: true,
    csvReports: true,
    gamification: true,
    musicPlayer: true,
  },
  ENTERPRISE: {
    maxStudents: -1,
    ai: true,
    challenges: true,
    scheduleCalendar: true,
    billing: true,
    pdfReports: true,
    csvReports: true,
    gamification: true,
    musicPlayer: true,
  },
};

export const PLAN_DISPLAY_NAMES: Record<SubscriptionPlan, string> = {
  FREE: 'Grátis',
  BASIC: 'Starter',
  PRO: 'Pro',
  ENTERPRISE: 'Elite',
};

export const PLAN_UPGRADE_PRICE: Record<SubscriptionPlan, string | null> = {
  FREE: 'R$35/mês',
  BASIC: 'R$55/mês',
  PRO: 'R$95/mês',
  ENTERPRISE: null,
};

export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  FREE: 0,
  BASIC: 35,
  PRO: 55,
  ENTERPRISE: 95,
};
