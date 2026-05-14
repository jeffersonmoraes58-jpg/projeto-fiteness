'use client';

import { motion } from 'framer-motion';
import {
  Dumbbell, Apple, Users, BarChart3, Brain, MessageCircle,
  Bell, CreditCard, Smartphone, Shield, Zap, Trophy,
} from 'lucide-react';

const features = [
  {
    icon: Dumbbell,
    title: 'Montagem de Treinos',
    description: 'Crie treinos personalizados com biblioteca de exercícios, vídeos GIFs e divisão ABCDE.',
    color: 'from-purple-600 to-indigo-600',
  },
  {
    icon: Apple,
    title: 'Planos Nutricionais',
    description: 'Cálculo automático de macros, TMB, GET e planos alimentares completos com lista de compras.',
    color: 'from-emerald-600 to-teal-600',
  },
  {
    icon: Brain,
    title: 'IA Integrada',
    description: 'Sugestões automáticas de treinos e dietas baseadas no perfil e objetivos do aluno.',
    color: 'from-cyan-600 to-blue-600',
  },
  {
    icon: BarChart3,
    title: 'Acompanhamento',
    description: 'Fotos de evolução, medidas corporais, avaliação física e relatórios detalhados.',
    color: 'from-orange-600 to-red-600',
  },
  {
    icon: MessageCircle,
    title: 'Chat em Tempo Real',
    description: 'Comunicação direta entre profissional e aluno com suporte a arquivos e áudios.',
    color: 'from-pink-600 to-rose-600',
  },
  {
    icon: Trophy,
    title: 'Gamificação',
    description: 'Sistema de pontos, medalhas, sequências e rankings para manter alunos motivados.',
    color: 'from-yellow-600 to-orange-600',
  },
  {
    icon: Bell,
    title: 'Push Notifications',
    description: 'Lembretes de treino, dieta, hidratação e mensagens via Firebase.',
    color: 'from-violet-600 to-purple-600',
  },
  {
    icon: CreditCard,
    title: 'Pagamentos',
    description: 'Cobrança recorrente com Stripe e Mercado Pago. Controle de mensalidades integrado.',
    color: 'from-blue-600 to-cyan-600',
  },
  {
    icon: Smartphone,
    title: 'App Mobile',
    description: 'Aplicativo nativo iOS e Android com experiência premium para alunos e profissionais.',
    color: 'from-indigo-600 to-blue-600',
  },
  {
    icon: Users,
    title: 'Multi-tenant',
    description: 'White-label completo. Cada academia com domínio, logo e cores personalizadas.',
    color: 'from-teal-600 to-emerald-600',
  },
  {
    icon: Shield,
    title: 'Segurança',
    description: 'JWT, RBAC, rate limiting, criptografia e conformidade com LGPD.',
    color: 'from-red-600 to-orange-600',
  },
  {
    icon: Zap,
    title: 'Alta Performance',
    description: 'Infraestrutura na AWS com Docker, Redis e CDN. Escalável para milhares de usuários.',
    color: 'from-amber-600 to-yellow-600',
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="py-32 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            Funcionalidades completas
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Tudo que você precisa
            <br />
            <span className="gradient-text">em um único lugar</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Da criação de treinos ao controle financeiro, passando pela IA até a gamificação.
            FitSaaS tem tudo para seu negócio fitness crescer.
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
