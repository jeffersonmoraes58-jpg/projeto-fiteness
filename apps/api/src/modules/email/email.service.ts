import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    this.initTransporter();
  }

  /**
   * Inicializa o transporte SMTP com Nodemailer se as credenciais estiverem configuradas.
   */
  private initTransporter() {
    const host = this.config.get('SMTP_HOST');
    const port = this.config.get('SMTP_PORT');
    const user = this.config.get('SMTP_USER');
    const pass = this.config.get('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port ? parseInt(port, 10) : 587,
        secure: port === '465',
        auth: { user, pass },
      });
      this.logger.log(`[EMAIL] Nodemailer SMTP transporter initialized: ${host}:${port}`);
    } else {
      this.logger.warn('[EMAIL] SMTP not configured — Nodemailer fallback unavailable');
    }
  }

  /**
   * Método central de envio: tenta Resend primeiro; se não configurado, usa Nodemailer.
   */
  private async sendMail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ sent: boolean; error?: string; provider?: string }> {
    const apiKey = this.config.get('RESEND_API_KEY');

    // Tenta Resend
    if (apiKey) {
      const fromEmail = this.config.get('RESEND_FROM', 'onboarding@resend.dev');
      const from = fromEmail.includes('@') && !fromEmail.includes('<')
        ? `Fitlynutri <${fromEmail}>`
        : fromEmail;

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from, to: [options.to], subject: options.subject, html: options.html }),
        });
        const json = (await res.json()) as any;
        if (!res.ok) {
          this.logger.error(`[EMAIL] Resend error:`, json);
          // Fallback para Nodemailer se Resend falhar
          return this.sendMailViaNodemailer(options);
        }
        this.logger.log(`[EMAIL] Sent via Resend to ${options.to} — id: ${json.id}`);
        return { sent: true, provider: 'resend' };
      } catch (err: any) {
        this.logger.error(`[EMAIL] Resend exception:`, err.message);
        return this.sendMailViaNodemailer(options);
      }
    }

    // Sem Resend — tenta Nodemailer
    return this.sendMailViaNodemailer(options);
  }

  /**
   * Envia email via Nodemailer (SMTP).
   */
  private async sendMailViaNodemailer(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ sent: boolean; error?: string; provider?: string }> {
    if (!this.transporter) {
      this.logger.log(`[EMAIL] No mail transport configured — would send to ${options.to}`);
      return { sent: false, error: 'Nenhum serviço de email configurado (SMTP ou Resend)' };
    }

    const fromEmail = this.config.get('SMTP_FROM', 'noreply@fitlynutri.com.br');
    const from = fromEmail.includes('@') && !fromEmail.includes('<')
      ? `Fitlynutri <${fromEmail}>`
      : fromEmail;

    try {
      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`[EMAIL] Sent via Nodemailer to ${options.to} — id: ${info.messageId}`);
      return { sent: true, provider: 'nodemailer' };
    } catch (err: any) {
      this.logger.error(`[EMAIL] Nodemailer error:`, err.message);
      return { sent: false, error: err.message };
    }
  }

  // ─── MÉTODOS PÚBLICOS ──────────────────────────────────────────────────────

  /**
   * Envia email de boas-vindas para qualquer novo usuário cadastrado via /auth/register.
   */
  async sendRegistrationWelcome(data: {
    to: string;
    firstName: string;
    role: string;
    tenantName?: string;
  }): Promise<{ sent: boolean; error?: string }> {
    const frontendUrl = this.config.get('FRONTEND_URL', 'https://fitlynutri.com.br');
    const loginUrl = `${frontendUrl}/login`;

    const roleLabel: Record<string, string> = {
      ADMIN: 'Proprietário(a)',
      STUDIO_OWNER: 'Proprietário(a)',
      TRAINER: 'Personal Trainer',
      NUTRITIONIST: 'Nutricionista',
      STUDENT: 'Aluno(a)',
    };
    const roleName = roleLabel[data.role] || 'Usuário(a)';

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:32px 24px;text-align:center">
      <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px">Fitlynutri</div>
      <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px">Plataforma Fitness Completa</div>
    </div>
    <div style="padding:32px 24px">
      <p style="color:#e2e8f0;font-size:16px;margin:0 0 8px">Olá, <strong>${data.firstName}</strong>! 👋</p>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">
        Seja muito bem-vindo(a) ao <strong style="color:#e2e8f0">Fitlynutri</strong>!
        Sua conta foi criada com sucesso como <strong style="color:#a78bfa">${roleName}</strong>.
      </p>
      <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="color:#e2e8f0;font-size:14px;margin:0 0 8px">📋 Resumo da sua conta:</p>
        <div style="margin-bottom:8px">
          <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">E-mail</div>
          <div style="color:#e2e8f0;font-size:14px;font-weight:600">${data.to}</div>
        </div>
        <div>
          <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Tipo de conta</div>
          <div style="color:#a78bfa;font-size:14px;font-weight:600">${roleName}</div>
        </div>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin:0 0 24px">
        🚀 Agora é só acessar sua conta e começar a usar a plataforma mais completa do Brasil para gestão fitness.
      </p>
      <div style="text-align:center;margin-bottom:24px">
        <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">
          Acessar minha conta →
        </a>
      </div>
    </div>
    <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
      <p style="color:#475569;font-size:12px;margin:0">© 2026 Fitlynutri · Todos os direitos reservados</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendMail({
      to: data.to,
      subject: `Bem-vindo(a) ao Fitlynutri, ${data.firstName}! 🎉`,
      html,
    });
  }

  /**
   * Envia email com dados de acesso quando um trainer cadastra um aluno.
   */
  async sendStudentWelcome(data: {
    to: string;
    studentName: string;
    trainerName: string;
    tempPassword: string;
    anamneseType?: string;
    studentUserId?: string;
  }): Promise<{ sent: boolean; error?: string }> {
    const frontendUrl = this.config.get('FRONTEND_URL', 'https://fitlynutri.com.br');
    const loginUrl = `${frontendUrl}/login`;
    const anamneseUrl = data.studentUserId
      ? `${frontendUrl}/anamnese/${data.studentUserId}?type=${encodeURIComponent(data.anamneseType || '')}`
      : `${frontendUrl}/student/progress`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:32px 24px;text-align:center">
      <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px">Fitlynutri</div>
      <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px">Plataforma Fitness Completa</div>
    </div>
    <div style="padding:32px 24px">
      <p style="color:#e2e8f0;font-size:16px;margin:0 0 8px">Olá, <strong>${data.studentName}</strong>! 👋</p>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">
        <strong style="color:#e2e8f0">${data.trainerName}</strong> cadastrou você na plataforma Fitlynutri.
        Seus dados de acesso estão abaixo:
      </p>
      <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="margin-bottom:12px">
          <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">E-mail</div>
          <div style="color:#e2e8f0;font-size:15px;font-weight:600">${data.to}</div>
        </div>
        <div>
          <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Senha temporária</div>
          <div style="color:#a78bfa;font-size:20px;font-weight:700;letter-spacing:3px;font-family:monospace">${data.tempPassword}</div>
        </div>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:0 0 24px">
        ⚠️ Recomendamos alterar sua senha no primeiro acesso em <strong>Perfil → Alterar senha</strong>.
      </p>
      <div style="text-align:center;margin-bottom:24px">
        <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">
          Acessar minha conta →
        </a>
      </div>
      ${data.anamneseType ? `
      <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="color:#34d399;font-weight:700;font-size:14px;margin-bottom:8px">📋 Anamnese pendente</div>
        <p style="color:#94a3b8;font-size:13px;margin:0 0 12px">
          Seu personal trainer solicitou que você responda a anamnese <strong style="color:#e2e8f0">${data.anamneseType}</strong>.
        </p>
        <a href="${anamneseUrl}" style="display:inline-block;background:rgba(16,185,129,0.2);border:1px solid rgba(16,185,129,0.4);color:#34d399;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:13px">
          Responder anamnese →
        </a>
      </div>
      ` : ''}
    </div>
    <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
      <p style="color:#475569;font-size:12px;margin:0">© 2026 Fitlynutri · Todos os direitos reservados</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendMail({
      to: data.to,
      subject: 'Bem-vindo(a) ao Fitlynutri — Seus dados de acesso',
      html,
    });
  }

  /**
   * Envia link da anamnese para o aluno preencher.
   */
  async sendAnamneseLink(data: {
    to: string;
    studentName: string;
    trainerName: string;
    studentUserId: string;
  }): Promise<{ sent: boolean; error?: string }> {
    const frontendUrl = this.config.get('FRONTEND_URL', 'https://fitlynutri.com.br');
    const anamneseUrl = `${frontendUrl}/anamnese/${data.studentUserId}`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:32px 24px;text-align:center">
      <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px">Fitlynutri</div>
      <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px">Plataforma Fitness Completa</div>
    </div>
    <div style="padding:32px 24px">
      <p style="color:#e2e8f0;font-size:16px;margin:0 0 8px">Olá, <strong>${data.studentName}</strong>! 👋</p>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">
        <strong style="color:#e2e8f0">${data.trainerName}</strong> solicitou que você preencha sua <strong style="color:#a78bfa">anamnese</strong> para personalizar melhor seu treino.
      </p>
      <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="color:#34d399;font-weight:700;font-size:14px;margin-bottom:8px">📋 Anamnese</div>
        <p style="color:#94a3b8;font-size:13px;margin:0 0 16px">
          Clique no botão abaixo para responder o questionário. Leva menos de 3 minutos!
        </p>
        <div style="text-align:center">
          <a href="${anamneseUrl}" style="display:inline-block;background:rgba(16,185,129,0.2);border:1px solid rgba(16,185,129,0.4);color:#34d399;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px">
            Preencher Anamnese →
          </a>
        </div>
      </div>
      <p style="color:#64748b;font-size:12px;margin:0 0 24px;text-align:center">
        Caso o botão não funcione, copie e cole este link no navegador:<br>
        <span style="color:#94a3b8;word-break:break-all">${anamneseUrl}</span>
      </p>
    </div>
    <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
      <p style="color:#475569;font-size:12px;margin:0">© 2026 Fitlynutri · Todos os direitos reservados</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendMail({
      to: data.to,
      subject: `${data.trainerName} solicitou sua anamnese — Fitlynutri`,
      html,
    });
  }

  /**
   * Envia email avisando que a assinatura está próxima de expirar.
   */
  async sendSubscriptionExpiring(data: {
    to: string;
    adminName: string;
    planLabel: string;
    cycleLabel: string;
    expiresAt: Date;
    daysLeft: number;
    tenantId: string;
  }): Promise<{ sent: boolean; error?: string }> {
    const frontendUrl = this.config.get('FRONTEND_URL', 'https://fitlynutri.com.br');
    const billingUrl = `${frontendUrl}/admin/subscriptions`;

    const urgency =
      data.daysLeft <= 1
        ? '⚠️ Sua assinatura expira amanhã!'
        : data.daysLeft <= 3
          ? '🔔 Sua assinatura expira em breve!'
          : '📅 Sua assinatura está próxima da renovação';

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
    <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:32px 24px;text-align:center">
      <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px">Fitlynutri</div>
      <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px">Plataforma Fitness Completa</div>
    </div>
    <div style="padding:32px 24px">
      <p style="color:#e2e8f0;font-size:16px;margin:0 0 8px">Olá, <strong>${data.adminName}</strong>!</p>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">${urgency}</p>
      <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="margin-bottom:8px">
          <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Plano</div>
          <div style="color:#f59e0b;font-size:14px;font-weight:600">${data.planLabel} (${data.cycleLabel})</div>
        </div>
        <div style="margin-bottom:8px">
          <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Data de renovação</div>
          <div style="color:#e2e8f0;font-size:14px;font-weight:600">${new Date(data.expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>
        <div>
          <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Dias restantes</div>
          <div style="color:${data.daysLeft <= 1 ? '#ef4444' : data.daysLeft <= 3 ? '#f59e0b' : '#fbbf24'};font-size:20px;font-weight:700">${data.daysLeft} dia${data.daysLeft !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin:0 0 24px">
        💳 Renove agora para manter o acesso à plataforma e não perder nenhum recurso.
      </p>
      <div style="text-align:center;margin-bottom:24px">
        <a href="${billingUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">
          Gerenciar assinatura →
        </a>
      </div>
    </div>
    <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
      <p style="color:#475569;font-size:12px;margin:0">© 2026 Fitlynutri · Todos os direitos reservados</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendMail({
      to: data.to,
      subject: `Sua assinatura expira em ${data.daysLeft} dia${data.daysLeft !== 1 ? 's' : ''} — Fitlynutri`,
      html,
    });
  }

  /**
   * Envia lembrete de treino por email para o aluno.
   */
  async sendWorkoutReminder(data: {
    to: string;
    studentName: string;
    workoutName: string;
    trainerName: string;
  }): Promise<{ sent: boolean; error?: string }> {
    const frontendUrl = this.config.get('FRONTEND_URL', 'https://fitlynutri.com.br');
    const workoutUrl = `${frontendUrl}/student/workout`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:32px 24px;text-align:center">
      <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px">💪 Hora de Treinar!</div>
      <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px">Seu corpo está pronto para mais um desafio</div>
    </div>
    <div style="padding:32px 24px">
      <p style="color:#e2e8f0;font-size:16px;margin:0 0 8px">Olá, <strong>${data.studentName}</strong>!</p>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">
        Seu treino de hoje te espera na plataforma:
      </p>
      <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
        <p style="color:#a78bfa;font-size:20px;font-weight:700;margin:0">${data.workoutName}</p>
        <p style="color:#94a3b8;font-size:12px;margin:4px 0 0">com ${data.trainerName}</p>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin:0 0 24px">
        🎯 Cada treino te deixa mais próximo dos seus objetivos. Não deixe pra depois!
      </p>
      <div style="text-align:center;margin-bottom:24px">
        <a href="${workoutUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">
          Ver treino de hoje →
        </a>
      </div>
    </div>
    <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
      <p style="color:#475569;font-size:12px;margin:0">© 2026 Fitlynutri · Todos os direitos reservados</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendMail({
      to: data.to,
      subject: `💪 Hora do treino: ${data.workoutName} — Fitlynutri`,
      html,
    });
  }

  /**
   * Alerta o personal trainer por email quando um aluno está inativo há 7+ dias.
   */
  async sendInactivityAlert(data: {
    to: string;
    trainerName: string;
    studentName: string;
    lastTrainDate: string;
    daysInactive: number;
  }): Promise<{ sent: boolean; error?: string }> {
    const frontendUrl = this.config.get('FRONTEND_URL', 'https://fitlynutri.com.br');
    const studentsUrl = `${frontendUrl}/trainer/students`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
    <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:32px 24px;text-align:center">
      <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px">⚠️ Aluno Inativo</div>
      <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px">Não deixe seu aluno desmotivar!</div>
    </div>
    <div style="padding:32px 24px">
      <p style="color:#e2e8f0;font-size:16px;margin:0 0 8px">Olá, <strong>${data.trainerName}</strong>!</p>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">
        O aluno(a) <strong style="color:#f59e0b">${data.studentName}</strong> está sem treinar há <strong>${data.daysInactive} dias</strong>.
      </p>
      <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="margin-bottom:8px">
          <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Aluno</div>
          <div style="color:#f59e0b;font-size:16px;font-weight:600">${data.studentName}</div>
        </div>
        <div style="margin-bottom:8px">
          <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Último treino</div>
          <div style="color:#e2e8f0;font-size:14px;font-weight:600">${data.lastTrainDate}</div>
        </div>
        <div>
          <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Dias inativo</div>
          <div style="color:#ef4444;font-size:20px;font-weight:700">${data.daysInactive} dias</div>
        </div>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin:0 0 24px">
        📞 Que tal entrar em contato? Um simples "como você está?" pode fazer toda diferença na motivação do seu aluno!
      </p>
      <div style="text-align:center;margin-bottom:24px">
        <a href="${studentsUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">
          Ver meus alunos →
        </a>
      </div>
    </div>
    <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
      <p style="color:#475569;font-size:12px;margin:0">© 2026 Fitlynutri · Todos os direitos reservados</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendMail({
      to: data.to,
      subject: `⚠️ ${data.studentName} está há ${data.daysInactive} dias sem treinar — Fitlynutri`,
      html,
    });
  }
}
