'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Building2, ChevronLeft, ChevronRight, Download,
  Zap, MessageCircle, Bell, Trophy, Apple, Brain, Users, UserPlus,
  X, Save, Loader2, ToggleLeft, ToggleRight, Settings,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const FEATURE_LABELS: Record<string, string> = {
  enableAI: 'IA Fitness',
  enableChat: 'Chat',
  enableNotifications: 'Notificações',
  enableGamification: 'Gamificação',
  enableNutrition: 'Nutrição',
  allowStudentSelfSignup: 'Auto-cadastro de alunos',
};

const FEATURE_ICONS: Record<string, any> = {
  enableAI: Brain,
  enableChat: MessageCircle,
  enableNotifications: Bell,
  enableGamification: Trophy,
  enableNutrition: Apple,
  allowStudentSelfSignup: UserPlus,
};

export default function AdminTenantSettings() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const limit = 20;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenant-settings', search, page],
    queryFn: () =>
      api.get('/admin/tenant-settings', { params: { search, page, limit } })
        .then((r) => r.data.data ?? r.data),
  });

  const settings = (data?.settings ?? data ?? []) as any[];
  const total = data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const updateMutation = useMutation({
    mutationFn: ({ tenantId, ...data }: any) =>
      api.patch(`/admin/tenant-settings/${tenantId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tenant-settings'] });
      setEditingId(null);
      toast.success('Configurações salvas!');
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  function startEdit(s: any) {
    setEditingId(s.tenantId);
    setEditData({
      enableAI: s.enableAI,
      enableChat: s.enableChat,
      enableNotifications: s.enableNotifications,
      enableGamification: s.enableGamification,
      enableNutrition: s.enableNutrition,
      allowStudentSelfSignup: s.allowStudentSelfSignup,
      maxStudents: s.maxStudents,
      maxTrainers: s.maxTrainers,
    });
  }

  function toggle(key: string) {
    setEditData((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function saveEdit(tenantId: string) {
    updateMutation.mutate({ tenantId, ...editData });
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Feature Flags por Tenant</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie funcionalidades habilitadas para cada academia
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por nome do tenant..."
          className="input-field pl-9"
        />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse h-20" />
          ))
        ) : settings.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
            <Settings className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhum tenant encontrado.</p>
          </div>
        ) : (
          settings.map((s: any) => (
            <div key={s.tenantId} className="glass-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{s.tenant?.name || 'Sem nome'}</div>
                    <div className="text-xs text-muted-foreground">
                      maxStudents: {s.maxStudents} · maxTrainers: {s.maxTrainers}
                    </div>
                  </div>
                </div>
                {editingId === s.tenantId ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Cancelar
                    </button>
                    <button
                      onClick={() => saveEdit(s.tenantId)}
                      disabled={updateMutation.isPending}
                      className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1 disabled:opacity-50"
                    >
                      {updateMutation.isPending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Save className="w-3.5 h-3.5" />}
                      Salvar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(s)}
                    className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"
                  >
                    <Settings className="w-3.5 h-3.5" /> Editar
                  </button>
                )}
              </div>

              {/* Feature toggles */}
              {editingId === s.tenantId ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['enableAI', 'enableChat', 'enableNotifications', 'enableGamification', 'enableNutrition', 'allowStudentSelfSignup'].map((key) => {
                      const Icon = FEATURE_ICONS[key];
                      return (
                        <button
                          key={key}
                          onClick={() => toggle(key)}
                          className={cn(
                            'flex items-center gap-2 p-2 rounded-xl border transition-all text-sm',
                            editData[key]
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-white/5 border-white/10 text-muted-foreground',
                          )}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs">{FEATURE_LABELS[key]}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Máx. Alunos</label>
                      <input
                        type="number"
                        value={editData.maxStudents ?? ''}
                        onChange={(e) => setEditData((p) => ({ ...p, maxStudents: Number(e.target.value) }))}
                        className="input-field text-sm py-1.5"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Máx. Trainers</label>
                      <input
                        type="number"
                        value={editData.maxTrainers ?? ''}
                        onChange={(e) => setEditData((p) => ({ ...p, maxTrainers: Number(e.target.value) }))}
                        className="input-field text-sm py-1.5"
                        min={0}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {['enableAI', 'enableChat', 'enableNotifications', 'enableGamification', 'enableNutrition', 'allowStudentSelfSignup'].map((key) => {
                    const Icon = FEATURE_ICONS[key];
                    const enabled = s[key];
                    return (
                      <span
                        key={key}
                        className={cn(
                          'text-xs px-2 py-1 rounded-full flex items-center gap-1',
                          enabled
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-white/5 text-muted-foreground/50 border border-white/5',
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {FEATURE_LABELS[key]}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </motion.div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {total} tenants · Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = totalPages <= 5 ? i + 1 : page > totalPages - 3 ? totalPages - 4 + i : Math.max(1, page - 2) + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'w-7 h-7 rounded-lg text-xs font-medium transition-all',
                    pageNum === page ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground',
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center disabled:opacity-30 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}