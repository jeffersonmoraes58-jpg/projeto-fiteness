'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Bell, BellOff, Loader2 } from 'lucide-react';

/**
 * PushNotificationManager
 *
 * Gerencia a inscrição do dispositivo em Push Notifications.
 * - Solicita permissão ao usuário
 * - Registra o service worker
 * - Envia a subscription para a API salvar no banco
 * - Permite ativar/desativar notificações
 */
export function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  // Busca a VAPID public key da API
  useEffect(() => {
    api.get('/push/vapid-public-key')
      .then((r) => setVapidKey(r.data?.data?.publicKey ?? r.data?.publicKey ?? r.data))
      .catch(() => {
        // Se a API não tiver o endpoint, usa uma chave padrão
        // Em produção, gere com: npx web-push generate-vapid-keys
        setVapidKey(null);
      });
  }, []);

  // Verifica permissão atual
  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);

    // Verifica se já está inscrito
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!vapidKey) {
      // Sem VAPID key, tenta mesmo assim (funciona em alguns navegadores)
    }

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      if (permission !== 'granted') {
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey || undefined,
        });
      }

      // Envia a subscription para a API
      await api.post('/push/subscribe', {
        subscription: sub.toJSON(),
        userAgent: navigator.userAgent,
      });

      setSubscribed(true);
    } catch (err: any) {
      console.error('Erro ao inscrever em push notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [vapidKey]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await api.post('/push/unsubscribe');
      }
      setSubscribed(false);
    } catch (err: any) {
      console.error('Erro ao desinscrever:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  if (permission === 'unsupported') return null;

  return (
    <div className="flex items-center gap-2">
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : subscribed ? (
        <button
          onClick={unsubscribe}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          title="Notificações ativadas"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Notificações ativas</span>
        </button>
      ) : (
        <button
          onClick={subscribe}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Ativar notificações"
        >
          <BellOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ativar notificações</span>
        </button>
      )}
    </div>
  );
}
