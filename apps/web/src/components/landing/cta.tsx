'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles, Shield, Clock, CreditCard } from 'lucide-react';

const guarantees = [
  { icon: Clock, label: '14 dias grátis' },
  { icon: CreditCard, label: 'Sem cartão de crédito' },
  { icon: Shield, label: 'Cancele quando quiser' },
];

export function LandingCTA() {
  return (
    <section className="py-32 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden max-w-5xl mx-auto"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-indigo-900/40 to-cyan-900/30" />
          <div className="absolute inset-0 bg-gradient-dark opacity-60" />
          <div className="absolute -top-1/2 -left-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-[100px]" />
          <div className="absolute -bottom-1/2 -right-1/4 w-96 h-96 bg-cyan-600/25 rounded-full blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px',
            }}
          />

          {/* Border glow */}
          <div className="absolute inset-0 rounded-3xl border border-white/10" />

          <div className="relative px-8 py-16 md:px-20 md:py-20 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Mais de 2.800 profissionais já usam</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="text-4xl md:text-6xl font-bold mb-5"
            >
              Pronto para transformar
              <br />
              <span className="gradient-text">seu negócio fitness?</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground text-lg max-w-xl mx-auto mb-10"
            >
              Junte-se a milhares de profissionais que já usam o FitSaaS para crescer.
              Comece grátis hoje — sem complicações.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
            >
              <Link
                href="/register"
                className="btn-primary flex items-center gap-2 text-base px-8 py-3.5 shadow-2xl shadow-purple-600/40"
              >
                Criar conta grátis
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/demo" className="btn-secondary text-base px-8 py-3.5 border border-white/10">
                Ver demonstração ao vivo
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
              className="flex flex-wrap items-center justify-center gap-6"
            >
              {guarantees.map((g) => (
                <div key={g.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <g.icon className="w-4 h-4 text-emerald-400" />
                  {g.label}
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
