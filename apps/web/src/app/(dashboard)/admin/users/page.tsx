'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Plus, Users, Dumbbell, Apple, UserCog,
  Shield, MoreVertical, ChevronDown, CheckCircle2,
  XCircle, Mail, Calendar, Filter, Download,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const ROLES = ['Todos', 'TRAINER', 'NUTRITIONIST', 'STUDENT', 'ADMIN', 'STUDIO_OWNER'];
const ROLE_LABELS: Record<string, string> = {
  TRAINER: 'Trainer', NUTRITIONIST: 'Nutricionista', STUDENT: 'Aluno',
  ADMIN: 'Admin', STUDIO_OWNER: 'Proprietário',
};
const ROLE_COLORS: Record<string, string> = {
  TRAINER: 'bg-purple-500/10 text-purple-400',
  NUTRITIONIST: 'bg-emerald-500/10 text-emerald-400',
  STUDENT: 'bg-cyan-500/10 text-cyan-400',
  ADMIN: 'bg-red-500/10 text-red-400',
  STUDIO_OWNER: 'bg-yellow-500/10 text-yellow-400',
};
const ROLE_ICONS: Record<string, any> = {
  TRAINER: Dumbbell, NUTRITIONIST: Apple, STUDENT: Users,
  ADMIN: Shield, STUDIO_OWNER: UserCog,
};

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, statusFilter, page],
    queryFn: () => api.get(`/admin/users?search=${search}&role=${roleFilter === 'Todos' ? '' : roleFilter}&page=${page}&limit=${PER_PAGE}`).then((r) => r.data.data),
  });

  const users = data?.users || data || [];
  const total = data?.total ?? users.length;

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/admin/users/${id}`, { isActive }),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(isActive ? 'Usuário ativado' : 'Usuário desativado');
    },
    onError: () => toast.error('Erro ao atualizar usuário'),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/admin/users/${id}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Perfil atualizado');
    },
    onError: () => toast.error('Erro ao atualizar perfil'),
  });

  const filtered = users.filter((u: any) => {
    const name = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''} ${u.email || ''}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchStatus = statusFilter === 'Todos' || (statusFilter === 'Ativo' && u.isActive) || (statusFilter === 'Inativo' && !u.isActive);
    return matchSearch && matchStatus;
  });

  const roleCounts = ROLES.slice(1).map((r) => ({
    role: r,
    count: users.filter((u: any) => u.role === r).length,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">{total.toLocaleString('pt-BR')} usuários na plataforma</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2 text-sm py-2">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button className="btn-primary flex items-center gap-2 text-sm py-2">
            <Plus className="w-4 h-4" />
            Novo usuário
          </button>
        </div>
      </div>

      {/* Role stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {roleCounts.map((r, i) => {
          const Icon = ROLE_ICONS[r.role] || Users;
          return (
            <motion.button
              key={r.role}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => setRoleFilter(roleFilter === r.role ? 'Todos' : r.role)}
              className={cn(
                'glass-card flex items-center gap-3 transition-all text-left',
                roleFilter === r.role && 'ring-1 ring-primary',
              )}
            >
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', ROLE_COLORS[r.role])}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold">{r.count}</div>
                <div className="text-[11px] text-muted-foreground">{ROLE_LABELS[r.role]}</div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2">
          {['Todos', 'Ativo', 'Inativo'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
                statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'glass border-transparent hover:bg-accent',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card !p-0 overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_80px] gap-4 px-4 py-3 border-b border-border/50 text-xs text-muted-foreground font-medium">
          <span>Usuário</span>
          <span>E-mail</span>
          <span>Perfil</span>
          <span>Tenant</span>
          <span>Último acesso</span>
          <span className="text-center">Ações</span>
        </div>

        <div className="divide-y divide-border/30">
          {isLoading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_80px] gap-4 px-4 py-3 animate-pulse items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
                  <div className="h-3 bg-white/10 rounded w-32" />
                </div>
                {[...Array(4)].map((__, j) => <div key={j} className="h-3 bg-white/5 rounded" />)}
                <div className="h-6 bg-white/10 rounded-lg mx-auto w-16" />
              </div>
            ))
          ) : filtered.length > 0 ? (
            filtered.map((user: any, i: number) => (
              <UserRow
                key={user.id}
                user={user}
                index={i}
                onToggleActive={() => toggleActiveMutation.mutate({ id: user.id, isActive: !user.isActive })}
                onChangeRole={(role) => changeRoleMutation.mutate({ id: user.id, role })}
              />
            ))
          ) : (
            <div className="py-16 flex flex-col items-center gap-3">
              <Filter className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > PER_PAGE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              Mostrando {Math.min((page - 1) * PER_PAGE + 1, total)}–{Math.min(page * PER_PAGE, total)} de {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg glass text-sm disabled:opacity-40 hover:bg-accent transition-all"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * PER_PAGE >= total}
                className="px-3 py-1.5 rounded-lg glass text-sm disabled:opacity-40 hover:bg-accent transition-all"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({ user, index, onToggleActive, onChangeRole }: {
  user: any; index: number; onToggleActive: () => void; onChangeRole: (r: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const initials = `${user.profile?.firstName?.[0] || ''}${user.profile?.lastName?.[0] || user.email?.[0] || '?'}`.toUpperCase();
  const colorClass = ROLE_COLORS[user.role] || 'bg-white/10 text-white';
  const lastLogin = user.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : 'Nunca';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
      className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_80px] gap-4 px-4 py-3 hover:bg-accent/50 transition-all items-center text-sm"
    >
      {/* Name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {user.profile?.avatarUrl
            ? <img src={user.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            : initials}
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">
            {user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}` : 'Sem nome'}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            {user.isActive
              ? <><CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />Ativo</>
              : <><XCircle className="w-2.5 h-2.5 text-red-400" />Inativo</>
            }
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="flex items-center gap-1.5 min-w-0">
        <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground truncate">{user.email}</span>
      </div>

      {/* Role */}
      <div className="relative">
        <button
          onClick={() => setRoleMenuOpen(!roleMenuOpen)}
          className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium', colorClass)}
        >
          {ROLE_LABELS[user.role] || user.role}
          <ChevronDown className="w-3 h-3" />
        </button>
        {roleMenuOpen && (
          <div className="absolute left-0 top-7 bg-card border border-border rounded-xl shadow-xl z-20 py-1 w-36">
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => { onChangeRole(key); setRoleMenuOpen(false); }}
                className={cn('w-full text-left px-3 py-2 text-xs hover:bg-accent transition-all', user.role === key && 'text-primary')}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tenant */}
      <div className="text-xs text-muted-foreground truncate">
        {user.tenant?.name || '—'}
      </div>

      {/* Last login */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Calendar className="w-3 h-3" />
        {lastLogin}
      </div>

      {/* Actions */}
      <div className="flex justify-center relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-9 bg-card border border-border rounded-xl shadow-xl z-20 py-1 w-40">
            <button
              onClick={() => { onToggleActive(); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-all"
            >
              {user.isActive
                ? <><XCircle className="w-3.5 h-3.5 text-red-400" />Desativar</>
                : <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />Ativar</>
              }
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              Enviar e-mail
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
