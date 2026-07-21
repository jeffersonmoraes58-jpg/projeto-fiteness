'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Dumbbell, MessageCircle, Settings, Apple, Activity, BarChart3, Clock } from 'lucide-react';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const navByRole: Record<string, { icon: any; label: string; href: string; isChat?: boolean; disabled?: boolean }[]> = {
  TRAINER: [
    { icon: Home, label: 'Início', href: '/trainer' },
    { icon: Users, label: 'Alunos', href: '/trainer/students' },
    { icon: Dumbbell, label: 'Treinos', href: '/trainer/workouts' },
    { icon: Activity, label: 'Exercícios', href: '/trainer/exercises' },
    { icon: MessageCircle, label: 'Chat', href: '/trainer/chat', isChat: true },
  ],
  NUTRITIONIST: [
    { icon: Home, label: 'Início', href: '/nutritionist' },
    { icon: Users, label: 'Pacientes', href: '/nutritionist/patients' },
    { icon: Apple, label: 'Dietas', href: '/nutritionist/diets' },
    { icon: MessageCircle, label: 'Chat', href: '/nutritionist/chat', isChat: true },
    { icon: Settings, label: 'Config', href: '/nutritionist/settings' },
  ],
  STUDENT: [
    { icon: Home, label: 'Início', href: '/student' },
    { icon: Dumbbell, label: 'Treino', href: '/student/workout' },
    { icon: Clock, label: 'Dieta', href: '#', disabled: true },
    { icon: Activity, label: 'Evolução', href: '/student/progress' },
    { icon: MessageCircle, label: 'Chat', href: '/student/chat', isChat: true },
  ],

  ADMIN: [
    { icon: Home, label: 'Início', href: '/admin' },
    { icon: Users, label: 'Usuários', href: '/admin/users' },
    { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
    { icon: Settings, label: 'Config', href: '/admin/settings' },
  ],
};

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const items = navByRole[user?.role || 'STUDENT'] || [];

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ['chat-unread-count'],
    queryFn: () => api.get('/chat/unread/count').then((r) => r.data.data ?? 0),
    refetchInterval: 20000,
    enabled: !!user,
  });

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border flex items-center safe-area-inset-bottom">
      {items.map((item) => {
        const isActive = !item.disabled && (pathname === item.href || pathname.startsWith(item.href + '/'));
        const badge = item.isChat ? unreadCount : 0;

        if (item.disabled) {
          return (
            <div
              key={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground/40 cursor-not-allowed relative"
              title="Em breve"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <div className="relative">
              <item.icon className={cn('w-5 h-5', isActive && 'text-primary')} />
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] rounded-full min-w-[14px] h-3.5 px-0.5 flex items-center justify-center font-bold">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
            {isActive && (
              <span className="absolute top-0 h-0.5 w-8 bg-primary rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
