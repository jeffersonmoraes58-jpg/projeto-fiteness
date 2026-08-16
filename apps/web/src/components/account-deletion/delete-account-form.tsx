'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export function DeleteAccountForm() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isLoggedIn = !!user;
  const canConfirm = confirmText.toLowerCase() === 'excluir';

  const handleDelete = async () => {
    if (!canConfirm) return;
    setIsDeleting(true);
    try {
      await api.delete('/auth/me');
      useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
      delete api.defaults.headers.Authorization;
      document.cookie = 'fitlynutri-role=;path=/;max-age=0';
      document.cookie = 'fitlynutri-auth=;path=/;max-age=0';
      toast.success('Conta excluída com sucesso. Todos os seus dados foram removidos.');
      router.replace('/');
    } catch (error: any) {
      toast.error(error?.message || 'Não foi possível excluir a conta. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Você precisa estar logado para excluir sua conta.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all"
        >
          Fazer login
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
      <p className="text-sm text-muted-foreground">
        Esta ação é <strong className="text-foreground">irreversível</strong>. Todos os seus dados,
        treinos, dietas, mensagens e histórico serão excluídos permanentemente. Digite{' '}
        <strong className="text-destructive">&quot;excluir&quot;</strong> para confirmar.
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="digite: excluir"
        className="w-full py-3 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        onClick={handleDelete}
        disabled={!canConfirm || isDeleting}
        className="w-full py-3 px-4 rounded-xl bg-destructive text-white font-medium hover:bg-destructive/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isDeleting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
        {isDeleting ? 'Excluindo conta...' : 'Excluir minha conta definitivamente'}
      </button>
    </div>
  );
}
