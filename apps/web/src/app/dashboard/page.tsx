'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin',
  TRAINER: '/trainer',
  STUDIO_OWNER: '/trainer',
  NUTRITIONIST: '/nutritionist',
  STUDENT: '/student',
};

export default function DashboardRedirect() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const path = (user?.role && ROLE_HOME[user.role]) || '/login';
    router.replace(path);
  }, [user, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
