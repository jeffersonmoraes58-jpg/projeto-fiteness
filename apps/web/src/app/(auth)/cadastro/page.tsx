'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dumbbell, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Link2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

function CadastroConvite() {
  const params = useSearchParams();
  const token = params.get('invite') ?? '';
  const router = useRouter();
  const { register: authRegister, isLoading, login: authLogin } = useAuthStore();

  const [trainerName, setTrainerName] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [validating, setValidating] = useState(true);

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Existing account detection
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [existingAccount, setExistingAccount] = useState<boolean | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkPassword, setLinkPassword] = useState('');
  const [showLinkPwd, setShowLinkPwd] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!token) { setTokenError('Link de convite inválido ou ausente.'); setValidating(false); return; }
    api.get(`/auth/invite/validate?token=${token}`)
      .then((r) => { const d = r.data.data ?? r.data; setTrainerName(d.trainerName); setTenantId(d.tenantId); })
      .catch(() => setTokenError('Este link é inválido ou já expirou. Solicite um novo link ao seu personal.'))
      .finally(() => setValidating(false));
  }, [token]);

  // Debounced email check
  useEffect(() => {
    if (linkMode || !form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setExistingAccount(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setEmailCheckLoading(true);
      try {
        const res = await api.post('/auth/invite/check-email', { email: form.email });
        const exists = res.data.data?.exists ?? res.data.exists;
        setExistingAccount(exists);
      } catch {
        setExistingAccount(null);
      } finally {
        setEmailCheckLoading(false);
      }
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.email, linkMode]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim() || form.firstName.trim().length < 2) errs.firstName = 'Nome muito curto';
    if (!form.lastName.trim() || form.lastName.trim().length < 2) errs.lastName = 'Sobrenome muito curto';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'E-mail inválido';
    if (form.password.length < 8) errs.password = 'Mínimo 8 caracteres';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'As senhas não coincidem';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await authRegister({
        email: form.email,
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone || undefined,
        tenantId,
        inviteToken: token,
      } as any);
      toast.success('Conta criada! Bem-vindo ao Fitlynutri');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao criar conta. Tente novamente.');
    }
  }

  async function handleLinkExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !linkPassword) {
      toast.error('Preencha email e senha');
      return;
    }
    setLinkLoading(true);
    try {
      const res = await api.post('/auth/invite/link-existing', {
        email: form.email,
        password: linkPassword,
        inviteToken: token,
      });
      const data = res.data.data ?? res.data;

      if (data.alreadyLinked) {
        toast.success('Você já está vinculado a este personal!');
        router.push('/login');
        return;
      }

      // Login automático: salvar tokens e redirecionar
      if (data.accessToken) {
        const authStorage = JSON.parse(localStorage.getItem('fitlynutri-auth') || '{}');
        localStorage.setItem('fitlynutri-auth', JSON.stringify({
          state: {
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
          },
        }));
        toast.success('Conta vinculada com sucesso!');
        router.push('/dashboard');
      } else {
        toast.success('Vínculo criado! Faça login para continuar.');
        router.push('/login');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao vincular conta. Verifique suas credenciais.');
    } finally {
      setLinkLoading(false);
    }
  }

  const field = (id: string, label: string, type: string, placeholder: string, extra?: React.ReactNode) => (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={(form as any)[id]}
        onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
        className="input-field"
        autoComplete={id === 'password' || id === 'confirmPassword' ? 'new-password' : id}
      />
      {extra}
      {errors[id] && <p className="text-xs text-destructive mt-1">{errors[id]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold gradient-text">Fitlynutri</span>
        </div>

        {validating ? (
          <div className="glass-card flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Validando convite...</p>
          </div>
        ) : tokenError ? (
          <div className="glass-card text-center">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="font-bold text-lg mb-2">Link inválido</h2>
            <p className="text-sm text-muted-foreground mb-6">{tokenError}</p>
            <Link href="/login" className="btn-primary w-full flex items-center justify-center">
              Ir para o login
            </Link>
          </div>
        ) : linkMode ? (
          <div className="glass-card">
            {/* Trainer badge */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 mb-6">
              <Link2 className="w-5 h-5 text-violet-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-violet-300">Vincular conta existente</p>
                <p className="text-xs text-muted-foreground">Conecte sua conta ao personal {trainerName}</p>
              </div>
            </div>

            <h1 className="text-xl font-bold mb-1">Entrar na sua conta</h1>
            <p className="text-sm text-muted-foreground mb-5">
              Informe sua senha para vincular ao personal <strong>{trainerName}</strong>
            </p>

            <form onSubmit={handleLinkExisting} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  disabled
                  className="input-field opacity-70 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Senha</label>
                <div className="relative">
                  <input
                    type={showLinkPwd ? 'text' : 'password'}
                    placeholder="Sua senha"
                    value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)}
                    className="input-field pr-12"
                    autoComplete="current-password"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowLinkPwd(!showLinkPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showLinkPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={linkLoading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                {linkLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Vinculando...</> : 'Vincular minha conta'}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Sua conta não existe?{' '}
              <button onClick={() => { setLinkMode(false); setExistingAccount(null); setLinkPassword(''); }} className="text-primary hover:underline">
                Criar nova conta
              </button>
            </p>
          </div>
        ) : (
          <div className="glass-card">
            {/* Trainer badge */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 mb-6">
              <CheckCircle2 className="w-5 h-5 text-violet-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-violet-300">Convite de {trainerName}</p>
                <p className="text-xs text-muted-foreground">Crie sua conta e comece a treinar agora</p>
              </div>
            </div>

            <h1 className="text-xl font-bold mb-1">Criar sua conta</h1>
            <p className="text-sm text-muted-foreground mb-5">Preencha seus dados para se cadastrar</p>

            {/* Existing account banner */}
            {existingAccount === true && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-400">Você já possui conta</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este e-mail já está cadastrado no Fitlynutri. Vincule sua conta existente ao personal {trainerName}.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setLinkMode(true); setExistingAccount(null); }}
                    className="mt-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Vincular conta existente →
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {field('firstName', 'Nome', 'text', 'João')}
                {field('lastName', 'Sobrenome', 'text', 'Silva')}
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="input-field pr-10"
                    autoComplete="email"
                  />
                  {emailCheckLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {existingAccount === true && !emailCheckLoading && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                  )}
                  {existingAccount === false && !emailCheckLoading && form.email && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  )}
                </div>
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              {field('phone', 'Telefone (opcional)', 'tel', '(11) 99999-9999')}

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Senha</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="input-field pr-12"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Confirmar senha</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    value={form.confirmPassword}
                    onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    className="input-field pr-12"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Criando conta...</> : 'Criar conta'}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Já tem conta?{' '}
              <button onClick={() => { setLinkMode(true); setExistingAccount(null); }} className="text-primary hover:underline">
                Vincular conta existente
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense>
      <CadastroConvite />
    </Suspense>
  );
}
