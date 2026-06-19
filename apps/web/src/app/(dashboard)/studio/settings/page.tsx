'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Save, LogOut, Building2, Mail } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function StudioSettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const { data } = useQuery<any>({
    queryKey: ['studio-overview'],
    queryFn: () => api.get('/tenants/my/overview').then((r) => r.data.data ?? r.data),
  });

  useEffect(() => {
    if (data?.tenant?.name && !editing) setName(data.tenant.name);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => api.patch('/users/me', { studioName: name }),
    onSuccess: () => { toast.success('Configurações salvas!'); setEditing(false); },
    onError: () => toast.error('Erro ao salvar'),
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold">Configurações</h1>
        </div>
        {!editing ? (
          <button onClick={() => { setName(data?.tenant?.name ?? ''); setEditing(true); }} className="btn-secondary text-sm py-2">
            Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary text-sm py-2 flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
        <h2 className="font-semibold mb-4">Dados do Studio</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 py-2">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Nome do Studio</div>
              {editing ? (
                <input value={name} onChange={(e) => setName(e.target.value)} className="input-field mt-1" />
              ) : (
                <div className="text-sm font-medium">{data?.tenant?.name ?? '—'}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 py-2">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <Mail className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">E-mail</div>
              <div className="text-sm font-medium">{user?.email}</div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <button onClick={() => logout()} className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl glass text-destructive hover:bg-destructive/10 transition-all font-medium">
          <LogOut className="w-4 h-4" />
          Sair da conta
        </button>
      </motion.div>
    </div>
  );
}
