'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Camera, Mail, Phone, MapPin, Calendar,
  Shield, Bell, Palette, LogOut, ChevronRight,
  Save, Edit2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

export default function StudentProfile() {
  const { user, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['student-profile'],
    queryFn: () => api.get('/users/me').then((r) => r.data.data),
  });

  const [form, setForm] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    phone: '',
    city: '',
    state: '',
    bio: '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch('/users/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      setEditing(false);
    },
  });

  const fullName = `${profile?.profile?.firstName || user?.profile?.firstName || ''} ${profile?.profile?.lastName || user?.profile?.lastName || ''}`.trim();
  const initials = fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const settingsGroups = [
    {
      title: 'Conta',
      items: [
        { icon: Bell, label: 'Notificações', description: 'Gerenciar alertas e lembretes' },
        { icon: Shield, label: 'Privacidade e Segurança', description: 'Senha, 2FA e privacidade' },
        { icon: Palette, label: 'Aparência', description: 'Tema e preferências visuais' },
      ],
    },
    {
      title: 'Suporte',
      items: [
        { icon: Mail, label: 'Fale Conosco', description: 'Entre em contato com o suporte' },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Perfil</h1>
        {!editing ? (
          <button
            onClick={() => {
              setForm({
                firstName: profile?.profile?.firstName || '',
                lastName: profile?.profile?.lastName || '',
                phone: profile?.profile?.phone || '',
                city: profile?.profile?.city || '',
                state: profile?.profile?.state || '',
                bio: profile?.profile?.bio || '',
              });
              setEditing(true);
            }}
            className="btn-secondary flex items-center gap-2 text-sm py-2"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn-secondary text-sm py-2 px-4">
              Cancelar
            </button>
            <button
              onClick={() => updateMutation.mutate({ profile: form })}
              disabled={updateMutation.isPending}
              className="btn-primary flex items-center gap-2 text-sm py-2"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>

      {/* Avatar + basic info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card flex items-center gap-5"
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {profile?.profile?.avatarUrl
              ? <img src={profile.profile.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
              : initials || <User className="w-8 h-8" />
            }
          </div>
          <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-lg flex items-center justify-center hover:bg-primary/80 transition-all">
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <div>
          <div className="text-xl font-bold">{fullName || 'Aluno'}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{user?.email}</div>
          <div className="text-xs text-primary mt-1.5 font-medium">Aluno</div>
        </div>
      </motion.div>

      {/* Personal info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card"
      >
        <h2 className="font-semibold mb-4">Informações Pessoais</h2>
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sobrenome</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cidade</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Estado</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="input-field"
                  maxLength={2}
                  placeholder="SP"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="input-field resize-none"
                rows={3}
                placeholder="Conte um pouco sobre você..."
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { icon: User, label: 'Nome completo', value: fullName },
              { icon: Mail, label: 'E-mail', value: user?.email },
              { icon: Phone, label: 'Telefone', value: profile?.profile?.phone || '—' },
              { icon: MapPin, label: 'Localização', value: [profile?.profile?.city, profile?.profile?.state].filter(Boolean).join(', ') || '—' },
              { icon: Calendar, label: 'Membro desde', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '—' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-medium truncate">{item.value || '—'}</div>
                </div>
              </div>
            ))}
            {profile?.profile?.bio && (
              <div className="pt-2 border-t border-border/50">
                <div className="text-xs text-muted-foreground mb-1">Bio</div>
                <p className="text-sm">{profile.profile.bio}</p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Settings */}
      {settingsGroups.map((group, gi) => (
        <motion.div
          key={group.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + gi * 0.1 }}
          className="glass-card"
        >
          <h2 className="font-semibold mb-3">{group.title}</h2>
          <div className="space-y-1">
            {group.items.map((item) => (
              <button
                key={item.label}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl glass text-destructive hover:bg-destructive/10 transition-all font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sair da conta
        </button>
      </motion.div>
    </div>
  );
}
