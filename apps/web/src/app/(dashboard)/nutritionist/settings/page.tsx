'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User, Camera, Mail, Phone, MapPin, Award,
  Bell, Shield, LogOut, Save, Edit2, ChevronRight, Globe,
  Eye, EyeOff, X, Trash2, CheckCheck, Palette, Sun, Moon, Monitor, Check,
  CreditCard,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

export default function NutritionistSettings() {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const saved = localStorage.getItem('accent-color');
    if (saved) {
      document.documentElement.style.setProperty('--primary', saved);
      document.documentElement.style.setProperty('--ring', saved);
    }
  }, []);

  const { data: profile } = useQuery({
    queryKey: ['nutritionist-profile'],
    queryFn: () => api.get('/users/me').then((r) => r.data.data),
  });

  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', city: '', state: '', bio: '',
    crn: '', specialties: '', experienceYears: '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch('/nutritionists/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutritionist-profile'] });
      setEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: () => toast.error('Erro ao atualizar perfil'),
  });

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data.data ?? []),
    enabled: showNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Todas marcadas como lidas');
    },
  });

  const deleteNotifMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
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
      queryClient.invalidateQueries({ queryKey: ['nutritionist-profile'] });
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
      crn: profile?.nutritionist?.crn || '',
      specialties: profile?.nutritionist?.specialties?.join(', ') || '',
      experienceYears: profile?.nutritionist?.experienceYears?.toString() || '',
    });
    setEditing(true);
  };

  const preferences = [
    { icon: CreditCard, label: 'Plano e Cobrança', description: 'Seu plano Fitlynutri', onClick: () => router.push('/nutritionist/subscription') },
    { icon: Bell, label: 'Notificações', description: 'Alertas e lembretes', onClick: () => setShowNotifications(true) },
    { icon: Shield, label: 'Segurança', description: 'Senha e autenticação', onClick: () => setShowSecurity(true) },
    { icon: Palette, label: 'Aparência', description: 'Tema e cor de destaque', onClick: () => setShowAppearance(true) },
  ];

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
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
          <button onClick={() => fileInputRef.current?.click()} disabled={avatarUploading} className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-lg flex items-center justify-center hover:bg-primary/80 transition-all disabled:opacity-60">
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

      {/* Preferences */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card">
        <h2 className="font-semibold mb-3">Preferências</h2>
        <div className="space-y-1">
          {preferences.map((item) => (
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
        <button onClick={() => logout()} className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl glass text-destructive hover:bg-destructive/10 transition-all font-medium">
          <LogOut className="w-4 h-4" />
          Sair da conta
        </button>
      </motion.div>

      {/* Appearance modal */}
      {showAppearance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/20 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="font-semibold text-lg">Aparência</h2>
              </div>
              <button onClick={() => setShowAppearance(false)} className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-5">
              <div>
                <p className="text-xs text-muted-foreground mb-3">Tema</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'light', label: 'Claro', icon: Sun, preview: 'bg-white border-gray-200' },
                    { value: 'dark', label: 'Escuro', icon: Moon, preview: 'bg-gray-950 border-gray-800' },
                    { value: 'system', label: 'Sistema', icon: Monitor, preview: 'bg-gradient-to-br from-white to-gray-950 border-gray-400' },
                  ].map((t) => (
                    <button key={t.value} onClick={() => setTheme(t.value)} className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${theme === t.value ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-border bg-white/5'}`}>
                      <div className={`w-full h-12 rounded-lg border ${t.preview}`} />
                      <div className="flex items-center gap-1.5">
                        <t.icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">{t.label}</span>
                        {theme === t.value && <Check className="w-3 h-3 text-primary" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-3">Cor de destaque</p>
                <div className="flex gap-3">
                  {[
                    { label: 'Roxo', value: '252 87% 65%', bg: 'bg-[hsl(252,87%,65%)]' },
                    { label: 'Azul', value: '217 91% 60%', bg: 'bg-[hsl(217,91%,60%)]' },
                    { label: 'Verde', value: '142 76% 36%', bg: 'bg-[hsl(142,76%,36%)]' },
                    { label: 'Rosa', value: '330 81% 60%', bg: 'bg-[hsl(330,81%,60%)]' },
                    { label: 'Laranja', value: '25 95% 53%', bg: 'bg-[hsl(25,95%,53%)]' },
                  ].map((color) => (
                    <button key={color.value} title={color.label} onClick={() => { document.documentElement.style.setProperty('--primary', color.value); document.documentElement.style.setProperty('--ring', color.value); localStorage.setItem('accent-color', color.value); }} className={`w-8 h-8 rounded-full border-2 border-transparent hover:scale-110 transition-all ${color.bg}`} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground/60 mt-2">A cor é salva localmente no seu dispositivo</p>
              </div>
            </div>
            <button onClick={() => setShowAppearance(false)} className="btn-primary w-full mt-6 py-2.5">Fechar</button>
          </motion.div>
        </div>
      )}

      {/* Notifications modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="font-semibold text-lg">Notificações</h2>
              </div>
              <div className="flex items-center gap-2">
                {notifications.some((n) => !n.isRead) && (
                  <button onClick={() => markAllReadMutation.mutate()} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                    <CheckCheck className="w-4 h-4" /> Marcar todas
                  </button>
                )}
                <button onClick={() => setShowNotifications(false)} className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Nenhuma notificação
                </div>
              ) : notifications.map((n: any) => (
                <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl transition-all ${n.isRead ? 'bg-white/3' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.isRead ? 'bg-transparent' : 'bg-emerald-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
                    <div className="text-xs text-muted-foreground/60 mt-1">
                      {new Date(n.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!n.isRead && (
                      <button onClick={() => markReadMutation.mutate(n.id)} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-emerald-400 hover:text-emerald-300">
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => deleteNotifMutation.mutate(n.id)} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Security modal */}
      {showSecurity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="font-semibold text-lg">Alterar Senha</h2>
              </div>
              <button onClick={() => setShowSecurity(false)} className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Senha atual', key: 'current' as const, show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
                { label: 'Nova senha', key: 'newPw' as const, show: showNew, toggle: () => setShowNew(!showNew) },
                { label: 'Confirmar nova senha', key: 'confirm' as const, show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                  <div className="relative">
                    <input type={field.show ? 'text' : 'password'} value={pwForm[field.key]} onChange={(e) => setPwForm({ ...pwForm, [field.key]: e.target.value })} className="input-field pr-10" placeholder="••••••••" />
                    <button type="button" onClick={field.toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowSecurity(false)} className="btn-secondary flex-1 py-2.5">Cancelar</button>
              <button onClick={handleChangePassword} disabled={changePasswordMutation.isPending || !pwForm.current || !pwForm.newPw || !pwForm.confirm} className="btn-primary flex-1 py-2.5">
                {changePasswordMutation.isPending ? 'Salvando...' : 'Alterar senha'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
