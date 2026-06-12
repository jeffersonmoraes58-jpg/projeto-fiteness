import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', 'smtp.gmail.com'),
      port: Number(config.get('SMTP_PORT', 587)),
      secure: false,
      auth: {
        user: config.get('SMTP_USER'),
        pass: config.get('SMTP_PASS'),
      },
    });
  }

  async sendStudentWelcome(data: {
    to: string;
    studentName: string;
    trainerName: string;
    tempPassword: string;
    anamneseType?: string;
  }): Promise<{ sent: boolean; error?: string }> {
    const from = this.config.get('SMTP_FROM', 'noreply@fitlynutri.com.br');
    const frontendUrl = this.config.get('FRONTEND_URL', 'https://fitlynutri.com.br');
    const loginUrl = `${frontendUrl}/login`;
    const anamneseUrl = `${frontendUrl}/student/progress`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:32px 24px;text-align:center">
      <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px">Fitlynutri</div>
      <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px">Plataforma Fitness Completa</div>
    </div>
    <!-- Body -->
    <div style="padding:32px 24px">
      <p style="color:#e2e8f0;font-size:16px;margin:0 0 8px">Olá, <strong>${data.studentName}</strong>! 👋</p>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">
        <strong style="color:#e2e8f0">${data.trainerName}</strong> cadastrou você na plataforma Fitlynutri.
        Seus dados de acesso estão abaixo:
      </p>
      <!-- Credentials card -->
      <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="margin-bottom:12px">
          <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">E-mail</div>
          <div style="color:#e2e8f0;font-size:15px;font-weight:600">${data.to}</div>
        </div>
        <div>
          <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Senha temporária</div>
          <div style="color:#a78bfa;font-size:18px;font-weight:700;letter-spacing:2px;font-family:monospace">${data.tempPassword}</div>
        </div>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:0 0 24px">
        ⚠️ Recomendamos alterar sua senha no primeiro acesso em <strong>Perfil → Alterar senha</strong>.
      </p>
      <!-- CTA button -->
      <div style="text-align:center;margin-bottom:24px">
        <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">
          Acessar minha conta →
        </a>
      </div>
      ${data.anamneseType ? `
      <!-- Anamnese -->
      <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="color:#34d399;font-weight:700;font-size:14px;margin-bottom:8px">📋 Anamnese pendente</div>
        <p style="color:#94a3b8;font-size:13px;margin:0 0 12px">
          Seu personal trainer solicitou que você responda a anamnese <strong style="color:#e2e8f0">${data.anamneseType}</strong> antes do início dos treinos.
        </p>
        <a href="${anamneseUrl}" style="display:inline-block;background:rgba(16,185,129,0.2);border:1px solid rgba(16,185,129,0.4);color:#34d399;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:13px">
          Responder anamnese →
        </a>
      </div>
      ` : ''}
    </div>
    <!-- Footer -->
    <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
      <p style="color:#475569;font-size:12px;margin:0">© 2026 Fitlynutri · Todos os direitos reservados</p>
    </div>
  </div>
</body>
</html>`;

    try {
      const smtpUser = this.config.get('SMTP_USER');
      if (!smtpUser || smtpUser === 'your-email@gmail.com') {
        console.log(`[EMAIL] SMTP not configured — would send welcome to ${data.to} (pwd: ${data.tempPassword})`);
        return { sent: false, error: 'SMTP não configurado' };
      }
      await this.transporter.sendMail({ from: `"Fitlynutri" <${from}>`, to: data.to, subject: 'Bem-vindo(a) ao Fitlynutri — Seus dados de acesso', html });
      return { sent: true };
    } catch (err: any) {
      console.error('[EMAIL] Failed to send welcome email:', err.message);
      return { sent: false, error: err.message };
    }
  }
}
