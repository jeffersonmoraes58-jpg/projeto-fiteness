'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, ChevronLeft, Search, UserPlus, Mail, Phone, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function NewPatientPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'search' | 'create'>('create');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [monthlyFee, setMonthlyFee] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [createdPatient, setCreatedPatient] = useState<any>(null);

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  const { data: results, isFetching } = useQuery({
    queryKey: ['user-search', search],
    queryFn: () => api.get(`/nutritionists/me/students/search?search=${search}`).then((r) => r.data.data),
    enabled: search.length >= 2,
  });

  const invalidateAndRedirect = () => {
    queryClient.invalidateQueries({ queryKey: ['nutritionist-patients-list'] });
    router.push('/nutritionist/patients');
  };

  const linkMutation = useMutation({
    mutationFn: (data: any) => api.post('/nutritionists/me/patients', data),
    onSuccess: invalidateAndRedirect,
    onError: (e: any) => setError(e.response?.data?.message || 'Erro ao vincular paciente'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/nutritionists/me/patients/create', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['nutritionist-patients-list'] });
      setCreatedPatient(res.data.data);
    },
    onError: (e: any) => setError(e.response?.data?.message || 'Erro ao criar paciente'),
  });

  const handleLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { setError('Selecione um paciente'); return; }
    linkMutation.mutate({ studentUserId: selected.id, monthlyFee: monthlyFee ? Number(monthlyFee) : undefined });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email) { setError('Nome e e-mail são obrigatórios'); return; }
    setError('');
    createMutation.mutate({ ...form, monthlyFee: monthlyFee ? Number(monthlyFee) : undefined });
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(createdPatient.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (createdPatient) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="glass-card text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold">Paciente criado com sucesso!</h2>
          <p className="text-sm text-muted-foreground">
            A conta de <strong>{createdPatient.profile?.firstName} {createdPatient.profile?.lastName}</strong> foi criada.
            Compartilhe as credenciais abaixo com o paciente.
          </p>
          <div className="glass rounded-xl p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">E-mail</span>
              <span className="font-medium">{createdPatient.email}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Senha temporária</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium">{createdPatient.tempPassword}</span>
                <button onClick={copyPassword} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
              </div>
            </div>
          </div>
          <button onClick={invalidateAndRedirect} className="btn-primary w-full">
            Ver lista de pacientes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/nutritionist/patients" className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-accent transition-all">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Adicionar Paciente</h1>
          <p className="text-muted-foreground text-sm">Crie um novo paciente ou vincule um existente</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 glass p-1 rounded-xl">
        {[
          { key: 'create', label: 'Criar novo paciente' },
          { key: 'search', label: 'Vincular existente' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key as any); setError(''); }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'create' ? (
        <form onSubmit={handleCreate} className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              Dados do paciente
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome *</label>
                <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Pedro" className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Sobrenome</label>
                <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Silva" className="input-field" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">E-mail *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="paciente@email.com" className="input-field pl-9" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Telefone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" className="input-field pl-9" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Mensalidade (R$)</label>
              <input type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="Ex: 200" className="input-field" min={0} />
            </div>
          </motion.div>
          {error && <div className="glass rounded-xl p-4 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          <div className="flex gap-3">
            <Link href="/nutritionist/patients" className="btn-secondary flex-1 text-center">Cancelar</Link>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
              <UserPlus className="w-4 h-4" />
              {createMutation.isPending ? 'Criando...' : 'Criar paciente'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleLink} className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Buscar paciente existente
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setSelected(null); }} placeholder="Buscar por nome ou e-mail..." className="input-field pl-9" />
            </div>
            {search.length >= 2 && (
              <div className="space-y-1">
                {isFetching ? (
                  <div className="glass rounded-xl p-4 text-center text-sm text-muted-foreground">Buscando...</div>
                ) : results?.length > 0 ? (
                  results.map((user: any) => (
                    <button key={user.id} type="button" onClick={() => setSelected(user)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${selected?.id === user.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-accent'}`}>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {user.profile?.firstName?.[0]}{user.profile?.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{user.profile?.firstName} {user.profile?.lastName}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                      {selected?.id === user.id && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white" /></div>}
                    </button>
                  ))
                ) : (
                  <div className="glass rounded-xl p-4 text-center text-sm text-muted-foreground">
                    Nenhum aluno encontrado.{' '}
                    <button type="button" onClick={() => setTab('create')} className="text-primary underline">Criar novo paciente</button>
                  </div>
                )}
              </div>
            )}
            {search.length < 2 && <p className="text-xs text-muted-foreground">Digite pelo menos 2 caracteres para buscar</p>}
            {selected && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Mensalidade (R$)</label>
                <input type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="Ex: 200" className="input-field" min={0} />
              </div>
            )}
          </motion.div>
          {error && <div className="glass rounded-xl p-4 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          <div className="flex gap-3">
            <Link href="/nutritionist/patients" className="btn-secondary flex-1 text-center">Cancelar</Link>
            <button type="submit" disabled={!selected || linkMutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
              <UserPlus className="w-4 h-4" />
              {linkMutation.isPending ? 'Vinculando...' : 'Vincular paciente'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
