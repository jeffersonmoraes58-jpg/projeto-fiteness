'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Users, Apple, BarChart3, MessageCircle, Bell,
  Settings, LogOut, ChevronLeft, Menu, Trophy,
  Calendar, CreditCard, Brain, Home, Utensils,
  Activity, Target, Star, Building2,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

const navByRole: Record<string, NavItem[]> = {
  TRAINER: [
    { icon: Home, label: 'Dashboard', href: '/trainer' },
    { icon: Users, label: 'Alunos', href: '/trainer/students' },
    { icon: Dumbbell, label: 'Treinos', href: '/trainer/workouts' },
    { icon: Activity, label: 'Exercícios', href: '/trainer/exercises' },
    { icon: Calendar, label: 'Agenda', href: '/trainer/schedule' },
    { icon: MessageCircle, label: 'Chat', href: '/trainer/chat', badge: 3 },
    { icon: BarChart3, label: 'Relatórios', href: '/trainer/reports' },
    { icon: Brain, label: 'IA Fitness', href: '/trainer/ai' },
    { icon: CreditCard, label: 'Pagamentos', href: '/trainer/payments' },
    { icon: Settings, label: 'Configurações', href: '/trainer/settings' },
  ],
  NUTRITIONIST: [
    { icon: Home, label: 'Dashboard', href: '/nutritionist' },
    { icon: Users, label: 'Pacientes', href: '/nutritionist/patients' },
    { icon: Apple, label: 'Dietas', href: '/nutritionist/diets' },
    { icon: Utensils, label: 'Alimentos', href: '/nutritionist/foods' },
    { icon: Calendar, label: 'Agenda', href: '/nutritionist/schedule' },
    { icon: MessageCircle, label: 'Chat', href: '/nutritionist/chat', badge: 2 },
    { icon: BarChart3, label: 'Relatórios', href: '/nutritionist/reports' },
    { icon: Brain, label: 'IA Nutrição', href: '/nutritionist/ai' },
    { icon: Settings, label: 'Configurações', href: '/nutritionist/settings' },
  ],
  STUDENT: [
    { icon: Home, label: 'Início', href: '/student' },
    { icon: Dumbbell, label: 'Meu Treino', href: '/student/workout' },
    { icon: Apple, label: 'Minha Dieta', href: '/student/diet' },
    { icon: Activity, label: 'Evolução', href: '/student/progress' },
    { icon: Target, label: 'Metas', href: '/student/goals' },
    { icon: Trophy, label: 'Conquistas', href: '/student/achievements' },
    { icon: Star, label: 'Desafios', href: '/student/challenges' },
    { icon: MessageCircle, label: 'Chat', href: '/student/chat', badge: 1 },
    { icon: Settings, label: 'Perfil', href: '/student/profile' },
  ],
  ADMIN: [
    { icon: Home, label: 'Dashboard', href: '/admin' },
    { icon: Building2, label: 'Academias', href: '/admin/tenants' },
    { icon: Users, label: 'Usuários', href: '/admin/users' },
    { icon: CreditCard, label: 'Assinaturas', href: '/admin/subscriptions' },
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
}

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const navItems = navByRole[user?.role || 'STUDENT'] || [];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 p-4 h-16 border-b border-border/50 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-gradient-brand rounded-lg flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="font-bold text-lg gradient-text overflow-hidden whitespace-nowrap"
            >
              FitSaaS
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
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
              {item.badge && !collapsed && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
              {item.badge && collapsed && (
                <span className="absolute top-1 right-1 bg-primary rounded-full w-2 h-2" />
              )}
            </Link>
          );
        })}
      </nav>

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
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-card border border-border rounded-xl flex items-center justify-center"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="w-5 h-5" />
      </button>

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
            className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border z-50 relative"
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
