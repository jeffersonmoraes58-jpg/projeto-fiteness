import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole, SubscriptionPlan, SubscriptionStatus, BillingInterval } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private notifications: NotificationsService,
    private subscriptionService: SubscriptionService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    let tenantId = dto.tenantId;

    if (!tenantId) {
      if (!dto.studioName) {
        throw new BadRequestException('Informe tenantId ou studioName');
      }
      const base = dto.studioName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const suffix = Math.random().toString(36).slice(2, 8);
      const tenant = await this.prisma.tenant.create({
        data: { name: dto.studioName, slug: `${base}-${suffix}` },
      });
      const planMap: Record<string, SubscriptionPlan> = {
        starter: SubscriptionPlan.BASIC,
        pro: SubscriptionPlan.PRO,
        elite: SubscriptionPlan.ENTERPRISE,
      };
      const chosenPlan = dto.plan && planMap[dto.plan.toLowerCase()]
        ? planMap[dto.plan.toLowerCase()]
        : SubscriptionPlan.FREE;
      const chosenCycle: BillingInterval =
        dto.cycle?.toLowerCase() === 'annual' ? 'ANNUAL' : 'MONTHLY';
      await this.prisma.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          plan: chosenPlan,
          billingCycle: chosenCycle,
          status: chosenPlan === SubscriptionPlan.FREE ? SubscriptionStatus.ACTIVE : SubscriptionStatus.TRIAL,
        },
      });
      tenantId = tenant.id;
    } else {
      const tenantExists = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenantExists) {
        throw new BadRequestException('ID do Studio não encontrado. Verifique o código com o proprietário do studio.');
      }
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        role: dto.role || UserRole.STUDENT,
        tenantId,
        profile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
          },
        },
      },
      include: { profile: true },
    });

    let createdStudentId: string | null = null;
    if (user.role === UserRole.STUDENT) {
      const s = await this.prisma.student.create({ data: { userId: user.id } });
      createdStudentId = s.id;
    } else if (user.role === UserRole.TRAINER) {
      await this.prisma.trainer.create({ data: { userId: user.id } });
    } else if (user.role === UserRole.NUTRITIONIST) {
      await this.prisma.nutritionist.create({ data: { userId: user.id } });
    }

    if (dto.inviteToken && createdStudentId) {
      try {
        const payload = await this.jwtService.verifyAsync(dto.inviteToken, {
          secret: this.config.get('JWT_SECRET'),
        });
        if (payload.type === 'student-invite') {
          await this.prisma.trainerStudent.upsert({
            where: { trainerId_studentId: { trainerId: payload.sub, studentId: createdStudentId } },
            update: { isActive: true },
            create: { trainerId: payload.sub, studentId: createdStudentId, isActive: true },
          });
        }
      } catch {} // token expirado ou inválido — cadastro continua normalmente
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Se o plano for pago, cria checkout do Mercado Pago e retorna a URL
    const planMap: Record<string, SubscriptionPlan> = {
      starter: SubscriptionPlan.BASIC,
      pro: SubscriptionPlan.PRO,
      elite: SubscriptionPlan.ENTERPRISE,
    };
    const chosenPlan = dto.plan && planMap[dto.plan.toLowerCase()]
      ? planMap[dto.plan.toLowerCase()]
      : SubscriptionPlan.FREE;

    let checkoutUrl: string | null = null;
    if (chosenPlan !== SubscriptionPlan.FREE) {
      try {
        const returnUrl = dto.returnUrl || `${this.config.get('FRONTEND_URL', 'https://fitlynutri.com.br')}/dashboard`;
        const checkout = await this.subscriptionService.createMPCheckout(
          tenantId,
          chosenPlan,
          returnUrl,
          (dto.cycle?.toLowerCase() === 'annual' ? 'ANNUAL' : 'MONTHLY') as BillingInterval,
        );
        checkoutUrl = checkout.checkoutUrl;
        this.logger.log(`[Register] Checkout criado para tenant ${tenantId}: ${checkoutUrl}`);
      } catch (err) {
        this.logger.error(`[Register] Erro ao criar checkout para tenant ${tenantId}:`, err);
        // Se falhou ao criar checkout, não retorna tokens — usuário precisa tentar novamente
        throw new BadRequestException(
          'Erro ao iniciar o pagamento. Tente novamente ou entre em contato com o suporte.',
        );
      }
    }

    // Envia email de boas-vindas (fire-and-forget — não bloqueia o cadastro)
    this.emailService.sendRegistrationWelcome({
      to: user.email,
      firstName: dto.firstName,
      role: user.role,
      tenantName: dto.studioName ?? undefined,
    }).catch((err) => this.logger.error('[Register] Erro ao enviar email de boas-vindas:', err));

    return { user: this.sanitizeUser(user), ...tokens, checkoutUrl };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
      include: { profile: true },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Conta desativada');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    if (user.role === UserRole.STUDENT) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const alreadyGreeted = await this.prisma.notification.findFirst({
        where: { userId: user.id, type: 'SYSTEM', createdAt: { gte: todayStart } },
      });
      if (!alreadyGreeted) {
        const firstName = user.profile?.firstName || 'aluno(a)';
        await this.notifications.create({
          userId: user.id,
          type: 'SYSTEM',
          title: `Olá, ${firstName}! 👋`,
          body: 'Bem-vindo(a) de volta! Lembre de se hidratar bem durante o dia. 💧',
        });
      }
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshToken(userId: string, refreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { userId, token: refreshToken, expiresAt: { gt: new Date() } },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    return tokens;
  }

  async logout(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId, token: refreshToken } });
    return { message: 'Logout realizado com sucesso' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new BadRequestException('Senha atual incorreta');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return { message: 'Senha alterada com sucesso' };
  }

  async googleLogin(googleUser: any) {
    let user = await this.prisma.user.findFirst({
      where: { googleId: googleUser.googleId },
      include: { profile: true },
    });

    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { email: googleUser.email },
        include: { profile: true },
      });

      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleUser.googleId },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email: googleUser.email,
            googleId: googleUser.googleId,
            emailVerified: true,
            tenantId: googleUser.tenantId || 'default',
            role: UserRole.STUDENT,
            profile: {
              create: {
                firstName: googleUser.firstName,
                lastName: googleUser.lastName,
                avatarUrl: googleUser.avatarUrl,
              },
            },
          },
          include: { profile: true },
        });

        await this.prisma.student.create({ data: { userId: user.id } });
      }
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async generateInviteLink(userId: string) {
    const trainer = await this.prisma.trainer.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } },
    });
    if (!trainer) throw new NotFoundException('Perfil de trainer não encontrado');

    const trainerName = [trainer.user.profile?.firstName, trainer.user.profile?.lastName]
      .filter(Boolean).join(' ') || 'Personal Trainer';

    const token = await this.jwtService.signAsync(
      { sub: trainer.id, tenantId: trainer.user.tenantId, trainerName, type: 'student-invite' },
      { secret: this.config.get('JWT_SECRET'), expiresIn: '7d' },
    );

    const baseUrl = this.config.get('FRONTEND_URL', 'https://fitlynutri.com.br');
    return { link: `${baseUrl}/cadastro?invite=${token}`, trainerName };
  }

  async validateInviteToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get('JWT_SECRET'),
      });
      if (payload.type !== 'student-invite') throw new Error('invalid type');
      return { valid: true, trainerName: payload.trainerName as string, tenantId: payload.tenantId as string };
    } catch {
      throw new BadRequestException('Link inválido ou expirado');
    }
  }

  async adminResetPassword(email: string, newPassword: string, adminKey: string) {
    const expectedKey = this.config.get('ADMIN_RESET_KEY', 'FitlyReset@2026');
    if (adminKey !== expectedKey) {
      throw new UnauthorizedException('Chave de administrador inválida');
    }

    // Busca o usuário globalmente (sem filtrar por tenant, igual ao login)
    let user = await this.prisma.user.findFirst({ where: { email } });

    if (!user) {
      // Usuário não existe — cria com tenant padrão
      let tenant = await this.prisma.tenant.findFirst();
      if (!tenant) {
        tenant = await this.prisma.tenant.create({
          data: { name: 'Default Studio', slug: 'default-studio', isActive: true },
        });
        await this.prisma.tenantSubscription.create({
          data: { tenantId: tenant.id, plan: 'PRO' as any, status: 'ACTIVE' as any },
        });
      }

      const roleMap: Record<string, any> = {
        'student@demo.com': 'STUDENT',
        'trainer@demo.com': 'TRAINER',
        'nutri@demo.com': 'NUTRITIONIST',
        'admin@fitsaas.com': 'ADMIN',
      };
      const nameMap: Record<string, { first: string; last: string }> = {
        'student@demo.com': { first: 'Pedro', last: 'Aluno' },
        'trainer@demo.com': { first: 'Joao', last: 'Trainer' },
        'nutri@demo.com': { first: 'Maria', last: 'Nutricionista' },
        'admin@fitsaas.com': { first: 'Admin', last: 'FitSaaS' },
      };

      const role = roleMap[email] || 'STUDENT';
      const names = nameMap[email] || { first: 'Usuario', last: email.split('@')[0] };

      const hashed = await bcrypt.hash(newPassword, 12);
      user = await this.prisma.user.create({
        data: {
          email,
          password: hashed,
          role,
          tenantId: tenant.id,
          isActive: true,
          emailVerified: true,
          profile: { create: { firstName: names.first, lastName: names.last } },
        },
      });

      // Criar perfil específico
      if (role === 'STUDENT') {
        await this.prisma.student.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id, points: 120, streak: 5, level: 2 },
        });
      } else if (role === 'TRAINER') {
        await this.prisma.trainer.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id, specialties: ['Musculacao', 'Funcional'] },
        });
      } else if (role === 'NUTRITIONIST') {
        await this.prisma.nutritionist.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id, specialties: ['Nutricao Esportiva'] },
        });
      }

      // Conectar student e trainer se ambos existirem
      if (role === 'STUDENT') {
        const trainer = await this.prisma.user.findFirst({
          where: { email: 'trainer@demo.com', tenantId: tenant.id },
        });
        if (trainer) {
          const t = await this.prisma.trainer.findUnique({ where: { userId: trainer.id } });
          const s = await this.prisma.student.findUnique({ where: { userId: user.id } });
          if (t && s) {
            await this.prisma.trainerStudent.upsert({
              where: { trainerId_studentId: { trainerId: t.id, studentId: s.id } },
              update: {},
              create: { trainerId: t.id, studentId: s.id, monthlyFee: 300 },
            });
          }
        }
      }

      this.logger.log(`[AdminReset] Usuário ${email} criado com senha redefinida`);
    } else {
      const hashed = await bcrypt.hash(newPassword, 12);
      await this.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
      await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      this.logger.log(`[AdminReset] Senha redefinida para ${email} por chave de admin`);
    }

    return { message: 'Senha redefinida com sucesso' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({ where: { email } });

    // Always return success to avoid email enumeration
    if (!user) return { message: 'Se o e-mail existir, você receberá as instruções.' };

    const token = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, type: 'password-reset' },
      { secret: this.config.get('JWT_SECRET'), expiresIn: '1h' },
    );

    const resetUrl = `${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${token}`;

    // TODO: replace with real email service (SendGrid, Resend, etc.)
    console.log(`[PASSWORD RESET] ${user.email} → ${resetUrl}`);

    return { message: 'Se o e-mail existir, você receberá as instruções.' };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get('JWT_SECRET'),
      });
    } catch {
      throw new BadRequestException('Token inválido ou expirado');
    }

    if (payload.type !== 'password-reset') {
      throw new BadRequestException('Token inválido');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    // Invalidate all refresh tokens so active sessions are terminated
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return { message: 'Senha redefinida com sucesso' };
  }

  private async generateTokens(userId: string, email: string, role: string, tenantId: string) {
    const payload = { sub: userId, email, role, tenantId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string) {
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  private sanitizeUser(user: any) {
    const { password, ...rest } = user;
    return rest;
  }
}
