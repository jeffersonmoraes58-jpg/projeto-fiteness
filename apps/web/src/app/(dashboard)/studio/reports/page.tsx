'use client';

import { motion } from 'framer-motion';
import { BarChart3, Users, Dumbbell, Apple, ChevronLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function StudioReportsPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['studio-overview'],
    queryFn: () => api.get('/tenants/my/overview').then((r) => r.data.data ?? r.data),
  });

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ['studio-members'],
    queryFn: () => api.get('/tenants/my/members').then((r) => r.data.data ?? r.data),
  });

  const trainers = members.filter((m) => m.role === 'TRAINER');
  const nutritionists = members.filter((m) => m.role === 'NUTRITIONIST');
  const totalStudents = trainers.reduce((s, t) => s + (t.studentsCount ?? 0), 0);
  const totalPatients = nutritionists.reduce((s, n) => s + (n.patientsCount ?? 0), 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold">Relatórios do Studio</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total de Trainers', value: data?.trainers ?? 0, icon: Dumbbell, color: 'from-purple-600 to-indigo-600' },
              { label: 'Total de Nutricionistas', value: data?.nutritionists ?? 0, icon: Apple, color: 'from-emerald-600 to-teal-600' },
              { label: 'Alunos (via trainers)', value: totalStudents, icon: Users, color: 'from-cyan-600 to-blue-600' },
              { label: 'Pacientes (via nutris)', value: totalPatients, icon: Users, color: 'from-orange-600 to-red-600' },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card">
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

          {trainers.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Alunos por Trainer
              </h2>
              <div className="space-y-3">
                {trainers.map((t) => {
                  const name = `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() || t.email;
                  const pct = totalStudents > 0 ? Math.round((t.studentsCount / totalStudents) * 100) : 0;
                  return (
                    <div key={t.id}>
                      <div className="flex items-center justify-between mb-1.5 text-sm">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-semibold">{t.studentsCount ?? 0} alunos</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
