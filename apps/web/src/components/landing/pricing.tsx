'use client';

import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const plans = [
  {
    name: 'Starter',
    description: 'Para personal trainers autônomos',
    monthlyPrice: 97,
    annualPrice: 77,
    color: 'border-border',
    features: [
      'Até 30 alunos',
      'Montagem de treinos',
      'Planos nutricionais básicos',
      'Chat com alunos',
      'App mobile para alunos',
      'Relatórios básicos',
      'Suporte por email',
    ],
  },
  {
    name: 'Pro',
    description: 'Para studios e equipes pequenas',
    monthlyPrice: 197,
    annualPrice: 157,
    color: 'border-primary',
    popular: true,
    features: [
      'Até 150 alunos',
      'Tudo do Starter',
      'IA para sugestões de treino',
      'IA para sugestões de dieta',
      '3 trainers + 2 nutricionistas',
      'Gamificação completa',
      'White-label básico',
      'Relatórios avançados',
      'Pagamentos integrados',
      'Suporte prioritário',
    ],
  },
  {
    name: 'Enterprise',
    description: 'Para academias e redes',
    monthlyPrice: 497,
    annualPrice: 397,
    color: 'border-border',
    features: [
      'Alunos ilimitados',
      'Tudo do Pro',
      'Trainers ilimitados',
      'White-label completo',
      'Domínio próprio',
      'API acesso completo',
      'Analytics avançado',
      'SLA 99.9%',
      'Gerente de conta dedicado',
      'Onboarding presencial',
    ],
  },
];

export function LandingPricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-32 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            Preços
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Planos que crescem
            <br />
            <span className="gradient-text">com seu negócio</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            14 dias grátis em todos os planos. Sem taxas de setup. Cancele quando quiser.
          </p>

          <div className="inline-flex items-center gap-3 bg-muted rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !annual ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                annual ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
              }`}
            >
              Anual <span className="text-emerald-500 ml-1">-20%</span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative glass-card border-2 ${plan.color} ${
                plan.popular ? 'scale-105 shadow-2xl shadow-primary/20' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground rounded-full px-4 py-1 text-xs font-bold">
                  Mais popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-8">
                <span className="text-4xl font-bold">
                  R$ {annual ? plan.annualPrice : plan.monthlyPrice}
                </span>
                <span className="text-muted-foreground">/mês</span>
                {annual && (
                  <p className="text-xs text-emerald-500 mt-1">Cobrado anualmente</p>
                )}
              </div>

              <Link
                href={`/register?plan=${plan.name.toLowerCase()}`}
                className={`block text-center py-3 px-6 rounded-xl font-semibold text-sm mb-8 transition-all ${
                  plan.popular
                    ? 'btn-primary'
                    : 'btn-secondary border border-border hover:border-primary'
                }`}
              >
                Começar grátis
              </Link>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
