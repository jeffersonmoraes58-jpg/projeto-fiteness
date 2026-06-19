'use client';

import { motion } from 'framer-motion';
import { Users, Dumbbell, Apple, UserX, Phone, Mail, ChevronLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  TRAINER: { label: 'Personal Trainer', icon: Dumbbell, color: 'from-purple-600 to-indigo-600' },
  NUTRITIONIST: { label: 'Nutricionista', icon: Apple, color: 'from-emerald-600 to-teal-600' },
};

export default function StudioTeamPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery<any[]>({
    queryKey: ['studio-members'],
    queryFn: () => api.get('/tenants/my/members').then((r) => r.data.data ?? r.data),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/tenants/my/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-members'] });
      queryClient.invalidateQueries({ queryKey: ['studio-overview'] });
      toast.success('Profissional removido do studio');
    },
    onError: () => toast.error('Erro ao remover profissional'),
  });

  const trainers = members.filter((m) => m.role === 'TRAINER');
  const nutritionists = members.filter((m) => m.role === 'NUTRITIONIST');

  const MemberCard = ({ member }: { member: any }) => {
    const cfg = ROLE_CONFIG[member.role];
    const name = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || member.email;
    const count = member.studentsCount ?? member.patientsCount ?? 0;
    const countLabel = member.role === 'TRAINER' ? 'alunos' : 'pacientes';

    return (
      <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/8 transition-all">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${cfg.color} flex items-center justify-center flex-shrink-0`}>
          {member.avatarUrl
            ? <img src={member.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
            : <cfg.icon className="w-5 h-5 text-white" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{name}</div>
          <div className="text-xs text-muted-foreground">{member.email}</div>
          {member.phone && (
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3" />{member.phone}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold">{count}</div>
          <div className="text-xs text-muted-foreground">{countLabel}</div>
        </div>
        <button
          onClick={() => {
            if (confirm(`Remover ${name} do studio?`)) removeMutation.mutate(member.id);
          }}
          className="w-8 h-8 rounded-lg hover:bg-destructive/20 flex items-center justify-center text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
          title="Remover do studio"
        >
          <UserX className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Equipe do Studio</h1>
            <p className="text-sm text-muted-foreground">{members.length} profissional(is) cadastrado(s)</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card text-center py-16"
        >
          <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium mb-1">Nenhum profissional ainda</p>
          <p className="text-sm text-muted-foreground">
            Compartilhe o código do studio para que trainers e nutricionistas se cadastrem.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {trainers.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                  <Dumbbell className="w-3.5 h-3.5 text-white" />
                </div>
                <h2 className="font-semibold">Personal Trainers</h2>
                <span className="ml-auto text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">{trainers.length}</span>
              </div>
              <div className="space-y-2">
                {trainers.map((m) => <MemberCard key={m.id} member={m} />)}
              </div>
            </motion.div>
          )}

          {nutritionists.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
                  <Apple className="w-3.5 h-3.5 text-white" />
                </div>
                <h2 className="font-semibold">Nutricionistas</h2>
                <span className="ml-auto text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">{nutritionists.length}</span>
              </div>
              <div className="space-y-2">
                {nutritionists.map((m) => <MemberCard key={m.id} member={m} />)}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
