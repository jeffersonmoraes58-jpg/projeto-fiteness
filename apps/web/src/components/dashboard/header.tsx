'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Search, Sun, Moon, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/store/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  INFO: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  WARNING: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  SUCCESS: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ALERT: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
};

export function DashboardHeader() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: unreadData } = useQuery({
    queryKey: ['unread-notifications-count'],
    queryFn: () => api.get('/notifications/unread-count').then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data.data),
    enabled: notifOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount: number = unreadData?.count ?? unreadData ?? 0;
  const notifList: any[] = Array.isArray(notifications) ? notifications : notifications?.notifications ?? [];
  const hasUnread = unreadCount > 0;

  return (
    <header className="h-16 border-b border-border/50 px-6 flex items-center justify-between bg-background/80 backdrop-blur-xl sticky top-0 z-20">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar alunos, treinos, dietas..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-9 h-9 rounded-xl hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative w-9 h-9 rounded-xl hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          >
            <Bell className="w-4 h-4" />
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-primary rounded-full text-[9px] text-white flex items-center justify-center font-bold px-0.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                  <span className="font-semibold text-sm">Notificações</span>
                  {hasUnread && (
                    <button
                      onClick={() => markAllReadMutation.mutate()}
                      disabled={markAllReadMutation.isPending}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Marcar todas como lidas
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto scrollbar-hide divide-y divide-border/30">
                  {notifList.length === 0 ? (
                    <div className="py-10 flex flex-col items-center gap-2">
                      <Bell className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                    </div>
                  ) : (
                    notifList.map((n: any) => {
                      const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.INFO;
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={n.id}
                          className={cn(
                            'flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-all group',
                            !n.isRead && 'bg-primary/5',
                          )}
                        >
                          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
                            <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
                          </div>
                          <div className="flex-1 min-w-0" onClick={() => !n.isRead && markReadMutation.mutate(n.id)}>
                            <div className={cn('text-sm leading-tight', !n.isRead && 'font-semibold')}>{n.title}</div>
                            {n.body && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>}
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {new Date(n.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            {!n.isRead && (
                              <button
                                onClick={() => markReadMutation.mutate(n.id)}
                                className="w-6 h-6 rounded-md hover:bg-accent flex items-center justify-center"
                                title="Marcar como lida"
                              >
                                <CheckCheck className="w-3 h-3 text-primary" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteMutation.mutate(n.id)}
                              className="w-6 h-6 rounded-md hover:bg-accent flex items-center justify-center"
                              title="Remover"
                            >
                              <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-400" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {notifList.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-border/50 text-center">
                    <span className="text-xs text-muted-foreground">{notifList.length} notificações</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2 ml-1">
          <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.profile?.firstName?.[0]}{user?.profile?.lastName?.[0]}
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-medium leading-tight">
              {user?.profile?.firstName} {user?.profile?.lastName}
            </div>
            <div className="text-xs text-muted-foreground">{user?.role}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
