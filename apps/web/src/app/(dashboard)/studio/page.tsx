'use client';

import { motion } from 'framer-motion';
import { Users, Dumbbell, Apple, TrendingUp, UserPlus, Copy, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function StudioDashboard() {
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['studio-overview'],
    queryFn: () => api.get('/tenants/my/overview').then((r) => r.data.data ?? r.data),
  });

  const tenantId = data?.tenant?.id;

  const copyTenantId = () => {
    if (!tenantId) return;
    navigator.clipboard.writeText(tenantId);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { label: 'Personal Trainers', value: data?.trainers ?? 0, icon: Dumbbell, color: 'from-purple-600 to-indigo-600' },
    { label: 'Nutricionistas', value: data?.nutritionists ?? 0, icon: Apple, color: 'from-emerald-600 to-teal-600' },
    { label: 'Alunos no Studio', value: data?.students ?? 0, icon: Users, color: 'from-cyan-600 to-blue-600' },
    { label: 'Plano', value: data?.subscription?.plan ?? 'FREE', icon: TrendingUp, color: 'from-orange-600 to-red-600' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">{data?.tenant?.name ?? 'Meu Studio'}</h1>
          <p className="text-sm text-muted-foreground">Visão geral do seu studio</p>
        </div>
        <Link href="/studio/team" className="btn-primary flex items-center gap-2 text-sm">
          <UserPlus className="w-4 h-4" />
          Gerenciar equipe
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
            <div className="text-3xl font-bold">{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Código de convite */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card"
      >
        <h2 className="font-semibold mb-1">Código do Studio</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Compartilhe este código com personal trainers e nutricionistas para que eles se cadastrem no seu studio.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 font-mono text-sm bg-white/5 border border-border rounded-xl px-4 py-3 truncate">
            {tenantId ?? '—'}
          </div>
          <button
            onClick={copyTenantId}
            className="btn-primary flex items-center gap-2 px-4 py-3 text-sm"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          O profissional deve selecionar "Em um Studio" ao se cadastrar e colar este código.
        </p>
      </motion.div>
    </div>
  );
}
