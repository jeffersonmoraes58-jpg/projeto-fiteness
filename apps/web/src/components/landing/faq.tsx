'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const faqs = [
  {
    question: 'Preciso de cartão de crédito para começar?',
    answer: 'Não. O período de 14 dias grátis não exige nenhum dado de pagamento. Você só precisa de um e-mail para criar sua conta. Ao final do trial, você escolhe o plano ou cancela — sem cobranças surpresa.',
  },
  {
    question: 'Posso importar meus alunos de outra plataforma?',
    answer: 'Sim. O FitSaaS suporta importação em massa via CSV com nome, e-mail, telefone e histórico básico. Nossa equipe de suporte também pode ajudar na migração de sistemas como Trainner, Total Pass, entre outros.',
  },
  {
    question: 'O app é disponível para iOS e Android?',
    answer: 'Sim. O app para alunos está disponível na App Store (iOS) e Google Play (Android). Profissionais acessam pelo app ou pela versão web, com a mesma experiência em qualquer dispositivo.',
  },
  {
    question: 'Quantos alunos posso ter em cada plano?',
    answer: 'No plano Starter: até 30 alunos. No Pro: até 150 alunos, com 3 trainers e 2 nutricionistas. No Enterprise: ilimitado, com toda a equipe que precisar. Você pode fazer upgrade a qualquer momento sem perder dados.',
  },
  {
    question: 'Como funciona o white-label?',
    answer: 'No plano Pro você pode adicionar sua logo e personalizar as cores principais. No Enterprise, você tem domínio próprio (app.suaacademia.com.br), marca completa no app mobile e e-mails transacionais com sua identidade.',
  },
  {
    question: 'Os pagamentos dos alunos passam pelo FitSaaS?',
    answer: 'Sim, opcionalmente. Você pode usar o módulo de pagamentos integrado com Stripe e Mercado Pago para cobrar mensalidades automaticamente. Ou pode gerenciar pagamentos externamente — a escolha é sua.',
  },
  {
    question: 'Meus dados ficam seguros?',
    answer: 'Totalmente. Usamos criptografia em trânsito (TLS 1.3) e em repouso, backups diários, infraestrutura na AWS com alta disponibilidade e conformidade total com a LGPD. Seus dados e os de seus clientes nunca são compartilhados.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim. Sem fidelidade, sem multa. Você pode cancelar diretamente pelo painel e seus dados ficam disponíveis para exportação por 30 dias após o cancelamento.',
  },
];

function FAQItem({ faq, isOpen, onToggle }: { faq: typeof faqs[0]; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className={cn('border border-border/50 rounded-xl overflow-hidden transition-colors', isOpen && 'border-primary/30 bg-primary/3')}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-medium text-sm">{faq.question}</span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-3">
              {faq.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-32 bg-gradient-dark">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <HelpCircle className="w-4 h-4" />
              Dúvidas frequentes
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Perguntas
              <span className="gradient-text"> frequentes</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Não encontrou o que procura?{' '}
              <Link href="/contact" className="text-primary hover:underline">Fale com nosso time</Link>.
            </p>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <FAQItem
                  faq={faq}
                  isOpen={openIndex === i}
                  onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
