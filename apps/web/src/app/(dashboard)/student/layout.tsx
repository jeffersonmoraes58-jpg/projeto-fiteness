'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { data } = useQuery({
    queryKey: ['student-billing-guard'],
    queryFn: () =>
      api.get('/billing/student/status').then((r) => r.data?.data ?? r.data),
    staleTime: 60_000,
    retry: false,
    // Don't throw — silently ignore errors (no billing = free access)
  });

  useEffect(() => {
    if (!data || !Array.isArray(data)) return;
    const suspended = data.some((b: any) => b.status === 'SUSPENDED');
    if (suspended && pathname !== '/student/billing') {
      router.replace('/student/billing');
    }
  }, [data, pathname, router]);

  return <>{children}</>;
}
