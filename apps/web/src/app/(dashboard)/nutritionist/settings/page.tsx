'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User, Camera, Mail, Phone, MapPin, Award,
  Bell, Shield, LogOut, Save, Edit2, ChevronRight, Globe,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

export default function NutritionistSettings() {
  const { user, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['nutritionist-profile'],
    queryFn: () => api.get('/users/me').then((r) => r.data.data),
  });

  const [form, setForm] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    phone: '',
    city: '',
    state: '',
    bio: '',
    crn: '',
    specialties: '',
    experienceYears: '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch('/users/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutritionist-profile'] });
      setEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: () => toast.error('Erro ao atualizar perfil'),
  });

  const fullName = `${profile?.profile?.firstName || user?.profile?.firstName || ''} ${profile?.profile?.lastName || user?.profile?.lastName || ''}`.trim();
  const initials = fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/uploads/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await api.patch('/users/me', { profile: { avatarUrl: data.data?.url || data.url } });
      queryClient.invalidateQueries({ queryKey: ['nutritionist-profile'] });
      toast.success('Foto atualizada!');
    } catch {
      toast.error('Erro ao enviar foto');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configurações</h1>
        {!editing ? (
          <button onClick={() => {
            setForm({
              firstName: profile?.profile?.firstName || '',
              lastName: profile?.profile?.lastName || '',
              phone: profile?.profile?.phone || '',
              city: profile?.profile?.city || '',
              state: profile?.profile?.state || '',
              bio: profile?.profile?.bio || '',
              crn: profile?.nutritionist?.crn || '',
              specialties: profile?.nutritionist?.specialties?.join(', ') || '',
              experienceYears: profile?.nutritionist?.experienceYears?.toString() || '',
            });
            setEditing(true);
          }} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <Edit2 className="w-4 h-4" />
            Editar perfil
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
            <button
              onClick={() => updateMutation.mutate({
                profile: { firstName: form.firstName, lastName: form.lastName, phone: form.phone, city: form.city, state: form.state, bio: form.bio },
                nutritionist: { crn: form.crn, experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined, specialties: form.specialties.split(',').map((s) => s.trim()).filter(Boolean) },
              })}
              disabled={updateMutation.isPending}
              className="btn-primary flex items-center gap-2 text-sm py-2"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>

      {/* Avatar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card flex items-center gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {profile?.profile?.avatarUrl
              ? <img src={profile.profile.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
              : initials || <User className="w-8 h-8" />}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-lg flex items-center justify-center hover:bg-primary/80 transition-all disabled:opacity-60"
          >
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <div>
          <div className="text-xl font-bold">{fullName || 'Nutricionista'}</div>
          <div className="text-sm text-muted-foreground">{user?.email}</div>
          <div className="text-xs text-emerald-400 mt-1 font-medium">Nutricionista</div>
        </div>
      </motion.div>

      {/* Personal info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card">
        <h2 className="font-semibold mb-4">Informações Pessoais</h2>
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sobrenome</label>
                <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="input-field" />
              </div>
            </div>
            <input type="tel" placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-field" />
              <input type="text" placeholder="Estado (SP)" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="input-field" maxLength={2} />
            </div>
            <textarea placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="input-field resize-none" rows={3} />
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { icon: User, label: 'Nome', value: fullName },
              { icon: Mail, label: 'E-mail', value: user?.email },
              { icon: Phone, label: 'Telefone', value: profile?.profile?.phone || '—' },
              { icon: MapPin, label: 'Localização', value: [profile?.profile?.city, profile?.profile?.state].filter(Boolean).join(', ') || '—' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-medium">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Professional info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card">
        <h2 className="font-semibold mb-4">Dados Profissionais</h2>
        {editing ? (
          <div className="space-y-3">
            <input placeholder="CRN (ex: CRN-3 12345)" value={form.crn} onChange={(e) => setForm({ ...form, crn: e.target.value })} className="input-field" />
            <input placeholder="Especialidades (separadas por vírgula)" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} className="input-field" />
            <input type="number" placeholder="Anos de experiência" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} className="input-field" />
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { icon: Award, label: 'CRN', value: profile?.nutritionist?.crn || '—' },
              { icon: Globe, label: 'Especialidades', value: profile?.nutritionist?.specialties?.join(', ') || '—' },
              { icon: User, label: 'Experiência', value: profile?.nutritionist?.experienceYears ? `${profile.nutritionist.experienceYears} anos` : '—' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-medium">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Other settings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card">
        <h2 className="font-semibold mb-3">Preferências</h2>
        <div className="space-y-1">
          {[
            { icon: Bell, label: 'Notificações', description: 'Alertas e lembretes' },
            { icon: Shield, label: 'Segurança', description: 'Senha e autenticação' },
          ].map((item) => (
            <button key={item.label} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all text-left">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4 text-muted-foreground" />
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
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
