'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles, Play, TrendingUp, Users, Dumbbell, Apple } from 'lucide-react';

export function LandingHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-dark pt-16">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[700px] h-[700px] bg-purple-600/15 rounded-full blur-[130px]" />
        <div className="absolute -bottom-1/3 -right-1/4 w-[700px] h-[700px] bg-cyan-600/15 rounded-full blur-[130px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 50px,rgba(255,255,255,.1) 50px,rgba(255,255,255,.1) 51px),repeating-linear-gradient(90deg,transparent,transparent 50px,rgba(255,255,255,.1) 50px,rgba(255,255,255,.1) 51px)`,
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-20">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Powered by IA · A nova era do fitness</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
        >
          A plataforma fitness
          <br />
          <span className="gradient-text">mais completa</span>
          <br />
          do Brasil
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
        >
          Personal trainers, nutricionistas e academias em uma única plataforma.
          Gerencie treinos, dietas e evolução com inteligência artificial.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
        >
          <Link href="/register" className="btn-primary flex items-center gap-2 text-base shadow-2xl shadow-purple-600/30 px-7 py-3">
            Começar grátis
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button className="btn-secondary flex items-center gap-2 text-base px-7 py-3">
            <Play className="w-4 h-4 fill-current" />
            Ver demo
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="text-center text-sm text-muted-foreground mb-16"
        >
          14 dias grátis · Sem cartão de crédito · Cancele quando quiser
        </motion.p>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-5xl"
        >
          <div className="relative">
            {/* Glow under the card */}
            <div className="absolute -inset-px bg-gradient-to-r from-purple-600/30 via-cyan-600/20 to-indigo-600/30 rounded-2xl blur-2xl" />
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#0d0d1a] border-b border-white/5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                <div className="flex-1 mx-4 h-6 bg-white/5 rounded-md flex items-center px-3">
                  <span className="text-[11px] text-white/30">app.fitsaas.com.br/trainer</span>
                </div>
              </div>
              <DashboardPreview />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  const bars = [40, 65, 50, 80, 70, 90, 75];
  const days = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

  return (
    <div className="bg-[#0a0a14] p-4 grid grid-cols-12 gap-3 min-h-[420px] text-white">
      {/* Sidebar */}
      <div className="col-span-2 flex flex-col gap-1 pt-2">
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
            <Dumbbell className="w-3 h-3 text-white" />
          </div>
          <div className="h-2.5 bg-white/20 rounded w-14" />
        </div>
        {[
          { color: 'bg-purple-600/30 border-l-2 border-purple-500', w: 'w-full' },
          { color: 'bg-white/0', w: 'w-full' },
          { color: 'bg-white/0', w: 'w-full' },
          { color: 'bg-white/0', w: 'w-full' },
          { color: 'bg-white/0', w: 'w-full' },
          { color: 'bg-white/0', w: 'w-full' },
        ].map((item, i) => (
          <div key={i} className={`h-7 rounded-lg ${item.color} flex items-center gap-2 px-2`}>
            <div className={`w-3 h-3 rounded ${i === 0 ? 'bg-purple-400' : 'bg-white/10'}`} />
            <div className={`h-2 rounded ${i === 0 ? 'bg-purple-400/50' : 'bg-white/10'} flex-1`} />
          </div>
        ))}
      </div>

      {/* Main */}
      <div className="col-span-10 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-3 bg-white/20 rounded w-32" />
          <div className="flex gap-2">
            <div className="h-7 w-24 bg-white/5 rounded-lg" />
            <div className="h-7 w-24 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 rounded-lg" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Alunos', value: '248', icon: Users, color: 'from-purple-600 to-indigo-600', delta: '+12%' },
            { label: 'Treinos', value: '1.2k', icon: Dumbbell, color: 'from-cyan-600 to-blue-600', delta: '+8%' },
            { label: 'Dietas', value: '89', icon: Apple, color: 'from-emerald-600 to-teal-600', delta: '+5%' },
            { label: 'Receita', value: 'R$12k', icon: TrendingUp, color: 'from-orange-600 to-red-600', delta: '+22%' },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                  <s.icon className="w-3 h-3 text-white" />
                </div>
                <span className="text-[9px] text-emerald-400">{s.delta}</span>
              </div>
              <div className="text-sm font-bold text-white">{s.value}</div>
              <div className="text-[9px] text-white/40 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Chart + list */}
        <div className="grid grid-cols-3 gap-3 flex-1">
          {/* Chart */}
          <div className="col-span-2 bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-2.5 bg-white/20 rounded w-24" />
              <div className="flex gap-1">
                {['7d','30d','3m'].map((t, i) => (
                  <div key={t} className={`px-1.5 py-0.5 rounded text-[9px] ${i === 0 ? 'bg-purple-600/40 text-purple-300' : 'text-white/20'}`}>{t}</div>
                ))}
              </div>
            </div>
            <div className="flex items-end gap-1.5 h-28">
              {bars.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-sm"
                    style={{
                      height: `${h}%`,
                      background: i === 5
                        ? 'linear-gradient(to top, #7c3aed, #6366f1)'
                        : 'rgba(255,255,255,0.06)',
                    }}
                  />
                  <span className="text-[8px] text-white/20">{days[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Students */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="h-2.5 bg-white/20 rounded w-20 mb-3" />
            <div className="space-y-2">
              {[
                { initials: 'JS', color: 'from-purple-600 to-indigo-600', w: '85%', status: 'bg-emerald-500' },
                { initials: 'MA', color: 'from-cyan-600 to-blue-600', w: '62%', status: 'bg-emerald-500' },
                { initials: 'PL', color: 'from-emerald-600 to-teal-600', w: '91%', status: 'bg-yellow-500' },
                { initials: 'RC', color: 'from-orange-600 to-red-600', w: '44%', status: 'bg-red-500' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${s.color} flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0`}>
                    {s.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-600/70 to-indigo-600/70 rounded-full" style={{ width: s.w }} />
                    </div>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ${s.status} flex-shrink-0`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
