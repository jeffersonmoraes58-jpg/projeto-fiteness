import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// web-push é carregado sob demanda no sendPush
let webpush: any = null;
try {
  webpush = require('web-push');
} catch {
  // web-push não está instalado
}

/**
 * PushService
 *
 * Gerencia inscrições de push notifications (Web Push API / Service Worker).
 * As subscriptions são salvas no banco e usadas para enviar notificações
 * para os dispositivos dos usuários.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private vapidKeys: { publicKey: string; privateKey: string } | null = null;
  private vapidSubject: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    // Tenta carregar VAPID keys do .env
    const publicKey = this.config.get('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get('VAPID_PRIVATE_KEY');
    this.vapidSubject = this.config.get('VAPID_SUBJECT', 'mailto:contato@fitlynutri.com.br');
    if (publicKey && privateKey) {
      this.vapidKeys = { publicKey, privateKey };
      if (webpush) {
        webpush.setVapidDetails(this.vapidSubject, publicKey, privateKey);
      }
    }
  }

  /**
   * Retorna a VAPID public key para o frontend se inscrever
   */
  getVapidPublicKey(): { publicKey: string | null } {
    return { publicKey: this.vapidKeys?.publicKey ?? null };
  }

  /**
   * Salva ou atualiza uma subscription push para o usuário
   */
  async subscribe(userId: string, subscription: any, userAgent?: string) {
    // Verifica se já existe uma subscription igual
    const existing = await this.prisma.deviceToken.findFirst({
      where: {
        userId,
        token: JSON.stringify(subscription),
      },
    });

    if (existing) {
      // Já existe, apenas atualiza
      return existing;
    }

    // Cria nova subscription
    return this.prisma.deviceToken.create({
      data: {
        userId,
        token: JSON.stringify(subscription),
        platform: userAgent?.includes('Android') ? 'ANDROID' : 'WEB',
      },
    });
  }

  /**
   * Remove uma subscription push
   */
  async unsubscribe(userId: string, subscription?: any) {
    if (subscription) {
      // Remove subscription específica
      const token = JSON.stringify(subscription);
      await this.prisma.deviceToken.deleteMany({
        where: { userId, token },
      });
    } else {
      // Remove todas as subscriptions do usuário
      await this.prisma.deviceToken.deleteMany({
        where: { userId },
      });
    }
    return { success: true };
  }

  /**
   * Envia uma push notification para um usuário específico
   */
  async sendToUser(userId: string, title: string, body: string, options?: {
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
  }) {
    const subscriptions = await this.prisma.deviceToken.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      this.logger.warn(`Nenhuma subscription push para o usuário ${userId}`);
      return { sent: 0 };
    }

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        const parsed = JSON.parse(sub.token);
        await this.sendPush(parsed, title, body, options);
        sent++;
      } catch (err: any) {
        this.logger.error(`Erro ao enviar push para subscription ${sub.id}: ${err.message}`);
        // Se a subscription expirou, remove
        if (err.message?.includes('410') || err.message?.includes('expired')) {
          await this.prisma.deviceToken.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }

    return { sent };
  }

  /**
   * Envia push notification para múltiplos usuários
   */
  async sendToUsers(userIds: string[], title: string, body: string, options?: {
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
  }) {
    const subscriptions = await this.prisma.deviceToken.findMany({
      where: { userId: { in: userIds } },
    });

    if (subscriptions.length === 0) {
      return { sent: 0 };
    }

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        const parsed = JSON.parse(sub.token);
        await this.sendPush(parsed, title, body, options);
        sent++;
      } catch (err: any) {
        this.logger.error(`Erro ao enviar push: ${err.message}`);
        if (err.message?.includes('410') || err.message?.includes('expired')) {
          await this.prisma.deviceToken.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }

    return { sent };
  }

  /**
   * Envia a push notification via Web Push API
   */
  private async sendPush(
    subscription: any,
    title: string,
    body: string,
    options?: { icon?: string; badge?: string; url?: string; tag?: string },
  ) {
    // Se não temos VAPID keys configuradas, não podemos enviar
    if (!this.vapidKeys) {
      this.logger.warn('VAPID keys não configuradas. Push notifications não serão enviadas.');
      this.logger.warn('Configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY no .env');
      this.logger.warn('Gere com: npx web-push generate-vapid-keys');
      return;
    }

    if (!webpush) {
      this.logger.warn('web-push não instalado. Instale com: npm install web-push');
      return;
    }

    try {
      const payload = JSON.stringify({
        title,
        body,
        icon: options?.icon || '/icons/icon-192.png',
        badge: options?.badge || '/icons/icon-192.png',
        url: options?.url || '/',
        tag: options?.tag || 'fitlynutri-default',
      });

      await webpush.sendNotification(subscription, payload);
    } catch (err: any) {
      this.logger.error(`Erro web-push: ${err.message}`);
      throw err;
    }
  }
}
