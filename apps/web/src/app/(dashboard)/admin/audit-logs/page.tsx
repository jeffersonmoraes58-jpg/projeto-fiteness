'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Shield, Clock, User, ChevronLeft, ChevronRight,
  FileText, Activity, Download, Filter, X,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const ROLE_LABELS: Record<string, string> = {
  TRAINER: 'Trainer', NUTRITIONIST: 'Nutricionista', STUDENT: 'Aluno',
  ADMIN: 'Admin', STUDIO_OWNER: 'Studio',
};

function actionColor(action: string) {
  if (action?.includes('DELETE') || action?.includes('REMOVE')) return 'bg-red-500/10 text-red-400';
  if (action?.includes('CREATE') || action?.includes('ADD')) return 'bg-emerald-500/10 text-emerald-400';
  if (action?.includes('UPDATE') || action?.includes('EDIT')) return 'bg-blue-500/10 text-blue-400';
  if (action?.includes('LOGIN')) return 'bg-purple-500/10 text-purple-400';
  return 'bg-white/5 text-muted-foreground';
}

function LogRow({ log }: { log: any }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <User className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{log.user?.email ?? 'Sistema'}</div>
            <div className="text-[10px] text-muted-foreground">{ROLE_LABELS[log.user?.role] || log.user?.role || '—'}</div>
          </div>
        </div>
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0', actionColor(log.action))}>
          {log.action}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground ml-8">
        <span>{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
        {(log.resource || log.resourceId) && (
          <span className="truncate">{log.resource}{log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ''}</span>
        )}
        {log.ipAddress && <span className="font-mono">{log.ipAddress}</span>}
      </div>
    </div>
  );
}

export default function AdminAuditLogs() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', search, actionFilter, page],
    queryFn: () =>
      api.get('/admin/audit-logs', {
        params: { search, action: actionFilter, page, limit },
      }).then((r) => r.data.data ?? r.data),
  });

  const { data: actions } = useQuery({
    queryKey: ['admin-audit-actions'],
    queryFn: () => api.get('/admin/audit-logs/actions').then((r) => r.data.data ?? r.data ?? []),
  });

  const logs = (data?.logs ?? data ?? []) as any[];
  const total = data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  function exportCSV() {
    if (!logs.length) { toast.error('Nenhum dado para exportar'); return; }
    const header = 'Data,Usuário,Ação,Recurso,IP\n';
    const rows = logs.map((l: any) =>
      `${new Date(l.createdAt).toISOString()},${l.user?.email ?? '—'},${l.action},${l.resource ?? ''},${l.ipAddress ?? ''}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado!');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Logs de Auditoria</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Rastreamento de ações na plataforma
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm py-2" disabled={!logs.length}>
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por ação, recurso..."
            className="input-field pl-9"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="input-field bg-background sm:w-48"
        >
          <option value="">Todas as ações</option>
          {(actions || []).map((a: string) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        {actionFilter && (
          <button
            onClick={() => setActionFilter('')}
            className="btn-secondary text-sm py-2 px-3 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card !p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhum log de auditoria encontrado.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Os logs aparecerão aqui conforme as ações forem registradas na plataforma.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border/10">
              {logs.map((log: any) => (
                <LogRow key={log.id} log={log} />
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 w-40">Data/Hora</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Usuário</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Ação</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Recurso</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 w-32">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-accent/30 transition-all">
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="text-xs font-medium">{log.user?.email ?? 'Sistema'}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {ROLE_LABELS[log.user?.role] || log.user?.role || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full',
                          actionColor(log.action),
                        )}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs truncate max-w-[180px]">
                            {log.resource || '—'}
                            {log.resourceId && <span className="text-muted-foreground/50 ml-1">#{log.resourceId.slice(0, 8)}</span>}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground font-mono">{log.ipAddress ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-3 border-t border-border/20">
                <span className="text-xs text-muted-foreground">
                  {total} registros · Página {page} de {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (page <= 4) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = page - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={cn(
                          'w-7 h-7 rounded-lg text-xs font-medium transition-all',
                          pageNum === page
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent text-muted-foreground',
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
          </>
        )}
      </motion.div>
    </div>
  );
}