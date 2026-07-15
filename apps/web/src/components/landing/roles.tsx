'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Apple, Users, Check, ArrowRight, Info, Clock } from 'lucide-react';

import Link from 'next/link';
import { cn } from '@/lib/utils';

const roles = [
  {
    id: 'trainer',
    label: 'Personal Trainer',
    icon: Dumbbell,
    color: 'from-purple-600 to-indigo-600',
    activeColor: 'bg-purple-600/10 text-purple-400 border-purple-500/30',
    headline: 'Gerencie mais alunos sem trabalhar mais horas',
    description: 'Monte treinos personalizados, acompanhe a evolução de cada aluno, registre avaliações físicas e use a IA para sugerir programações automáticas. Tudo em um único lugar.',
    features: [
      'Biblioteca de exercícios com GIFs e divisão ABCDE',
      'Montagem e envio de treinos pelo painel',
      'Avaliação física com IMC automático',
      'IA que analisa o aluno e sugere treino personalizado',
      'Agenda de sessões com calendário integrado',
      'Cobranças via Pix e cartão (Mercado Pago)',
    ],
    stats: [
      { value: '3x', label: 'mais alunos gerenciados' },
      { value: '2h', label: 'economizadas por dia' },
      { value: '40%', label: 'mais retenção de alunos' },
    ],
    preview: [
      { label: 'Alunos ativos', value: '48', bar: 80, color: 'bg-purple-500' },
      { label: 'Treinos esta semana', value: '124', bar: 65, color: 'bg-indigo-500' },
      { label: 'Avaliações este mês', value: '19', bar: 40, color: 'bg-cyan-500' },
      { label: 'Receita mensal', value: 'R$ 4.2k', bar: 70, color: 'bg-emerald-500' },
    ],
  },
  {
    id: 'nutritionist',
    label: 'Nutricionista',
    icon: Apple,
    color: 'from-emerald-600 to-teal-600',
    activeColor: 'bg-emerald-600/10 text-emerald-400 border-emerald-500/30',
    headline: 'Planos alimentares completos em minutos',
    description: 'Cálculo automático de macros, TMB e GET. Monte dietas detalhadas, acompanhe a aderência dos pacientes e integre com trainers da mesma plataforma.',
    features: [
      'Banco de alimentos com macronutrientes',
      'Cálculo automático de TMB, GET e macros',
      'Planos de refeição por dia da semana',
      'IA que sugere substituições e ajustes calóricos',
      'Acompanhamento de fotos e evolução do paciente',
      'Agenda de consultas e histórico de dietas',
    ],
    stats: [
      { value: '5x', label: 'mais rápido criar dietas' },
      { value: '87%', label: 'de aderência dos pacientes' },
      { value: '60%', label: 'menos tempo administrativo' },
    ],
    preview: [
      { label: 'Pacientes ativos', value: '32', bar: 65, color: 'bg-emerald-500' },
      { label: 'Dietas ativas', value: '28', bar: 55, color: 'bg-teal-500' },
      { label: 'Aderência média', value: '87%', bar: 87, color: 'bg-cyan-500' },
      { label: 'Consultas esta semana', value: '12', bar: 40, color: 'bg-blue-500' },
    ],
  },
  {
    id: 'student',
    label: 'Aluno',
    icon: Users,
    color: 'from-cyan-600 to-blue-600',
    activeColor: 'bg-cyan-600/10 text-cyan-400 border-cyan-500/30',
    headline: 'A experiência fitness que seus alunos merecem',
    description: 'App PWA premium para alunos com treinos detalhados, dieta do dia, evolução visual, gamificação, player de música e chat direto com o profissional.',
    features: [
      'Treinos com séries, reps e cronômetro de descanso',
      'Dieta diária com macros e lista de substituições',
      'Fotos de evolução e gráficos de progresso',
      'Sistema de pontos, conquistas e sequência (streak)',
      'Desafios semanais e metas personalizadas',
      'Chat com o trainer e player de música integrado',
    ],
    stats: [
      { value: '92%', label: 'completam os treinos semanais' },
      { value: '21d', label: 'de streak médio dos alunos' },
      { value: '3x', label: 'mais engajamento vs. planilhas' },
    ],
    preview: [
      { label: 'Sequência atual', value: '21 dias', bar: 70, color: 'bg-cyan-500' },
      { label: 'Treinos completados', value: '48/60', bar: 80, color: 'bg-blue-500' },
      { label: 'Aderência à dieta', value: '92%', bar: 92, color: 'bg-emerald-500' },
      { label: 'Pontos acumulados', value: '2.840', bar: 57, color: 'bg-purple-500' },
    ],
  },
];

const SHORT_LABEL: Record<string, string> = { trainer: 'Trainer', nutritionist: 'Nutri', student: 'Aluno' };

export function LandingRoles() {
  const [activeRole, setActiveRole] = useState('trainer');
  const role = roles.find((r) => r.id === activeRole)!;

  return (
    <section className="py-16 md:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Users className="w-4 h-4" />
            Para cada perfil
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Uma plataforma,
            <br />
            <span className="gradient-text">múltiplos perfis</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Cada profissional tem sua área otimizada. Trainers, nutricionistas e alunos com experiências independentes.
          </p>
        </motion.div>

        {/* Tab selector */}
        <div className="flex justify-center mb-8 md:mb-10">
          <div className="flex gap-1.5 sm:gap-2 glass rounded-2xl p-1.5">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveRole(r.id)}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all border',
                  activeRole === r.id ? r.activeColor : 'text-muted-foreground border-transparent hover:bg-accent',
                )}
              >
                <r.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="sm:hidden">{SHORT_LABEL[r.id]}</span>
                <span className="hidden sm:inline">{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
          >
            {/* Left: text */}
            <div>
              <div className={`inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br ${role.color} items-center justify-center mb-6 shadow-lg`}>
                <role.icon className="w-7 h-7 text-white" />
              </div>

              <h3 className="text-3xl font-bold mb-4">{role.headline}</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">{role.description}</p>

              <ul className="space-y-3 mb-8">
                {role.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${role.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
                {role.stats.map((s) => (
                  <div key={s.label} className="glass rounded-xl p-2 sm:p-3 text-center">
                    <div className="text-lg sm:text-2xl font-bold gradient-text mb-0.5 sm:mb-1">{s.value}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{s.label}</div>
                  </div>
                ))}
              </div>

              {role.id === 'student' ? (
                <div className="flex items-start gap-3 glass rounded-xl px-4 py-3 border border-cyan-500/20 text-sm text-muted-foreground">
                  <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Você é aluno? O acesso é feito via convite do seu personal trainer ou nutricionista.
                    Peça o link diretamente ao seu profissional.
                  </span>
                </div>
              ) : role.id === 'nutritionist' ? (
                <button disabled className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-muted-foreground text-sm font-medium border border-border/50 cursor-not-allowed">
                  <Clock className="w-4 h-4" />
                  Em breve disponível
                </button>
              ) : (
                <Link href="/register" className="btn-primary inline-flex items-center gap-2">
                  Criar conta como {role.label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}

            </div>

            {/* Right: preview card */}
            <div className="relative">
              <div className={`absolute -inset-4 bg-gradient-to-br ${role.color} opacity-10 rounded-3xl blur-2xl`} />
              <div className="relative glass-card">
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center`}>
                    <role.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Dashboard · {role.label}</div>
                    <div className="text-xs text-muted-foreground">Visão geral em tempo real</div>
                  </div>
                </div>

                <div className="space-y-4">
                  {role.preview.map((p) => (
                    <div key={p.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-muted-foreground">{p.label}</span>
                        <span className="text-sm font-semibold">{p.value}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${p.bar}%` }}
                          transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                          className={`h-full rounded-full ${p.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Atualizado agora mesmo</span>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Ao vivo
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
