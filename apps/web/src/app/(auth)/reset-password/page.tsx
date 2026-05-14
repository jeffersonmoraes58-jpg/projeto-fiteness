'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dumbbell, Loader2, Eye, EyeOff,
  CheckCircle2, AlertCircle, ArrowLeft, KeyRound,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const schema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

const STRENGTH_RULES = [
  { label: 'Mínimo 8 caracteres', test: (v: string) => v.length >= 8 },
  { label: 'Letra maiúscula', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Letra minúscula', test: (v: string) => /[a-z]/.test(v) },
  { label: 'Número', test: (v: string) => /\d/.test(v) },
];

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [done, setDone] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const passwordValue = watch('password') || '';
  const strengthScore = STRENGTH_RULES.filter((r) => r.test(passwordValue)).length;
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500'];
  const strengthLabels = ['Fraca', 'Razoável', 'Boa', 'Forte'];

  useEffect(() => {
    if (!token) router.replace('/forgot-password');
  }, [token, router]);

  const onSubmit = async (data: FormData) => {
    setApiError('');
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      setDone(true);
    } catch (err: any) {
      setApiError(err?.response?.data?.message || 'Token inválido ou expirado. Solicite um novo link.');
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-brand rounded-xl flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">FitSaaS</span>
          </Link>
        </div>

        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="glass-card"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>

              <h1 className="text-2xl font-bold mb-1">Criar nova senha</h1>
              <p className="text-muted-foreground text-sm mb-6">
                Sua nova senha deve ser diferente das anteriores.
              </p>

              {apiError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 mb-4">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-xs text-destructive">{apiError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nova senha</label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      className="input-field pr-12"
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
                  )}

                  {/* Strength meter */}
                  {passwordValue.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={cn(
                              'flex-1 h-1 rounded-full transition-all',
                              i < strengthScore ? strengthColors[strengthScore - 1] : 'bg-white/10',
                            )}
                          />
                        ))}
                      </div>
                      <p className={cn('text-xs', strengthScore >= 3 ? 'text-emerald-400' : 'text-muted-foreground')}>
                        Força: {strengthLabels[strengthScore - 1] || 'Muito fraca'}
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {STRENGTH_RULES.map((r) => (
                          <div key={r.label} className="flex items-center gap-1">
                            <div className={cn(
                              'w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0',
                              r.test(passwordValue) ? 'bg-emerald-500/20' : 'bg-white/5',
                            )}>
                              {r.test(passwordValue) && (
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              )}
                            </div>
                            <span className={cn('text-[10px]', r.test(passwordValue) ? 'text-emerald-400' : 'text-muted-foreground')}>
                              {r.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Confirmar senha</label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword')}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repita a nova senha"
                      className="input-field pr-12"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Redefinindo...</>
                  ) : (
                    'Redefinir senha'
                  )}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar para o login
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>

              <h1 className="text-xl font-bold mb-2">Senha redefinida!</h1>
              <p className="text-muted-foreground text-sm mb-8">
                Sua senha foi alterada com sucesso. Todas as sessões ativas foram encerradas por segurança.
              </p>

              <Link href="/login" className="btn-primary w-full flex items-center justify-center gap-2">
                Fazer login
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
