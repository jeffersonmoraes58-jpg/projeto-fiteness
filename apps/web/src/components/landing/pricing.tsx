'use client';

import { motion } from 'framer-motion';
import { Check, X, Zap, Star } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Grátis',
    description: 'Para começar sem compromisso',
    price: 0,
    color: 'border-border',
    textColor: 'text-foreground',
    cta: 'Criar conta grátis',
    ctaStyle: 'btn-secondary border border-border hover:border-primary w-full text-center py-3 px-6 rounded-xl font-semibold text-sm mb-8 block transition-all',
    features: [
      { label: '1 aluno ativo', ok: true },
      { label: 'Montagem de treinos', ok: true },
      { label: 'Chat com o aluno', ok: true },
      { label: 'Dashboard básico', ok: true },
      { label: 'Agenda de sessões', ok: false },
      { label: 'Cobranças integradas', ok: false },
      { label: 'Avaliação física', ok: false },
      { label: 'IA Fitness', ok: false },
      { label: 'Relatórios CSV/PDF', ok: false },
      { label: 'Desafios e conquistas', ok: false },
    ],
  },
  {
    name: 'Starter',
    description: 'Para personal trainers autônomos',
    price: 35,
    color: 'border-border',
    textColor: 'text-foreground',
    cta: 'Assinar Starter',
    ctaStyle: 'btn-secondary border border-border hover:border-primary w-full text-center py-3 px-6 rounded-xl font-semibold text-sm mb-8 block transition-all',
    features: [
      { label: 'Até 20 alunos', ok: true },
      { label: 'Treinos ilimitados', ok: true },
      { label: 'Chat (texto, voz, arquivos)', ok: true },
      { label: 'Agenda de sessões', ok: true },
      { label: 'Cobranças via Mercado Pago', ok: true },
      { label: 'Avaliação física', ok: true },
      { label: 'Relatórios CSV', ok: true },
      { label: 'IA Fitness', ok: false },
      { label: 'Desafios e gamificação', ok: false },
      { label: 'Player de música', ok: false },
    ],
  },
  {
    name: 'Pro',
    description: 'Para quem quer crescer com IA',
    price: 55,
    color: 'border-primary',
    textColor: 'text-foreground',
    popular: true,
    cta: 'Assinar Pro',
    ctaStyle: 'btn-primary w-full text-center py-3 px-6 rounded-xl font-semibold text-sm mb-8 block transition-all',
    features: [
      { label: 'Até 60 alunos', ok: true },
      { label: 'Tudo do Starter', ok: true },
      { label: 'IA Fitness (análise + chat)', ok: true },
      { label: 'Desafios e gamificação', ok: true },
      { label: 'Relatórios PDF', ok: true },
      { label: 'Player de música no treino', ok: true },
      { label: 'KPIs e métricas avançadas', ok: true },
      { label: 'Notificações automáticas', ok: true },
      { label: 'Planos nutricionais completos', ok: true },
      { label: 'Suporte prioritário', ok: true },
    ],
  },
  {
    name: 'Elite',
    description: 'Para studios e equipes',
    price: 95,
    color: 'border-border',
    textColor: 'text-foreground',
    cta: 'Assinar Elite',
    ctaStyle: 'btn-secondary border border-border hover:border-primary w-full text-center py-3 px-6 rounded-xl font-semibold text-sm mb-8 block transition-all',
    features: [
      { label: 'Alunos ilimitados', ok: true },
      { label: 'Tudo do Pro', ok: true },
      { label: 'Nutricionista integrado', ok: true },
      { label: 'Marketplace de cursos', ok: true },
      { label: 'Múltiplos trainers', ok: true },
      { label: 'Relatórios avançados', ok: true },
      { label: 'Dashboard multi-profissional', ok: true },
      { label: 'Suporte via WhatsApp', ok: true },
      { label: 'Onboarding dedicado', ok: true },
      { label: 'Acesso antecipado a novidades', ok: true },
    ],
  },
];

export function LandingPricing() {
  return (
    <section id="pricing" className="py-16 md:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            Preços
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Comece grátis,
            <br />
            <span className="gradient-text">cresça no seu ritmo</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Conta gratuita para sempre com 1 aluno. Planos pagos a partir de R$35/mês. Sem fidelidade.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative glass-card border-2 ${plan.color} ${
                plan.popular ? 'shadow-2xl shadow-primary/20' : ''
              } flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground rounded-full px-4 py-1 text-xs font-bold flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Mais popular
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                {plan.price === 0 ? (
                  <div>
                    <span className="text-4xl font-bold">Grátis</span>
                    <p className="text-xs text-muted-foreground mt-1">para sempre</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-end gap-1">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm mb-1">/mês</span>
                    </div>
                  </div>
                )}
              </div>

              <Link
                href={`/register?plan=${plan.name.toLowerCase()}`}
                className={plan.ctaStyle}
              >
                {plan.cta}
              </Link>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-2.5 text-sm">
                    {feature.ok ? (
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <span className={feature.ok ? 'text-muted-foreground' : 'text-muted-foreground/40'}>
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-muted-foreground mt-10"
        >
          Todos os planos incluem suporte por e-mail, atualizações automáticas e acesso via PWA (instale no celular).
        </motion.p>
      </div>
    </section>
  );
}
