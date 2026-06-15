'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Dumbbell, MessageCircle, Settings, Apple, Activity, BarChart3 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

const navByRole: Record<string, { icon: any; label: string; href: string }[]> = {
  TRAINER: [
    { icon: Home, label: 'Início', href: '/trainer' },
    { icon: Users, label: 'Alunos', href: '/trainer/students' },
    { icon: Dumbbell, label: 'Treinos', href: '/trainer/workouts' },
    { icon: Activity, label: 'Exercícios', href: '/trainer/exercises' },
    { icon: MessageCircle, label: 'Chat', href: '/trainer/chat' },
  ],
  NUTRITIONIST: [
    { icon: Home, label: 'Início', href: '/nutritionist' },
    { icon: Users, label: 'Pacientes', href: '/nutritionist/patients' },
    { icon: Apple, label: 'Dietas', href: '/nutritionist/diets' },
    { icon: MessageCircle, label: 'Chat', href: '/nutritionist/chat' },
    { icon: Settings, label: 'Config', href: '/nutritionist/settings' },
  ],
  STUDENT: [
    { icon: Home, label: 'Início', href: '/student' },
    { icon: Dumbbell, label: 'Treino', href: '/student/workout' },
    { icon: Apple, label: 'Dieta', href: '/student/diet' },
    { icon: Activity, label: 'Evolução', href: '/student/progress' },
    { icon: MessageCircle, label: 'Chat', href: '/student/chat' },
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

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border flex items-center safe-area-inset-bottom">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <item.icon className={cn('w-5 h-5', isActive && 'text-primary')} />
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
