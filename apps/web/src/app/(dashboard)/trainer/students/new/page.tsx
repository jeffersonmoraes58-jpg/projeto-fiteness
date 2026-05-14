'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChevronLeft, Search, UserPlus, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
type Mode = 'search' | 'create';

function getTenantId(): string | undefined {
  try {
    const storage = localStorage.getItem('fitsaas-auth');
    if (storage) {
      const { state } = JSON.parse(storage);
      const token = state?.accessToken;
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.tenantId;
      }
    }
  } catch {}
  return undefined;
}

export default function NewStudentPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('search');
  const [error, setError] = useState('');

  // -- Search mode state --
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [monthlyFee, setMonthlyFee] = useState('');

  // -- Create mode state --
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [createFee, setCreateFee] = useState('');

  const { data: results, isFetching } = useQuery({
    queryKey: ['user-search', search],
    queryFn: () =>
      api.get(`/admin/users?search=${encodeURIComponent(search)}&role=STUDENT`).then((r) => r.data.data?.users || []),
    enabled: mode === 'search' && search.length >= 2,
  });

  const linkMutation = useMutation({
    mutationFn: (data: any) => api.post('/trainers/me/students', data),
    onSuccess: () => router.push('/trainer/students'),
    onError: (e: any) => setError(e.message || e.response?.data?.message || 'Erro ao adicionar aluno'),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const tenantId = getTenantId();
      if (!tenantId) throw new Error('Sessão inválida. Faça login novamente.');
      const reg = await api.post('/auth/register', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        role: 'STUDENT',
        tenantId,
      });
      const newUserId = reg.data.data?.user?.id;
      if (!newUserId) throw new Error('Usuário criado mas ID não retornado');
      await api.post('/trainers/me/students', {
        studentUserId: newUserId,
        monthlyFee: data.monthlyFee ? Number(data.monthlyFee) : undefined,
      });
    },
    onSuccess: () => router.push('/trainer/students'),
    onError: (e: any) => setError(e.message || 'Erro ao criar aluno'),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { setError('Selecione um aluno'); return; }
    setError('');
    linkMutation.mutate({
      studentUserId: selected.id,
      monthlyFee: monthlyFee ? Number(monthlyFee) : undefined,
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) { setError('Nome e sobrenome são obrigatórios'); return; }
    if (!email.trim()) { setError('E-mail é obrigatório'); return; }
    if (password.length < 8) { setError('Senha deve ter ao menos 8 caracteres'); return; }
    setError('');
    createMutation.mutate({ firstName, lastName, email, password, phone, monthlyFee: createFee });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/trainer/students"
          className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-accent transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Adicionar Aluno</h1>
          <p className="text-muted-foreground text-sm">Vincule um aluno existente ou crie uma conta nova</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="glass rounded-2xl p-1 flex gap-1">
        <button
          onClick={() => { setMode('search'); setError(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
            mode === 'search' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'
          }`}
        >
          <Search className="w-4 h-4" />
          Buscar existente
        </button>
        <button
          onClick={() => { setMode('create'); setError(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
            mode === 'create' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Criar novo
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'search' ? (
          <motion.form
            key="search"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onSubmit={handleSearch}
            className="space-y-6"
          >
            <div className="glass-card space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Buscar por nome ou e-mail
              </h2>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
                  placeholder="Ex: Pedro ou student@demo.com..."
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
                          selected?.id === user.id
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-accent'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user.profile?.firstName?.[0]}{user.profile?.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">
                            {user.profile?.firstName} {user.profile?.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                        {selected?.id === user.id && (
                          <UserCheck className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="glass rounded-xl p-4 text-center text-sm text-muted-foreground">
                      Nenhum aluno encontrado. Use a aba "Criar novo" para cadastrar.
                    </div>
                  )}
                </div>
              )}

              {search.length < 2 && (
                <p className="text-xs text-muted-foreground">Digite pelo menos 2 caracteres para buscar</p>
              )}
            </div>

            {selected && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card space-y-3">
                <h2 className="font-semibold">Mensalidade</h2>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Valor (R$) — opcional</label>
                  <input
                    type="number"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                    placeholder="Ex: 150"
                    className="input-field"
                    min={0}
                  />
                </div>
              </motion.div>
            )}

            {error && (
              <div className="glass rounded-xl p-4 border border-red-500/20 text-red-400 text-sm">{error}</div>
            )}

            <div className="flex gap-3">
              <Link href="/trainer/students" className="btn-secondary flex-1 text-center">Cancelar</Link>
              <button
                type="submit"
                disabled={!selected || linkMutation.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {linkMutation.isPending ? 'Adicionando...' : 'Adicionar aluno'}
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.form
            key="create"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onSubmit={handleCreate}
            className="space-y-6"
          >
            <div className="glass-card space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                Dados do novo aluno
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nome *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex: João"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Sobrenome *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ex: Silva"
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">E-mail *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aluno@email.com"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Senha provisória *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mín. 8 caracteres"
                  className="input-field"
                  minLength={8}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Telefone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Mensalidade (R$)</label>
                <input
                  type="number"
                  value={createFee}
                  onChange={(e) => setCreateFee(e.target.value)}
                  placeholder="Ex: 150"
                  className="input-field"
                  min={0}
                />
              </div>
            </div>

            {error && (
              <div className="glass rounded-xl p-4 border border-red-500/20 text-red-400 text-sm">{error}</div>
            )}

            <div className="flex gap-3">
              <Link href="/trainer/students" className="btn-secondary flex-1 text-center">Cancelar</Link>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {createMutation.isPending ? 'Criando...' : 'Criar e vincular'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
