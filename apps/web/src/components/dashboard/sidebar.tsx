'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Users, Apple, BarChart3, MessageCircle, Bell,
  Settings, LogOut, ChevronLeft, Trophy,
  Calendar, CreditCard, Brain, Home, Utensils,
  Activity, Target, Star, Building2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';

const TRAINER_NAV: NavItem[] = [
  { icon: Home, label: 'Dashboard', href: '/trainer' },
  { icon: Users, label: 'Alunos', href: '/trainer/students' },
  { icon: Dumbbell, label: 'Treinos', href: '/trainer/workouts' },
  { icon: Activity, label: 'Exercícios', href: '/trainer/exercises' },
  { icon: Trophy, label: 'Desafios', href: '/trainer/challenges' },
  { icon: Calendar, label: 'Agenda', href: '/trainer/schedule' },
  { icon: MessageCircle, label: 'Chat', href: '/trainer/chat', isChat: true },
  { icon: BarChart3, label: 'Relatórios', href: '/trainer/reports' },
  { icon: Brain, label: 'IA Fitness', href: '/trainer/ai' },
  { icon: CreditCard, label: 'Pagamentos', href: '/trainer/payments' },
  { icon: Settings, label: 'Configurações', href: '/trainer/settings' },
];

const navByRole: Record<string, NavItem[]> = {
  TRAINER: TRAINER_NAV,
  STUDIO_OWNER: [
    { icon: Home, label: 'Dashboard', href: '/studio' },
    { icon: Users, label: 'Equipe', href: '/studio/team' },
    { icon: BarChart3, label: 'Relatórios', href: '/studio/reports' },
    { icon: CreditCard, label: 'Meu Plano', href: '/studio/subscription' },
    { icon: Settings, label: 'Configurações', href: '/studio/settings' },
  ],
  NUTRITIONIST: [
    { icon: Home, label: 'Dashboard', href: '/nutritionist' },
    { icon: Users, label: 'Pacientes', href: '/nutritionist/patients' },
    { icon: Apple, label: 'Dietas', href: '/nutritionist/diets' },
    { icon: Utensils, label: 'Alimentos', href: '/nutritionist/foods' },
    { icon: Calendar, label: 'Agenda', href: '/nutritionist/schedule' },
    { icon: MessageCircle, label: 'Chat', href: '/nutritionist/chat', isChat: true },
    { icon: BarChart3, label: 'Relatórios', href: '/nutritionist/reports' },
    { icon: Brain, label: 'IA Nutrição', href: '/nutritionist/ai' },
    { icon: CreditCard, label: 'Meu Plano', href: '/nutritionist/subscription' },
    { icon: Settings, label: 'Configurações', href: '/nutritionist/settings' },
  ],
  STUDENT: [
    { icon: Home, label: 'Início', href: '/student' },
    { icon: Dumbbell, label: 'Meu Treino', href: '/student/workout' },
    { icon: Apple, label: 'Minha Dieta', href: '/student/diet' },
    { icon: Activity, label: 'Evolução', href: '/student/progress' },
    { icon: Calendar, label: 'Agenda', href: '/student/schedule' },
    { icon: Target, label: 'Metas', href: '/student/goals' },
    { icon: Trophy, label: 'Conquistas', href: '/student/achievements' },
    { icon: Star, label: 'Desafios', href: '/student/challenges' },
    { icon: MessageCircle, label: 'Chat', href: '/student/chat', isChat: true },
    { icon: CreditCard, label: 'Pagamentos', href: '/student/billing' },
    { icon: Settings, label: 'Perfil', href: '/student/profile' },
  ],
  ADMIN: [
    { icon: Home, label: 'Dashboard', href: '/admin' },
    { icon: Building2, label: 'Academias', href: '/admin/tenants' },
    { icon: Users, label: 'Usuários', href: '/admin/users' },
    { icon: CreditCard, label: 'Assinaturas', href: '/admin/subscriptions' },
    { icon: CreditCard, label: 'Meu Plano', href: '/admin/billing' },
    { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
    { icon: Bell, label: 'Notificações', href: '/admin/notifications' },
    { icon: Settings, label: 'Configurações', href: '/admin/settings' },
  ],
};

interface NavItem {
  icon: any;
  label: string;
  href: string;
  badge?: number;
  isChat?: boolean;
}

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { displayName, upgradePrice, upgradePlan, isMaxPlan } = useSubscription();

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ['chat-unread-count'],
    queryFn: () => api.get('/chat/unread/count').then((r) => r.data.data ?? 0),
    refetchInterval: 20000,
    enabled: !!user,
  });

  useEffect(() => {
    const handler = () => setMobileOpen((v) => !v);
    window.addEventListener('toggle-mobile-sidebar', handler);
    return () => window.removeEventListener('toggle-mobile-sidebar', handler);
  }, []);
  const navItems = navByRole[user?.role || 'STUDENT'] || [];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 p-4 h-16 border-b border-border/50 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-10 h-10 flex-shrink-0">
          <img src="/logo.png" alt="Fitlynutri" className="w-full h-full object-contain" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="font-bold text-lg gradient-text overflow-hidden whitespace-nowrap"
            >
              Fitlynutri
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const badge = item.isChat ? unreadCount : (item.badge ?? 0);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'sidebar-link relative',
                isActive && 'active',
                collapsed && 'justify-center px-3',
              )}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap flex-1"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {badge > 0 && !collapsed && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
              {badge > 0 && collapsed && (
                <span className="absolute top-1 right-1 bg-primary rounded-full w-2 h-2" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Plan badge + upgrade */}
      {!collapsed && !isMaxPlan && upgradePlan && (
        <div className="px-3 pb-2">
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">Plano {displayName}</span>
            </div>
            {upgradePrice && (
              <p className="text-[11px] text-muted-foreground mb-2">Upgrade por {upgradePrice}</p>
            )}
            <Link
              href={
                user?.role === 'NUTRITIONIST' ? '/nutritionist/subscription' :
                user?.role === 'STUDIO_OWNER' ? '/studio/subscription' :
                '/trainer/subscription'
              }
              className="block text-center text-[11px] font-semibold bg-primary text-primary-foreground rounded-lg py-1.5 hover:bg-primary/90 transition-colors"
            >
              Fazer upgrade
            </Link>
          </div>
        </div>
      )}
      {collapsed && !isMaxPlan && (
        <div className="px-2 pb-2 flex justify-center">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center" title={`Plano ${displayName} — Upgrade disponível`}>
            <Star className="w-3.5 h-3.5 text-primary" />
          </div>
        </div>
      )}

      {/* User + logout */}
      <div className="p-3 border-t border-border/50 space-y-1">
        <button
          onClick={() => logout()}
          className={cn(
            'sidebar-link w-full text-left hover:text-destructive',
            collapsed && 'justify-center px-3',
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>

      {/* Collapse toggle (desktop) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-card border border-border rounded-full items-center justify-center hover:bg-accent transition-all"
      >
        <ChevronLeft className={cn('w-3 h-3 transition-transform', collapsed && 'rotate-180')} />
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border z-50"
          >
            <SidebarContent />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.div
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ duration: 0.3 }}
        className="hidden lg:block fixed left-0 top-0 bottom-0 bg-card border-r border-border z-30 relative"
      >
        <SidebarContent />
      </motion.div>
    </>
  );
}
