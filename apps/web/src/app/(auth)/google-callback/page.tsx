'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

/**
 * Página de retorno do login com Google.
 *
 * O backend (auth.controller.ts -> googleCallback) redireciona pra cá com
 * accessToken/refreshToken na URL depois que o usuário loga com o Google.
 * Aqui a gente busca os dados do usuário, guarda tudo no mesmo lugar que o
 * login por e-mail/senha usa (useAuthStore + cookies), e manda pro painel.
 */
export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens, setUser } = useAuthStore();
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (!accessToken || !refreshToken) {
      toast.error('Não foi possível concluir o login com o Google.');
      router.replace('/login');
      return;
    }

    (async () => {
      try {
        setTokens(accessToken, refreshToken);

        const { data } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const user = data.data ?? data;

        setUser(user);
        api.defaults.headers.Authorization = `Bearer ${accessToken}`;
        document.cookie = `fitlynutri-role=${user.role};path=/;max-age=${7 * 24 * 3600};SameSite=Lax`;
        document.cookie = `fitlynutri-auth=1;path=/;max-age=${7 * 24 * 3600};SameSite=Lax`;

        toast.success('Login realizado com sucesso!');
        router.replace('/dashboard');
      } catch (error) {
        toast.error('Não foi possível concluir o login com o Google.');
        router.replace('/login');
      }
    })();
  }, [searchParams, router, setTokens, setUser]);

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm text-gray-300">Entrando com o Google...</p>
      </div>
    </div>
  );
}
