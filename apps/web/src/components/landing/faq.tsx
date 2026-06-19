'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const faqs = [
  {
    question: 'O plano gratuito é realmente grátis para sempre?',
    answer: 'Sim. O plano Grátis não tem prazo de validade. Você pode gerenciar 1 aluno, montar treinos, usar o chat e ver o dashboard sem pagar nada. Para mais alunos ou funcionalidades avançadas como IA, agenda e cobranças, basta fazer upgrade para um plano pago a qualquer momento.',
  },
  {
    question: 'Preciso de cartão de crédito para criar minha conta?',
    answer: 'Não. O plano gratuito não exige nenhum dado de pagamento. Você só precisa de um e-mail para criar sua conta e começar a usar imediatamente.',
  },
  {
    question: 'Quantos alunos posso ter em cada plano?',
    answer: 'Grátis: 1 aluno. Starter (R$35/mês): até 20 alunos. Pro (R$55/mês): até 60 alunos. Elite (R$95/mês): alunos ilimitados. Você pode fazer upgrade a qualquer momento sem perder nenhum dado.',
  },
  {
    question: 'O que inclui a IA Fitness?',
    answer: 'A IA Fitness analisa automaticamente o perfil do aluno (objetivos, histórico, medidas) e sugere treinos e dietas personalizados. Também há um chat interativo onde o aluno pode tirar dúvidas sobre treino e nutrição com a IA. Disponível nos planos Pro e Elite.',
  },
  {
    question: 'Como funcionam as cobranças integradas?',
    answer: 'Nos planos Starter, Pro e Elite você pode cobrar mensalidades dos seus alunos via Pix ou cartão de crédito, tudo integrado com Mercado Pago. O dinheiro cai direto na sua conta. O Fitlynutri não retém nenhum valor — você só paga a taxa padrão do Mercado Pago por transação.',
  },
  {
    question: 'O app funciona no celular?',
    answer: 'Sim. O Fitlynutri é um PWA (Progressive Web App) — você instala direto pelo navegador no Android ou iPhone, sem precisar de App Store ou Play Store. A experiência é fluida e funciona como um app nativo.',
  },
  {
    question: 'Meus dados ficam seguros?',
    answer: 'Totalmente. Usamos criptografia em trânsito e em repouso, autenticação JWT, backups diários e conformidade com a LGPD. Seus dados e os dos seus alunos nunca são compartilhados com terceiros.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim. Sem fidelidade, sem multa. Você pode cancelar diretamente pelo painel e seus dados ficam disponíveis para exportação. O plano gratuito continua ativo mesmo após cancelar um plano pago.',
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
    <section className="py-16 md:py-32 bg-gradient-dark">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 md:mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <HelpCircle className="w-4 h-4" />
              Dúvidas frequentes
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Perguntas
              <span className="gradient-text"> frequentes</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Não encontrou o que procura?{' '}
              <Link href="/register" className="text-primary hover:underline">Crie sua conta e fale conosco</Link>.
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
