'use client';

import { useState } from 'react';
import { ChevronLeft, Search, UserPlus, UserCheck, Info, MessageCircle, Mail, Copy, Check, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth';

type Mode = 'create' | 'search';

const GRUPOS = ['Online', 'Presencial', 'Híbrido', 'Domiciliar'];
const GENEROS = ['Masculino', 'Feminino', 'Outro', 'Prefiro não dizer'];
const ANAMNESE_OPTIONS = [
  { value: 'Anamnese Geral', label: 'Anamnese Geral' },
  { value: 'Anamnese Fitness', label: 'Anamnese Fitness' },
  { value: 'Anamnese Nutricional', label: 'Anamnese Nutricional' },
  { value: 'Anamnese de Saúde', label: 'Anamnese de Saúde' },
];

function generatePassword(len = 10) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function getTenantId(): string | undefined {
  try {
    const storage = localStorage.getItem('fitlynutri-auth');
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

function FormField({ label, required, children, hint, error }: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string; error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-primary flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {hint}
        </p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface CreatedStudent {
  name: string;
  email: string;
  password: string;
  whatsapp: string;
  anamnese: string;
  emailSent: boolean;
}

export default function NewStudentPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mode, setMode] = useState<Mode>('create');
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreatedStudent | null>(null);
  const [copied, setCopied] = useState(false);

  // Create form
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [grupo, setGrupo] = useState('Online');
  const [dataNascimento, setDataNascimento] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [genero, setGenero] = useState('Masculino');
  const [enviarAcesso, setEnviarAcesso] = useState('Sim');
  const [enviarAnamnese, setEnviarAnamnese] = useState('Não');
  const [anamnese, setAnamnese] = useState('');
  const [bloquearInadimplentes, setBloquearInadimplentes] = useState('Não');
  const [mensalidade, setMensalidade] = useState('');
  const [anamneseError, setAnamneseError] = useState(false);

  // Search form
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [searchFee, setSearchFee] = useState('');

  const { data: results, isFetching } = useQuery({
    queryKey: ['user-search', search],
    queryFn: () =>
      api.get(`/admin/users?search=${encodeURIComponent(search)}&role=STUDENT`).then((r) => r.data.data?.users || []),
    enabled: mode === 'search' && search.length >= 2,
  });

  const linkMutation = useMutation({
    mutationFn: (data: any) => api.post('/trainers/me/students', data),
    onSuccess: () => router.push('/trainer/students'),
    onError: (e: any) => setError(e.response?.data?.message || e.message || 'Erro ao adicionar aluno'),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const tenantId = getTenantId();
      if (!tenantId) throw new Error('Sessão inválida. Faça login novamente.');
      const parts = data.nomeCompleto.trim().split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || '-';
      const tempPassword = generatePassword();
      const reg = await api.post('/auth/register', {
        firstName,
        lastName,
        email: data.email,
        password: tempPassword,
        phone: data.whatsapp ? `+55${data.whatsapp.replace(/\D/g, '')}` : undefined,
        role: 'STUDENT',
        tenantId,
      });
      const newUserId = reg.data.data?.user?.id;
      if (!newUserId) throw new Error('Usuário criado mas ID não retornado');
      await api.post('/trainers/me/students', {
        studentUserId: newUserId,
        monthlyFee: data.mensalidade ? Number(data.mensalidade) : undefined,
        goalType: data.grupo,
      });

      // Send welcome email
      let emailSent = false;
      if (data.enviarAcesso === 'Sim') {
        try {
          const trainerName = `${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`.trim() || 'Seu personal';
          const res = await api.post('/auth/send-welcome', {
            to: data.email,
            studentName: firstName,
            trainerName,
            tempPassword,
            anamneseType: data.enviarAnamnese === 'Sim' ? data.anamnese : undefined,
            studentUserId: newUserId,
          });
          emailSent = res.data?.data?.sent === true;
        } catch {}
      }

      return { tempPassword, emailSent };
    },
    onSuccess: (result, variables) => {
      setCreated({
        name: variables.nomeCompleto,
        email: variables.email,
        password: result.tempPassword,
        whatsapp: variables.whatsapp,
        anamnese: variables.anamnese,
        emailSent: result.emailSent,
      });
    },
    onError: (e: any) => setError(e.response?.data?.message || e.message || 'Erro ao criar aluno'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setAnamneseError(false);
    if (!nomeCompleto.trim()) { setError('Nome completo é obrigatório'); return; }
    if (!email.trim()) { setError('E-mail é obrigatório'); return; }
    if (enviarAnamnese === 'Sim' && !anamnese) { setAnamneseError(true); setError('Escolha a anamnese a enviar'); return; }
    setError('');
    createMutation.mutate({ nomeCompleto, email, grupo, dataNascimento, whatsapp, genero, enviarAcesso, enviarAnamnese, anamnese, bloquearInadimplentes, mensalidade });
  };

  const handleLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { setError('Selecione um aluno'); return; }
    setError('');
    linkMutation.mutate({ studentUserId: selected.id, monthlyFee: searchFee ? Number(searchFee) : undefined });
  };

  const copyCredentials = () => {
    if (!created) return;
    navigator.clipboard.writeText(`E-mail: ${created.email}\nSenha: ${created.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappLink = (c: CreatedStudent) => {
    const phone = `55${c.whatsapp.replace(/\D/g, '')}`;
    const frontendUrl = 'https://fitlynutri.com.br';
    const msg = [
      `Olá, ${c.name.split(' ')[0]}! 👋`,
      ``,
      `Seu cadastro na plataforma *Fitlynutri* foi criado com sucesso!`,
      ``,
      `📧 E-mail: ${c.email}`,
      `🔑 Senha temporária: *${c.password}*`,
      ``,
      `Acesse: ${frontendUrl}/login`,
      ``,
      c.anamnese ? `📋 Sua anamnese *${c.anamnese}* está aguardando resposta após o login.` : '',
      ``,
      `Qualquer dúvida, estou à disposição! 💪`,
    ].filter((l) => l !== undefined).join('\n');
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  // Success screen
  if (created) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          {/* Success header */}
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold">Aluno cadastrado!</h1>
            <p className="text-muted-foreground text-sm mt-1">{created.name} foi adicionado com sucesso.</p>
          </div>

          {/* Credentials card */}
          <div className="glass-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Dados de acesso gerados</h2>
              <button
                onClick={copyCredentials}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-muted/50 rounded-xl px-4 py-3">
                <div className="text-xs text-muted-foreground mb-1">E-mail (login)</div>
                <div className="text-sm font-medium">{created.email}</div>
              </div>
              <div className="bg-muted/50 rounded-xl px-4 py-3">
                <div className="text-xs text-muted-foreground mb-1">Senha temporária</div>
                <div className="text-lg font-bold tracking-widest font-mono text-primary">{created.password}</div>
              </div>
            </div>

            {/* Email status */}
            <div className={cn(
              'flex items-center gap-2 text-xs px-3 py-2 rounded-lg',
              created.emailSent ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400',
            )}>
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              {created.emailSent
                ? `E-mail enviado para ${created.email}`
                : 'E-mail não enviado (configure o SMTP nas configurações)'}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {created.whatsapp && (
              <a
                href={whatsappLink(created)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-sm transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar dados pelo WhatsApp
              </a>
            )}

            <button
              onClick={() => router.push('/trainer/students')}
              className="btn-secondary w-full text-sm py-3"
            >
              Ver lista de alunos
            </button>

            <button
              onClick={() => {
                setCreated(null);
                setNomeCompleto(''); setEmail(''); setGrupo('Online');
                setDataNascimento(''); setWhatsapp(''); setGenero('Masculino');
                setEnviarAcesso('Sim'); setEnviarAnamnese('Não'); setAnamnese('');
                setBloquearInadimplentes('Não'); setMensalidade('');
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
            >
              Cadastrar outro aluno
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/trainer/students" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Link>
      </div>
      <h1 className="text-2xl font-bold">Adicionar novo aluno</h1>

      {/* Mode tabs */}
      <div className="glass rounded-2xl p-1 flex gap-1">
        <button
          type="button"
          onClick={() => { setMode('create'); setError(''); }}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all',
            mode === 'create' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground')}
        >
          <UserPlus className="w-4 h-4" />
          Criar novo
        </button>
        <button
          type="button"
          onClick={() => { setMode('search'); setError(''); }}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all',
            mode === 'search' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground')}
        >
          <Search className="w-4 h-4" />
          Buscar existente
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'create' ? (
          <motion.form key="create" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} onSubmit={handleCreate}>
            <div className="glass-card space-y-4">
              <FormField label="Nome completo" required>
                <input type="text" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} placeholder="Ex: João Silva" className="input-field" required />
              </FormField>

              <FormField label="E-mail" required>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aluno@email.com" className="input-field" required />
              </FormField>

              <FormField label="Selecione um grupo">
                <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="input-field bg-background">
                  {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </FormField>

              <FormField label="Data de nascimento">
                <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} className="input-field" />
              </FormField>

              <FormField label="WhatsApp">
                <div className="flex items-center input-field !p-0 overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-2.5 border-r border-border text-sm text-muted-foreground flex-shrink-0 bg-muted/50 select-none">
                    <span>🇧🇷</span>
                    <span>+55</span>
                  </div>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                  />
                </div>
              </FormField>

              <FormField label="Gênero">
                <select value={genero} onChange={(e) => setGenero(e.target.value)} className="input-field bg-background">
                  {GENEROS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </FormField>

              <FormField label="Mensalidade (R$)">
                <input type="number" value={mensalidade} onChange={(e) => setMensalidade(e.target.value)} placeholder="Ex: 150" className="input-field" min={0} />
              </FormField>

              <FormField label="Enviar informações de acesso ao aluno">
                <select value={enviarAcesso} onChange={(e) => setEnviarAcesso(e.target.value)} className="input-field bg-background">
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
              </FormField>

              <FormField label="Enviar anamnese">
                <select value={enviarAnamnese} onChange={(e) => { setEnviarAnamnese(e.target.value); setAnamnese(''); setAnamneseError(false); }} className="input-field bg-background">
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
              </FormField>

              <AnimatePresence>
                {enviarAnamnese === 'Sim' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <FormField label="Escolha a anamnese" required error={anamneseError ? 'Esse campo é obrigatório' : undefined}>
                      <select
                        value={anamnese}
                        onChange={(e) => { setAnamnese(e.target.value); setAnamneseError(false); }}
                        className={cn('input-field bg-background', anamneseError && 'border-red-500/50')}
                      >
                        <option value="">Selecione</option>
                        {ANAMNESE_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </FormField>
                  </motion.div>
                )}
              </AnimatePresence>

              <FormField
                label="Bloquear acesso de inadimplentes"
                hint="Esse bloqueio irá acontecer apenas se você utilizar o app para receber desse aluno"
              >
                <select value={bloquearInadimplentes} onChange={(e) => setBloquearInadimplentes(e.target.value)} className="input-field bg-background">
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
              </FormField>
            </div>

            {error && <div className="mt-4 glass rounded-xl p-3 border border-red-500/20 text-red-400 text-sm">{error}</div>}

            <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50">
              {createMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </motion.form>
        ) : (
          <motion.form key="search" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} onSubmit={handleLink}>
            <div className="glass-card space-y-4">
              <FormField label="Buscar por nome ou e-mail">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setSelected(null); }} placeholder="Ex: Pedro ou pedro@email.com" className="input-field pl-9" />
                </div>
              </FormField>

              {search.length >= 2 && (
                <div className="space-y-1">
                  {isFetching ? (
                    <div className="glass rounded-xl p-4 text-center text-sm text-muted-foreground">Buscando...</div>
                  ) : results?.length > 0 ? (
                    results.map((u: any) => (
                      <button key={u.id} type="button" onClick={() => setSelected(u)}
                        className={cn('w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left',
                          selected?.id === u.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-accent')}>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {u.profile?.firstName?.[0]}{u.profile?.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{u.profile?.firstName} {u.profile?.lastName}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                        {selected?.id === u.id && <UserCheck className="w-4 h-4 text-primary" />}
                      </button>
                    ))
                  ) : (
                    <div className="glass rounded-xl p-4 text-center text-sm text-muted-foreground">Nenhum aluno encontrado. Use "Criar novo".</div>
                  )}
                </div>
              )}

              {selected && (
                <FormField label="Mensalidade (R$)">
                  <input type="number" value={searchFee} onChange={(e) => setSearchFee(e.target.value)} placeholder="Ex: 150" className="input-field" min={0} />
                </FormField>
              )}
            </div>

            {error && <div className="mt-4 glass rounded-xl p-3 border border-red-500/20 text-red-400 text-sm">{error}</div>}

            <button type="submit" disabled={!selected || linkMutation.isPending} className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50">
              <UserPlus className="w-4 h-4" />
              {linkMutation.isPending ? 'Adicionando...' : 'Adicionar aluno'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
