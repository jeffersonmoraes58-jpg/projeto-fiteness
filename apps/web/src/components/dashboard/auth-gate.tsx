'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

/**
 * AuthGate: protege rotas do dashboard no client-side.
 * Se o usuário não estiver autenticado (token ausente/expirado),
 * redireciona imediatamente para /login sem mostrar conteúdo.
 *
 * Isso é necessário porque o middleware do Next.js só executa
 * em requisições ao servidor. Navegação client-side (via router.push)
 * não passa pelo middleware, então o usuário poderia ver a tela
 * mesmo depois de deslogar.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, accessToken } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Se não tem token nem user, redireciona para login
    if (!accessToken && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setChecked(true);
  }, [accessToken, user, router, pathname]);

  // Enquanto não verifica, mostra nada (evita flash do conteúdo)
  if (!checked) {
    return null;
  }

  return <>{children}</>;
}
