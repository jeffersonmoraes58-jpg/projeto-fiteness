'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, Send, Users, Megaphone, CheckCircle2,
  Clock, AlertCircle, Search, Filter, Trash2,
  ChevronDown, Globe, Dumbbell, Apple, Shield,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const ROLES = ['Todos', 'TRAINER', 'NUTRITIONIST', 'STUDENT', 'STUDIO_OWNER'];
const ROLE_LABELS: Record<string, string> = {
  Todos: 'Todos os usuários',
  TRAINER: 'Trainers',
  NUTRITIONIST: 'Nutricionistas',
  STUDENT: 'Alunos',
  STUDIO_OWNER: 'Proprietários',
};
const ROLE_ICONS: Record<string, any> = {
  Todos: Globe, TRAINER: Dumbbell, NUTRITIONIST: Apple,
  STUDENT: Users, STUDIO_OWNER: Shield,
};

const TYPES = ['INFO', 'WARNING', 'SUCCESS', 'ALERT'] as const;
const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  INFO: { label: 'Informação', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  WARNING: { label: 'Aviso', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  SUCCESS: { label: 'Sucesso', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ALERT: { label: 'Alerta', color: 'text-red-400', bg: 'bg-red-500/10' },
};

export default function AdminNotifications() {
  const [targetRole, setTargetRole] = useState('Todos');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT'>('INFO');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: history, isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => api.get('/admin/notifications').then((r) => r.data.data),
  });

  const sendMutation = useMutation({
    mutationFn: (payload: any) => api.post('/admin/notifications/broadcast', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      setTitle('');
      setBody('');
      setType('INFO');
      setTargetRole('Todos');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });

  const notifications: any[] = history || [
    { id: '1', title: 'Novo recurso disponível', body: 'Acesse a IA de treinos personalizada agora mesmo!', type: 'INFO', targetRole: null, sentAt: new Date(Date.now() - 86400000 * 2).toISOString(), readCount: 842, totalCount: 1080 },
    { id: '2', title: 'Manutenção programada', body: 'O sistema ficará em manutenção no dia 15/05 das 02h às 04h.', type: 'WARNING', targetRole: 'TRAINER', sentAt: new Date(Date.now() - 86400000 * 4).toISOString(), readCount: 156, totalCount: 210 },
    { id: '3', title: 'Parabéns pelo desempenho!', body: 'Vocês atingiram a meta de 1.000 treinos esta semana!', type: 'SUCCESS', targetRole: 'STUDENT', sentAt: new Date(Date.now() - 86400000 * 7).toISOString(), readCount: 634, totalCount: 720 },
    { id: '4', title: 'Pagamento pendente', body: 'Existem pagamentos em atraso. Regularize agora para não perder acesso.', type: 'ALERT', targetRole: 'STUDIO_OWNER', sentAt: new Date(Date.now() - 86400000 * 10).toISOString(), readCount: 18, totalCount: 23 },
  ];

  const filtered = notifications.filter((n) => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'Todos' || n.type === typeFilter;
    return matchSearch && matchType;
  });

  const stats = {
    total: notifications.length,
    sent: notifications.reduce((sum, n) => sum + (n.totalCount || 0), 0),
    read: notifications.reduce((sum, n) => sum + (n.readCount || 0), 0),
  };
  const readRate = stats.sent > 0 ? Math.round((stats.read / stats.sent) * 100) : 0;

  const RoleIcon = ROLE_ICONS[targetRole] || Globe;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notificações</h1>
        <p className="text-muted-foreground text-sm mt-1">Envie comunicados para usuários da plataforma</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Enviadas', value: stats.sent.toLocaleString('pt-BR'), icon: Send, color: 'from-purple-600 to-indigo-600' },
          { label: 'Lidas', value: stats.read.toLocaleString('pt-BR'), icon: CheckCircle2, color: 'from-emerald-600 to-teal-600' },
          { label: 'Taxa de abertura', value: `${readRate}%`, icon: Bell, color: 'from-blue-600 to-cyan-600' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Compose */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card"
      >
        <div className="flex items-center gap-2 mb-5">
          <Megaphone className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Nova Notificação</h2>
        </div>

        <div className="space-y-4">
          {/* Target audience */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Destinatários</label>
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 input-field text-sm"
              >
                <div className="flex items-center gap-2">
                  <RoleIcon className="w-4 h-4 text-muted-foreground" />
                  <span>{ROLE_LABELS[targetRole]}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
              {roleDropdownOpen && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-20 py-1">
                  {ROLES.map((r) => {
                    const Icon = ROLE_ICONS[r];
                    return (
                      <button
                        key={r}
                        onClick={() => { setTargetRole(r); setRoleDropdownOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-all',
                          targetRole === r && 'text-primary',
                        )}
                      >
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        {ROLE_LABELS[r]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Tipo</label>
            <div className="flex gap-2 flex-wrap">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
                    type === t
                      ? `${TYPE_CONFIG[t].bg} ${TYPE_CONFIG[t].color} border-current`
                      : 'glass border-transparent hover:bg-accent',
                  )}
                >
                  {TYPE_CONFIG[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Título</label>
            <input
              type="text"
              placeholder="Título da notificação..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              maxLength={80}
            />
            <div className="text-[10px] text-muted-foreground text-right mt-1">{title.length}/80</div>
          </div>

          {/* Body */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Mensagem</label>
            <textarea
              placeholder="Conteúdo da notificação..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input-field resize-none"
              rows={3}
              maxLength={300}
            />
            <div className="text-[10px] text-muted-foreground text-right mt-1">{body.length}/300</div>
          </div>

          <button
            onClick={() => sendMutation.mutate({ title, body, type, targetRole: targetRole === 'Todos' ? null : targetRole })}
            disabled={!title.trim() || !body.trim() || sendMutation.isPending}
            className="btn-primary flex items-center gap-2 text-sm w-full justify-center py-3 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sendMutation.isPending ? 'Enviando...' : 'Enviar Notificação'}
          </button>
        </div>
      </motion.div>

      {/* History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card !p-0 overflow-hidden"
      >
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h2 className="font-semibold">Histórico de Envios</h2>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-8 py-1.5 text-xs w-40"
              />
            </div>
            <div className="flex gap-1">
              {['Todos', ...TYPES].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    typeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'glass border-transparent hover:bg-accent',
                  )}
                >
                  {t === 'Todos' ? 'Todos' : TYPE_CONFIG[t]?.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-border/30">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="h-3 bg-white/10 rounded w-48 mb-2" />
                <div className="h-3 bg-white/5 rounded w-full" />
              </div>
            ))
          ) : filtered.length > 0 ? (
            filtered.map((n: any) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.INFO;
              const rate = n.totalCount > 0 ? Math.round((n.readCount / n.totalCount) * 100) : 0;
              return (
                <div key={n.id} className="p-4 hover:bg-accent/50 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', cfg.bg, cfg.color)}>
                          {cfg.label}
                        </span>
                        {n.targetRole && (
                          <span className="text-[10px] text-muted-foreground glass px-1.5 py-0.5 rounded-full">
                            {ROLE_LABELS[n.targetRole]}
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-sm mt-1.5">{n.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.body}</div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(n.sentAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          {n.readCount}/{n.totalCount} lidas ({rate}%)
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(n.id)}
                      className="w-8 h-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center transition-all flex-shrink-0 group"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação encontrada</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
