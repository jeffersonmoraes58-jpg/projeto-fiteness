'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, accessToken } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Zustand persist reads localStorage asynchronously on first mount.
    // We wait for hasHydrated() before deciding to redirect.
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        setHydrated(true);
      });
      return unsub;
    }
  }, []);

  useEffect(() => {
    if (hydrated && !accessToken && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, accessToken, user, router, pathname]);

  if (!hydrated || (!accessToken && !user)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
