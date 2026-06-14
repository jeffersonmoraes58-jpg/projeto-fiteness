'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User, Camera, Mail, Phone, MapPin, Award,
  Bell, Shield, LogOut, Save, Edit2, ChevronRight,
  Globe, Star, CreditCard, Eye, EyeOff, X,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

export default function TrainerSettings() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['trainer-profile'],
    queryFn: () => api.get('/users/me').then((r) => r.data.data),
  });

  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', city: '', state: '', bio: '',
    cref: '', specialties: '', experienceYears: '',
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.patch('/auth/change-password', data),
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!');
      setShowSecurity(false);
      setPwForm({ current: '', newPw: '', confirm: '' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(msg === 'Senha atual incorreta' ? 'Senha atual incorreta' : 'Erro ao alterar senha');
    },
  });

  const handleChangePassword = () => {
    if (pwForm.newPw.length < 8) return toast.error('A nova senha deve ter no mínimo 8 caracteres');
    if (pwForm.newPw !== pwForm.confirm) return toast.error('As senhas não coincidem');
    changePasswordMutation.mutate({ currentPassword: pwForm.current, newPassword: pwForm.newPw });
  };

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch('/trainers/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-profile'] });
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
      await api.put('/users/me/profile', { avatarUrl: data.url ?? data.data?.url });
      queryClient.invalidateQueries({ queryKey: ['trainer-profile'] });
      toast.success('Foto atualizada!');
    } catch {
      toast.error('Erro ao enviar foto');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startEdit = () => {
    setForm({
      firstName: profile?.profile?.firstName || '',
      lastName: profile?.profile?.lastName || '',
      phone: profile?.profile?.phone || '',
      city: profile?.profile?.city || '',
      state: profile?.profile?.state || '',
      bio: profile?.profile?.bio || '',
      cref: profile?.trainer?.cref || '',
      specialties: profile?.trainer?.specialties?.join(', ') || '',
      experienceYears: profile?.trainer?.experienceYears?.toString() || '',
    });
    setEditing(true);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="page-header">
        <h1 className="text-2xl font-bold">Configurações</h1>
        {!editing ? (
          <button onClick={startEdit} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <Edit2 className="w-4 h-4" /> Editar perfil
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
            <button
              onClick={() => updateMutation.mutate({
                profile: { firstName: form.firstName, lastName: form.lastName, phone: form.phone, city: form.city, state: form.state, bio: form.bio },
                trainer: { cref: form.cref, experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined, specialties: form.specialties.split(',').map((s) => s.trim()).filter(Boolean) },
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
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
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
          <div className="text-xl font-bold">{fullName || 'Personal Trainer'}</div>
          <div className="text-sm text-muted-foreground">{user?.email}</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="text-xs text-purple-400 font-medium">Personal Trainer</div>
            {profile?.trainer?.rating > 0 && (
              <div className="flex items-center gap-1 text-xs text-yellow-400">
                <Star className="w-3 h-3" />{profile.trainer.rating.toFixed(1)}
              </div>
            )}
          </div>
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
              <input type="text" placeholder="Estado (SP)" maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="input-field" />
            </div>
            <textarea placeholder="Bio / Apresentação" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="input-field resize-none" rows={3} />
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { icon: User, label: 'Nome completo', value: fullName },
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
            {profile?.profile?.bio && (
              <div className="pt-2 border-t border-border/50">
                <div className="text-xs text-muted-foreground mb-1">Bio</div>
                <p className="text-sm">{profile.profile.bio}</p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Professional info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card">
        <h2 className="font-semibold mb-4">Dados Profissionais</h2>
        {editing ? (
          <div className="space-y-3">
            <input placeholder="CREF (ex: 012345-G/SP)" value={form.cref} onChange={(e) => setForm({ ...form, cref: e.target.value })} className="input-field" />
            <input placeholder="Especialidades (separadas por vírgula)" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} className="input-field" />
            <input type="number" placeholder="Anos de experiência" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} className="input-field" />
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { icon: Award, label: 'CREF', value: profile?.trainer?.cref || '—' },
              { icon: Globe, label: 'Especialidades', value: profile?.trainer?.specialties?.join(', ') || '—' },
              { icon: User, label: 'Experiência', value: profile?.trainer?.experienceYears ? `${profile.trainer.experienceYears} anos` : '—' },
              { icon: Star, label: 'Avaliação', value: profile?.trainer?.rating ? `${profile.trainer.rating.toFixed(1)} / 5.0` : '—' },
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

      {/* Preferences */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card">
        <h2 className="font-semibold mb-3">Preferências</h2>
        <div className="space-y-1">
          {[
            { icon: Bell, label: 'Notificações', description: 'Alertas, lembretes e novidades', onClick: undefined },
            { icon: Shield, label: 'Segurança', description: 'Senha e autenticação em dois fatores', onClick: () => setShowSecurity(true) },
            { icon: CreditCard, label: 'Plano e Cobrança', description: 'Gerenciar assinatura', onClick: () => router.push('/trainer/billing') },
          ].map((item) => (
            <button key={item.label} onClick={item.onClick} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all text-left">
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

      {/* Security modal */}
      {showSecurity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="font-semibold text-lg">Alterar Senha</h2>
              </div>
              <button onClick={() => setShowSecurity(false)} className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Senha atual</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={pwForm.current}
                    onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                    className="input-field pr-10"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nova senha</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={pwForm.newPw}
                    onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                    className="input-field pr-10"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Confirmar nova senha</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                    className="input-field pr-10"
                    placeholder="Repita a nova senha"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowSecurity(false)} className="btn-secondary flex-1 py-2.5">Cancelar</button>
              <button
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending || !pwForm.current || !pwForm.newPw || !pwForm.confirm}
                className="btn-primary flex-1 py-2.5"
              >
                {changePasswordMutation.isPending ? 'Salvando...' : 'Alterar senha'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
