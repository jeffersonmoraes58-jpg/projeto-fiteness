'use client';

import { motion } from 'framer-motion';
import { UserPlus, Settings2, Rocket, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Crie sua conta',
    description: 'Cadastre-se em menos de 2 minutos. Sem cartão de crédito. 14 dias grátis para explorar tudo.',
    color: 'from-purple-600 to-indigo-600',
    detail: ['Escolha seu perfil', 'Informe o nome do studio', 'Acesse imediatamente'],
  },
  {
    number: '02',
    icon: Settings2,
    title: 'Configure seu studio',
    description: 'Adicione sua logo, personalize as cores, cadastre sua equipe e importe seus alunos existentes.',
    color: 'from-cyan-600 to-blue-600',
    detail: ['White-label em minutos', 'Importe alunos via CSV', 'Defina planos e preços'],
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Comece a crescer',
    description: 'Seus alunos acessam o app, você acompanha em tempo real. A IA cuida das sugestões automáticas.',
    color: 'from-emerald-600 to-teal-600',
    detail: ['App para alunos no ar', 'Cobranças automáticas', 'Relatórios em tempo real'],
  },
];

export function LandingHowItWorks() {
  return (
    <section className="py-32 bg-gradient-dark relative overflow-hidden">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Rocket className="w-4 h-4" />
            Como funciona
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Do zero ao seu studio
            <br />
            <span className="gradient-text">em menos de uma hora</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Sem complexidade. Sem suporte técnico. Três passos e seu studio digital está no ar.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line - desktop only */}
          <div className="hidden md:block absolute top-16 left-[calc(16.66%-16px)] right-[calc(16.66%-16px)] h-px">
            <div className="h-full border-t border-dashed border-white/10" />
          </div>

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative"
            >
              {/* Arrow between steps on mobile */}
              {i < steps.length - 1 && (
                <div className="md:hidden flex justify-center my-4">
                  <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
                </div>
              )}

              <div className="glass-card h-full flex flex-col">
                {/* Step number + icon */}
                <div className="flex items-center gap-4 mb-5">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-4xl font-bold text-white/5">{step.number}</span>
                </div>

                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5 flex-1">
                  {step.description}
                </p>

                <ul className="space-y-2">
                  {step.detail.map((d) => (
                    <li key={d} className="flex items-center gap-2 text-sm">
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                      <span className="text-muted-foreground">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <Link href="/register" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3 shadow-xl shadow-purple-600/25">
            Começar agora — é grátis
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
