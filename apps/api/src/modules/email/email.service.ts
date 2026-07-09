import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(private config: ConfigService) {}

  /**
   * Envia email de boas-vindas para qualquer novo usuário cadastrado via /auth/register.
   */
  async sendRegistrationWelcome(data: {
    to: string;
    firstName: string;
    role: string;
    tenantName?: string;
  }): Promise<{ sent: boolean; error?: string }> {
    const apiKey = this.config.get('RESEND_API_KEY');
    if (!apiKey) {
      console.log(`[EMAIL] RESEND_API_KEY not set — would send to ${data.to}`);
      return { sent: false, error: 'RESEND_API_KEY não configurado' };
    }

    const frontendUrl = this.config.get('FRONTEND_URL', 'https://fitlynutri.com.br');
    const loginUrl = `${frontendUrl}/login`;
    const fromEmail = this.config.get('RESEND_FROM', 'onboarding@resend.dev');
    const from = fromEmail.includes('@') && !fromEmail.includes('<') ? `Fitlynutri <${fromEmail}>` : fromEmail;

    const roleLabel: Record<string, string> = {
      ADMIN: 'Proprietário(a)',
      STUDIO_OWNER: 'Proprietário(a)',
      TRAINER: 'Personal Trainer',
      NUTRITIONIST: 'Nutricionista',
      STUDENT: 'Aluno(a)',
    };
    const roleName = roleLabel[data.role] || 'Usuário(a)';
    const planName = data.tenantName || 'Fitlynutri';

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

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [data.to],
          subject: `Bem-vindo(a) ao Fitlynutri, ${data.firstName}! 🎉`,
          html,
        }),
      });
      const json = await res.json() as any;
      if (!res.ok) {
        console.error('[EMAIL] Resend error:', json);
        return { sent: false, error: json?.message || 'Erro ao enviar' };
      }
      console.log(`[EMAIL] Welcome sent to ${data.to} via Resend — id: ${json.id}`);
      return { sent: true };
    } catch (err: any) {
      console.error('[EMAIL] Resend exception:', err.message);
      return { sent: false, error: err.message };
    }
  }

  async sendStudentWelcome(data: {
    to: string;
    studentName: string;
    trainerName: string;
    tempPassword: string;
    anamneseType?: string;
    studentUserId?: string;
  }): Promise<{ sent: boolean; error?: string }> {
    const apiKey = this.config.get('RESEND_API_KEY');
    if (!apiKey) {
      console.log(`[EMAIL] RESEND_API_KEY not set — would send to ${data.to}`);
      return { sent: false, error: 'RESEND_API_KEY não configurado' };
    }

    const frontendUrl = this.config.get('FRONTEND_URL', 'https://fitlynutri.com.br');
    const loginUrl = `${frontendUrl}/login`;
    const anamneseUrl = data.studentUserId
      ? `${frontendUrl}/anamnese/${data.studentUserId}?type=${encodeURIComponent(data.anamneseType || '')}`
      : `${frontendUrl}/student/progress`;
    const fromEmail = this.config.get('RESEND_FROM', 'onboarding@resend.dev');
    const from = fromEmail.includes('@') && !fromEmail.includes('<') ? `Fitlynutri <${fromEmail}>` : fromEmail;

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

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [data.to],
          subject: 'Bem-vindo(a) ao Fitlynutri — Seus dados de acesso',
          html,
        }),
      });
      const json = await res.json() as any;
      if (!res.ok) {
        console.error('[EMAIL] Resend error:', json);
        return { sent: false, error: json?.message || 'Erro ao enviar' };
      }
      console.log(`[EMAIL] Sent to ${data.to} via Resend — id: ${json.id}`);
      return { sent: true };
    } catch (err: any) {
      console.error('[EMAIL] Resend exception:', err.message);
      return { sent: false, error: err.message };
    }
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
    const apiKey = this.config.get('RESEND_API_KEY');
    if (!apiKey) {
      console.log(`[EMAIL] RESEND_API_KEY not set — would send to ${data.to}`);
      return { sent: false, error: 'RESEND_API_KEY não configurado' };
    }

    const frontendUrl = this.config.get('FRONTEND_URL', 'https://fitlynutri.com.br');
    const anamneseUrl = `${frontendUrl}/anamnese/${data.studentUserId}`;
    const fromEmail = this.config.get('RESEND_FROM', 'onboarding@resend.dev');
    const from = fromEmail.includes('@') && !fromEmail.includes('<') ? `Fitlynutri <${fromEmail}>` : fromEmail;

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

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [data.to],
          subject: `${data.trainerName} solicitou sua anamnese — Fitlynutri`,
          html,
        }),
      });
      const json = await res.json() as any;
      if (!res.ok) {
        console.error('[EMAIL] Resend error:', json);
        return { sent: false, error: json?.message || 'Erro ao enviar' };
      }
      console.log(`[EMAIL] Anamnese link sent to ${data.to} via Resend — id: ${json.id}`);
      return { sent: true };
    } catch (err: any) {
      console.error('[EMAIL] Resend exception:', err.message);
      return { sent: false, error: err.message };
    }
  }
}
