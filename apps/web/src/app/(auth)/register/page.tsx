'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye, EyeOff, Dumbbell, Loader2, Apple,
  Users, Shield, ChevronRight, ChevronLeft, Check,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const ROLES = [
  {
    value: 'STUDIO_OWNER',
    label: 'Proprietário de Studio',
    description: 'Gerencie seu studio, trainers e alunos',
    icon: Shield,
    color: 'from-yellow-500 to-amber-500',
  },
  {
    value: 'TRAINER',
    label: 'Personal Trainer',
    description: 'Crie treinos e acompanhe seus alunos',
    icon: Dumbbell,
    color: 'from-purple-500 to-indigo-500',
  },
  {
    value: 'NUTRITIONIST',
    label: 'Nutricionista',
    description: 'Monte dietas e acompanhe pacientes',
    icon: Apple,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    value: 'STUDENT',
    label: 'Aluno',
    description: 'Acesse treinos, dietas e evolua',
    icon: Users,
    color: 'from-cyan-500 to-blue-500',
  },
];

const step1Schema = z.object({
  role: z.string().min(1, 'Selecione um perfil'),
});

const step2Schema = z.object({
  firstName: z.string().min(2, 'Nome muito curto'),
  lastName: z.string().min(2, 'Sobrenome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
  studioName: z.string().optional(),
  tenantId: z.string().optional(),
  phone: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type Step2Data = z.infer<typeof step2Schema>;

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register: authRegister, isLoading } = useAuthStore();
  const router = useRouter();

  const { register, handleSubmit, formState: { errors }, watch } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
  });

  const isStudioOwner = selectedRole === 'STUDIO_OWNER';
  const needsTenantId = selectedRole === 'TRAINER' || selectedRole === 'NUTRITIONIST' || selectedRole === 'STUDENT';

  const onSubmit = async (data: Step2Data) => {
    try {
      await authRegister({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        role: selectedRole,
        ...(isStudioOwner ? { studioName: data.studioName } : { tenantId: data.tenantId }),
      });
      toast.success('Conta criada com sucesso!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao criar conta');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-purple-600/25 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-cyan-600/25 rounded-full blur-[100px]" />
        </div>
        <div className="relative text-center p-12 max-w-md">
          <Link href="/" className="flex items-center justify-center gap-3 mb-10">
            <div className="w-12 h-12 bg-gradient-brand rounded-2xl flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold gradient-text">FitSaaS</span>
          </Link>
          <h1 className="text-3xl font-bold mb-4">A plataforma fitness mais completa</h1>
          <p className="text-muted-foreground">
            Gerencie treinos, dietas, alunos e resultados em um só lugar.
          </p>
          <div className="mt-10 space-y-3">
            {['IA para personalizar treinos', 'Chat em tempo real', 'Gamificação e conquistas', 'Relatórios e analytics'].map((f) => (
              <div key={f} className="flex items-center gap-3 glass rounded-xl p-3 text-sm text-left">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-brand rounded-lg flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">FitSaaS</span>
            </Link>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  step >= s ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-muted-foreground',
                )}>
                  {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
                {s < 2 && <div className={cn('h-px w-12 transition-all', step > s ? 'bg-primary' : 'bg-white/10')} />}
              </div>
            ))}
            <span className="text-xs text-muted-foreground ml-2">
              {step === 1 ? 'Escolha seu perfil' : 'Seus dados'}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-bold mb-1">Como você vai usar o FitSaaS?</h2>
                <p className="text-muted-foreground text-sm mb-6">Escolha o perfil que melhor descreve você</p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setSelectedRole(r.value)}
                      className={cn(
                        'p-4 rounded-2xl border-2 text-left transition-all hover:bg-accent',
                        selectedRole === r.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card',
                      )}
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center mb-3`}>
                        <r.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="font-semibold text-sm">{r.label}</div>
                      <div className="text-xs text-muted-foreground mt-1 leading-tight">{r.description}</div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => { if (selectedRole) setStep(2); }}
                  disabled={!selectedRole}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Continuar
                  <ChevronRight className="w-4 h-4" />
                </button>

                <p className="text-center text-sm text-muted-foreground mt-4">
                  Já tem conta?{' '}
                  <Link href="/login" className="text-primary hover:underline">Entrar</Link>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </button>

                <h2 className="text-2xl font-bold mb-1">Criar sua conta</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Perfil: <span className="text-foreground font-medium">{ROLES.find((r) => r.value === selectedRole)?.label}</span>
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                      <input {...register('firstName')} placeholder="João" className="input-field" autoComplete="given-name" />
                      {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName.message}</p>}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Sobrenome</label>
                      <input {...register('lastName')} placeholder="Silva" className="input-field" autoComplete="family-name" />
                      {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
                    <input {...register('email')} type="email" placeholder="seu@email.com" className="input-field" autoComplete="email" />
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Telefone (opcional)</label>
                    <input {...register('phone')} type="tel" placeholder="(11) 99999-9999" className="input-field" autoComplete="tel" />
                  </div>

                  {isStudioOwner && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Nome do Studio / Academia</label>
                      <input {...register('studioName')} placeholder="Studio FitPro" className="input-field" />
                      {errors.studioName && <p className="text-xs text-destructive mt-1">{errors.studioName.message}</p>}
                    </div>
                  )}

                  {needsTenantId && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">ID do Studio (fornecido pelo proprietário)</label>
                      <input {...register('tenantId')} placeholder="ex: abc123-def456" className="input-field" />
                      {errors.tenantId && <p className="text-xs text-destructive mt-1">{errors.tenantId.message}</p>}
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Senha</label>
                    <div className="relative">
                      <input
                        {...register('password')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 8 caracteres"
                        className="input-field pr-12"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Confirmar senha</label>
                    <div className="relative">
                      <input
                        {...register('confirmPassword')}
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Repita a senha"
                        className="input-field pr-12"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Ao criar sua conta, você concorda com os{' '}
                    <Link href="/terms" className="text-primary hover:underline">Termos de Uso</Link>{' '}
                    e a{' '}
                    <Link href="/privacy" className="text-primary hover:underline">Política de Privacidade</Link>.
                  </p>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Criando conta...</>
                    ) : (
                      'Criar conta grátis'
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
