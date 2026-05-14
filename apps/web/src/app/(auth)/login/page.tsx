'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Dumbbell, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      toast.success('Login realizado com sucesso!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error?.message || 'Credenciais inválidas');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex">
      {/* Left side - decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/30 rounded-full blur-[80px]" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-600/30 rounded-full blur-[80px]" />
        </div>
        <div className="relative text-center p-12">
          <Link href="/" className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-brand rounded-2xl flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold gradient-text">FitSaaS</span>
          </Link>
          <h1 className="text-4xl font-bold mb-4">
            Bem-vindo de volta!
          </h1>
          <p className="text-muted-foreground text-lg max-w-sm mx-auto">
            Continue gerenciando seus alunos com a plataforma fitness mais completa do Brasil.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4 max-w-sm mx-auto">
            {[
              { label: 'Alunos', value: '248' },
              { label: 'Treinos', value: '1.2k' },
              { label: 'Dietas', value: '89' },
              { label: 'Streak', value: '32 dias' },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-4 text-left">
                <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-brand rounded-lg flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">FitSaaS</span>
            </Link>
          </div>

          <h2 className="text-3xl font-bold mb-2">Entrar na conta</h2>
          <p className="text-muted-foreground mb-8">
            Não tem conta?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Cadastre-se grátis
            </Link>
          </p>

          {/* Google login */}
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/google`}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border border-border bg-card hover:bg-accent transition-all mb-6 text-sm font-medium"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
              <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z" />
              <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z" />
              <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
            </svg>
            Continuar com Google
          </a>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-xs text-muted-foreground">ou com email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="seu@email.com"
                className="input-field"
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Senha</label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Esqueci a senha
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-field pr-12"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
