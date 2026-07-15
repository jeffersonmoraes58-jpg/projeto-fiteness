'use client';

import { motion } from 'framer-motion';
import {
  Dumbbell, Apple, Brain, BarChart3, MessageCircle, Trophy,
  Bell, CreditCard, Calendar, FileDown, Activity, Music, Zap,
} from 'lucide-react';


const features = [
  {
    icon: Dumbbell,
    title: 'Montagem de Treinos',
    description: 'Biblioteca de exercícios com GIFs, divisão ABCDE, séries, repetições e tempo de descanso. Aluno executa direto pelo app.',
    color: 'from-purple-600 to-indigo-600',
  },
  {
    icon: Apple,
    title: 'Planos Nutricionais',
    description: 'Monte dietas completas com cálculo automático de macros, TMB e GET. Banco de alimentos integrado com lista de substituições.',
    color: 'from-emerald-600 to-teal-600',
  },
  {
    icon: Brain,
    title: 'IA Fitness',
    description: 'Análise automática do perfil do aluno com sugestões de treino e dieta. Chat com IA para dúvidas em tempo real.',
    color: 'from-cyan-600 to-blue-600',
  },
  {
    icon: Activity,
    title: 'Evolução Completa',
    description: 'Avaliação física pelo trainer, fotos de progresso, gráficos de peso e medidas corporais com histórico completo.',
    color: 'from-orange-600 to-red-600',
  },
  {
    icon: MessageCircle,
    title: 'Chat em Tempo Real',
    description: 'Mensagens de texto, áudios, imagens e arquivos entre profissional e aluno. Contador de não lidas e notificações.',
    color: 'from-pink-600 to-rose-600',
  },
  {
    icon: Trophy,
    title: 'Gamificação',
    description: 'Sistema de pontos, níveis, conquistas, metas e streak de treinos. Desafios semanais para manter o aluno motivado.',
    color: 'from-yellow-600 to-orange-600',
  },
  {
    icon: Bell,
    title: 'Notificações Automáticas',
    description: 'Alertas de treino, cobrança vencida e aluno inativo. Notificações push via PWA direto no celular.',
    color: 'from-violet-600 to-purple-600',
  },
  {
    icon: CreditCard,
    title: 'Cobranças Integradas',
    description: 'Pix e cartão de crédito via Mercado Pago. Controle de mensalidades, faturas e histórico financeiro no painel.',
    color: 'from-blue-600 to-cyan-600',
  },
  {
    icon: Calendar,
    title: 'Agenda de Sessões',
    description: 'Calendário para agendar, editar e cancelar sessões com alunos. Visualização por dia, semana ou mês.',
    color: 'from-indigo-600 to-blue-600',
  },
  {
    icon: FileDown,
    title: 'Relatórios CSV e PDF',
    description: 'Exportação de relatórios financeiros, evolução dos alunos e KPIs da semana em CSV ou PDF com um clique.',
    color: 'from-teal-600 to-emerald-600',
  },
  {
    icon: BarChart3,
    title: 'Dashboard com KPIs',
    description: 'Visão geral da receita, alunos ativos, treinos e dietas da semana. Gráficos interativos em tempo real.',
    color: 'from-red-600 to-orange-600',
  },
  {
    icon: Music,
    title: 'Player de Música',
    description: 'Player integrado no app do aluno durante o treino. Adicione playlists do YouTube para manter o foco e energia.',
    color: 'from-amber-600 to-yellow-600',
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="py-16 md:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            Funcionalidades completas
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Tudo que você precisa
            <br />
            <span className="gradient-text">em um único lugar</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Da criação de treinos ao controle financeiro, passando pela IA até a gamificação.
            Tudo construído para o profissional fitness brasileiro.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="glass-card card-hover group"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
