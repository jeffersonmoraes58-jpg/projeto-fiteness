'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot, MessageSquare, Trophy, Zap,
  Mail, Globe, Server, Save, Database, Bell,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-all',
        enabled ? 'bg-primary' : 'bg-white/10',
      )}
    >
      <div className={cn(
        'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all',
        enabled ? 'left-6' : 'left-1',
      )} />
    </button>
  );
}

type Features = {
  aiEnabled: boolean;
  chatEnabled: boolean;
  gamificationEnabled: boolean;
  videoEnabled: boolean;
  nutritionEnabled: boolean;
  notificationsEnabled: boolean;
};

type Limits = {
  maxStudentsPerTrainer: number;
  maxPatientsPerNutritionist: number;
  maxStorageGb: number;
  aiRequestsPerDay: number;
};

type Email = {
  fromName: string;
  fromAddress: string;
  smtpHost: string;
  smtpPort: string;
};

const DEFAULT_FEATURES: Features = {
  aiEnabled: true,
  chatEnabled: true,
  gamificationEnabled: true,
  videoEnabled: false,
  nutritionEnabled: true,
  notificationsEnabled: true,
};

const DEFAULT_LIMITS: Limits = {
  maxStudentsPerTrainer: 50,
  maxPatientsPerNutritionist: 40,
  maxStorageGb: 10,
  aiRequestsPerDay: 100,
};

const DEFAULT_EMAIL: Email = {
  fromName: 'Fitlynutri',
  fromAddress: 'noreply@fitlynutri.com.br',
  smtpHost: '',
  smtpPort: '',
};

export default function AdminSettings() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery<any>({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/admin/settings').then((r) => r.data?.data ?? r.data),
  });

  const [features, setFeatures] = useState<Features>(DEFAULT_FEATURES);
  const [limits, setLimits] = useState<Limits>(DEFAULT_LIMITS);
  const [email, setEmail] = useState<Email>(DEFAULT_EMAIL);

  useEffect(() => {
    if (!settings) return;
    setFeatures({
      aiEnabled: settings.aiEnabled ?? true,
      chatEnabled: settings.chatEnabled ?? true,
      gamificationEnabled: settings.gamificationEnabled ?? true,
      videoEnabled: settings.videoEnabled ?? false,
      nutritionEnabled: settings.nutritionEnabled ?? true,
      notificationsEnabled: settings.notificationsEnabled ?? true,
    });
    setLimits({
      maxStudentsPerTrainer: settings.maxStudentsPerTrainer ?? 50,
      maxPatientsPerNutritionist: settings.maxPatientsPerNutritionist ?? 40,
      maxStorageGb: settings.maxStorageGb ?? 10,
      aiRequestsPerDay: settings.aiRequestsPerDay ?? 100,
    });
    setEmail({
      fromName: settings.emailFromName ?? 'Fitlynutri',
      fromAddress: settings.emailFromAddress ?? 'noreply@fitlynutri.com.br',
      smtpHost: settings.smtpHost ?? '',
      smtpPort: settings.smtpPort ?? '',
    });
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.patch('/admin/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Configurações salvas');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações da Plataforma</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie funcionalidades e comportamentos globais</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
      >
        <div className="flex items-center gap-2 mb-5">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Funcionalidades</h2>
        </div>
        <div className="space-y-1">
          {[
            { key: 'aiEnabled', label: 'IA Fitness / Nutrição', description: 'Sugestões inteligentes de treinos e dietas', icon: Bot },
            { key: 'chatEnabled', label: 'Chat em tempo real', description: 'Mensagens entre trainers, nutricionistas e alunos', icon: MessageSquare },
            { key: 'gamificationEnabled', label: 'Gamificação', description: 'Pontos, conquistas, desafios e ranking', icon: Trophy },
            { key: 'videoEnabled', label: 'Chamadas de vídeo', description: 'Consultas e aulas por videochamada', icon: Globe },
            { key: 'nutritionEnabled', label: 'Módulo Nutrição', description: 'Dietas, alimentos e acompanhamento nutricional', icon: Database },
            { key: 'notificationsEnabled', label: 'Push Notifications', description: 'Notificações para dispositivos móveis', icon: Bell },
          ].map((f) => (
            <div key={f.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-accent/50 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium">{f.label}</div>
                  <div className="text-xs text-muted-foreground">{f.description}</div>
                </div>
              </div>
              <Toggle
                enabled={features[f.key as keyof Features]}
                onChange={(v) => setFeatures({ ...features, [f.key]: v })}
              />
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-border/50 mt-4">
          <button
            onClick={() => saveMutation.mutate({ features })}
            disabled={saveMutation.isPending}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar funcionalidades'}
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card"
      >
        <div className="flex items-center gap-2 mb-5">
          <Server className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Limites Padrão</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'maxStudentsPerTrainer', label: 'Alunos por Trainer', unit: 'alunos' },
            { key: 'maxPatientsPerNutritionist', label: 'Pacientes por Nutricionista', unit: 'pacientes' },
            { key: 'maxStorageGb', label: 'Armazenamento por Tenant', unit: 'GB' },
            { key: 'aiRequestsPerDay', label: 'Requisições IA/dia', unit: 'req' },
          ].map((l) => (
            <div key={l.key}>
              <label className="text-xs text-muted-foreground mb-1 block">{l.label}</label>
              <div className="relative">
                <input
                  type="number"
                  value={limits[l.key as keyof Limits]}
                  onChange={(e) => setLimits({ ...limits, [l.key]: Number(e.target.value) })}
                  className="input-field pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{l.unit}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-border/50 mt-4">
          <button
            onClick={() => saveMutation.mutate({ limits })}
            disabled={saveMutation.isPending}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Save className="w-4 h-4" />
            Salvar limites
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card"
      >
        <div className="flex items-center gap-2 mb-5">
          <Mail className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Configurações de E-mail</h2>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome remetente</label>
              <input
                type="text"
                value={email.fromName}
                onChange={(e) => setEmail({ ...email, fromName: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">E-mail remetente</label>
              <input
                type="email"
                value={email.fromAddress}
                onChange={(e) => setEmail({ ...email, fromAddress: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">SMTP Host</label>
              <input
                type="text"
                value={email.smtpHost}
                onChange={(e) => setEmail({ ...email, smtpHost: e.target.value })}
                className="input-field"
                placeholder="smtp.sendgrid.net"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">SMTP Port</label>
              <input
                type="text"
                value={email.smtpPort}
                onChange={(e) => setEmail({ ...email, smtpPort: e.target.value })}
                className="input-field"
                placeholder="587"
              />
            </div>
          </div>
        </div>
        <div className="pt-4 border-t border-border/50 mt-4">
          <button
            onClick={() => saveMutation.mutate({ email })}
            disabled={saveMutation.isPending}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Save className="w-4 h-4" />
            Salvar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
