'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, ChevronLeft, Search, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function NewPatientPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [monthlyFee, setMonthlyFee] = useState('');
  const [error, setError] = useState('');

  const { data: results, isFetching } = useQuery({
    queryKey: ['user-search', search],
    queryFn: () => api.get(`/admin/users?search=${search}&role=STUDENT`).then((r) => r.data.data?.users || []),
    enabled: search.length >= 2,
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post('/nutritionists/me/patients', data),
    onSuccess: () => router.push('/nutritionist/patients'),
    onError: (e: any) => setError(e.response?.data?.message || 'Erro ao adicionar paciente'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { setError('Selecione um paciente'); return; }
    addMutation.mutate({
      studentUserId: selected.id,
      monthlyFee: monthlyFee ? Number(monthlyFee) : undefined,
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/nutritionist/patients" className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-accent transition-all">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Adicionar Paciente</h1>
          <p className="text-muted-foreground text-sm">Vincule um paciente ao seu acompanhamento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Buscar paciente
          </h2>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
              placeholder="Buscar por nome ou e-mail..."
              className="input-field pl-9"
            />
          </div>

          {search.length >= 2 && (
            <div className="space-y-1">
              {isFetching ? (
                <div className="glass rounded-xl p-4 text-center text-sm text-muted-foreground">Buscando...</div>
              ) : results?.length > 0 ? (
                results.map((user: any) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelected(user)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                      selected?.id === user.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-accent'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {user.profile?.firstName?.[0]}{user.profile?.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{user.profile?.firstName} {user.profile?.lastName}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                    {selected?.id === user.id && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="glass rounded-xl p-4 text-center text-sm text-muted-foreground">
                  Nenhum paciente encontrado
                </div>
              )}
            </div>
          )}

          {search.length < 2 && (
            <p className="text-xs text-muted-foreground">Digite pelo menos 2 caracteres para buscar</p>
          )}
        </motion.div>

        {selected && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card space-y-4">
            <h2 className="font-semibold">Configurações</h2>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Mensalidade (R$)</label>
              <input
                type="number"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                placeholder="Ex: 200"
                className="input-field"
                min={0}
              />
            </div>
          </motion.div>
        )}

        {error && (
          <div className="glass rounded-xl p-4 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/nutritionist/patients" className="btn-secondary flex-1 text-center">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={!selected || addMutation.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            {addMutation.isPending ? 'Adicionando...' : 'Adicionar paciente'}
          </button>
        </div>
      </form>
    </div>
  );
}
