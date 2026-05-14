'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Bot, MessageSquare, Trophy, Zap,
  Mail, Globe, Shield, Key, Save, Copy,
  ChevronRight, AlertTriangle, CheckCircle2,
  Database, Server, Palette, Bell,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

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

export default function AdminSettings() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/admin/settings').then((r) => r.data.data),
  });

  const [features, setFeatures] = useState({
    aiEnabled: settings?.aiEnabled ?? true,
    chatEnabled: settings?.chatEnabled ?? true,
    gamificationEnabled: settings?.gamificationEnabled ?? true,
    videoEnabled: settings?.videoEnabled ?? false,
    nutritionEnabled: settings?.nutritionEnabled ?? true,
    notificationsEnabled: settings?.notificationsEnabled ?? true,
  });

  const [email, setEmail] = useState({
    fromName: settings?.emailFromName || 'FitSaaS',
    fromAddress: settings?.emailFromAddress || 'noreply@fitsaas.com.br',
    smtpHost: settings?.smtpHost || 'smtp.sendgrid.net',
    smtpPort: settings?.smtpPort || '587',
  });

  const [limits, setLimits] = useState({
    maxStudentsPerTrainer: settings?.maxStudentsPerTrainer || 50,
    maxPatientsPerNutritionist: settings?.maxPatientsPerNutritionist || 40,
    maxStorageGb: settings?.maxStorageGb || 10,
    aiRequestsPerDay: settings?.aiRequestsPerDay || 100,
  });

  const [copied, setCopied] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.patch('/admin/settings', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-settings'] }),
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const apiKeys = [
    { label: 'Chave Pública API', key: 'pub_k_2Fh7xNqmPwRvBs9Lc4Ky', type: 'public' },
    { label: 'Chave Secreta API', key: 'sk_live_••••••••••••••••••••••••••••', type: 'secret' },
    { label: 'Webhook Secret', key: 'whsec_••••••••••••••••••••••', type: 'webhook' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações da Plataforma</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie funcionalidades e comportamentos globais</p>
      </div>

      {/* Feature flags */}
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
                enabled={features[f.key as keyof typeof features]}
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

      {/* Platform limits */}
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
                  value={limits[l.key as keyof typeof limits]}
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

      {/* Email settings */}
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
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">SMTP Port</label>
              <input
                type="text"
                value={email.smtpPort}
                onChange={(e) => setEmail({ ...email, smtpPort: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
        </div>
        <div className="pt-4 border-t border-border/50 mt-4 flex gap-2">
          <button
            onClick={() => saveMutation.mutate({ email })}
            disabled={saveMutation.isPending}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Save className="w-4 h-4" />
            Salvar
          </button>
          <button className="btn-secondary flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4" />
            Enviar e-mail de teste
          </button>
        </div>
      </motion.div>

      {/* API keys */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card"
      >
        <div className="flex items-center gap-2 mb-5">
          <Key className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Chaves de API</h2>
        </div>
        <div className="space-y-3">
          {apiKeys.map((k) => (
            <div key={k.key} className="flex items-center gap-3 p-3 glass rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">{k.label}</div>
                <div className="font-mono text-sm truncate">{k.key}</div>
              </div>
              <button
                onClick={() => handleCopy(k.key, k.label)}
                className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-all flex-shrink-0"
              >
                {copied === k.label
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-orange-300">Nunca compartilhe a chave secreta. Regenerar a chave invalidará integrações existentes.</p>
        </div>
      </motion.div>

      {/* Security */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card"
      >
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Segurança</h2>
        </div>
        <div className="space-y-1">
          {[
            { label: 'Autenticação em dois fatores', description: 'Exigir 2FA para administradores' },
            { label: 'Logs de auditoria', description: 'Visualizar registros de ações administrativas' },
            { label: 'Sessões ativas', description: 'Gerenciar sessões abertas na plataforma' },
            { label: 'Política de senhas', description: 'Configurar requisitos mínimos de senha' },
          ].map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </motion.div>

      {/* Danger zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card border border-red-500/20"
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h2 className="font-semibold text-red-400">Zona de Perigo</h2>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Limpar cache da plataforma', description: 'Remove todos os dados em cache', action: 'Limpar cache' },
            { label: 'Exportar todos os dados', description: 'Download completo do banco de dados', action: 'Exportar' },
            { label: 'Modo de manutenção', description: 'Exibe página de manutenção para todos os usuários', action: 'Ativar' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 p-3 glass rounded-xl">
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
              <button className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0 border border-red-500/30 text-red-400 hover:bg-red-500/10">
                {item.action}
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
