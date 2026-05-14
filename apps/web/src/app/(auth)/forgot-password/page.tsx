'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dumbbell, Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await api.post('/auth/forgot-password', { email: data.email });
    setSentEmail(data.email);
    setSent(true);
  };

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
          {!sent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="glass-card"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <Mail className="w-6 h-6 text-primary" />
              </div>

              <h1 className="text-2xl font-bold mb-1">Esqueceu a senha?</h1>
              <p className="text-muted-foreground text-sm mb-6">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="seu@email.com"
                    className="input-field"
                    autoComplete="email"
                    autoFocus
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
                  ) : (
                    'Enviar link de redefinição'
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

              <h1 className="text-xl font-bold mb-2">Verifique seu e-mail</h1>
              <p className="text-muted-foreground text-sm mb-1">
                Enviamos as instruções para:
              </p>
              <p className="font-medium mb-6">{sentEmail}</p>

              <p className="text-xs text-muted-foreground mb-6">
                Não recebeu? Verifique a pasta de spam ou{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-primary hover:underline"
                >
                  tente outro e-mail
                </button>.
              </p>

              <Link href="/login" className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                <ArrowLeft className="w-4 h-4" />
                Voltar para o login
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
