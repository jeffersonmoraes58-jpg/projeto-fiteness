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

      // Cadastro "solo" (cria um tenant novo) para TRAINER/NUTRITIONIST:
      // o e-mail é único por tenant, então sem essa checagem a mesma pessoa
      // conseguiria criar uma 2ª conta com o mesmo e-mail em outro tenant —
      // e o login() busca por e-mail globalmente (findFirst sem tenantId),
      // ficando ambíguo entre as duas contas. Bloqueia aqui e direciona pro
      // fluxo correto (login + "adicionar papel").
      // Escopo restrito a TRAINER/NUTRITIONIST de propósito: são os únicos
      // que têm hoje um caminho de escape (addRole) — não trava STUDIO_OWNER
      // sem alternativa caso alguém legitimamente precise de um 2º studio.
      if (dto.role === 'TRAINER' || dto.role === 'NUTRITIONIST') {
        const anyExisting = await this.prisma.user.findFirst({ where: { email: dto.email } });
        if (anyExisting) {
          throw new ConflictException(
            'Este e-mail já tem uma conta no Fitlynutri. Faça login e, nas Configurações, use a opção de adicionar o outro papel (personal/nutricionista) à sua conta existente.',
          );
        }
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
        role: dto.role === 'TRAINER' ? UserRole.TRAINER : dto.role === 'NUTRITIONIST' ? UserRole.NUTRITIONIST : dto.role === 'STUDIO_OWNER' ? UserRole.STUDIO_OWNER : UserRole.STUDENT,
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
        // O cadastro do aluno em si nunca deve falhar por causa do plano do
        // profissional — por isso a checagem de limite fica dentro do mesmo
        // try/catch "silencioso": se o profissional já estiver no limite, o
        // aluno cria a conta normalmente, só não fica vinculado automaticamente
        // (evita o furo de driblar o limite de alunos via link de convite).
        // O JWT do convite já carrega o tenantId do profissional (ver generateInviteLink).
        if (payload.type === 'student-invite') {
          await this.subscriptionService.checkStudentLimit(payload.tenantId, payload.sub);
          await this.prisma.trainerStudent.upsert({
            where: { trainerId_studentId: { trainerId: payload.sub, studentId: createdStudentId } },
            update: { isActive: true, startedAt: new Date(), endedAt: null },
            create: { trainerId: payload.sub, studentId: createdStudentId, isActive: true },
          });
        } else if (payload.type === 'nutritionist-invite') {
          await this.subscriptionService.checkPatientLimit(payload.tenantId, payload.sub);
          await this.prisma.nutritionistPatient.upsert({
            where: { nutritionistId_studentId: { nutritionistId: payload.sub, studentId: createdStudentId } },
            update: { isActive: true, startedAt: new Date(), endedAt: null },
            create: { nutritionistId: payload.sub, studentId: createdStudentId, isActive: true },
          });
        }
      } catch (err) {
        // token expirado/inválido OU limite de alunos atingido — cadastro
        // continua normalmente, só não vincula ao profissional
        this.logger.warn(`[Register] Convite não aplicado para aluno ${createdStudentId}: ${err instanceof Error ? err.message : err}`);
      }
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

    return {
      user: this.sanitizeUser({
        ...user,
        trainer: user.role === UserRole.TRAINER,
        nutritionist: user.role === UserRole.NUTRITIONIST,
      }),
      ...tokens,
      checkoutUrl,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
      include: { profile: true, trainer: true, nutritionist: true },
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
        // Login com Google é só para quem JÁ tem cadastro (por e-mail).
        // Não criamos conta nova aqui: sem um tenant/academia definido não
        // há como saber a quem essa conta pertenceria (app é multi-tenant).
        // O usuário precisa se cadastrar normalmente primeiro.
        throw new UnauthorizedException(
          'Nenhuma conta encontrada com esse e-mail do Google. Cadastre-se primeiro para depois entrar com o Google.',
        );
      }
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { user: this.sanitizeUser(user), ...tokens };
  }

  /**
   * Gera um link de convite para o profissional autenticado (trainer OU
   * nutricionista — detecta automaticamente qual sub-perfil o usuário tem).
   * O aluno que abrir o link e se cadastrar já entra vinculado a ele.
   */
  async generateInviteLink(userId: string) {
    const trainer = await this.prisma.trainer.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } },
    });

    let professionalId: string;
    let tenantId: string;
    let professionalName: string;
    let inviteType: 'student-invite' | 'nutritionist-invite';

    if (trainer) {
      professionalId = trainer.id;
      tenantId = trainer.user.tenantId;
      professionalName = [trainer.user.profile?.firstName, trainer.user.profile?.lastName]
        .filter(Boolean).join(' ') || 'Personal Trainer';
      inviteType = 'student-invite';
    } else {
      const nutritionist = await this.prisma.nutritionist.findUnique({
        where: { userId },
        include: { user: { include: { profile: true } } },
      });
      if (!nutritionist) throw new NotFoundException('Perfil de trainer ou nutricionista não encontrado');
      professionalId = nutritionist.id;
      tenantId = nutritionist.user.tenantId;
      professionalName = [nutritionist.user.profile?.firstName, nutritionist.user.profile?.lastName]
        .filter(Boolean).join(' ') || 'Nutricionista';
      inviteType = 'nutritionist-invite';
    }

    const token = await this.jwtService.signAsync(
      { sub: professionalId, tenantId, trainerName: professionalName, type: inviteType },
      { secret: this.config.get('JWT_SECRET'), expiresIn: '7d' },
    );

    const baseUrl = this.config.get('FRONTEND_URL', 'https://fitlynutri.com.br');
    return {
      link: `${baseUrl}/cadastro?invite=${token}`,
      trainerName: professionalName, // mantido por compatibilidade com o front existente
      professionalName,
      professionalType: inviteType === 'nutritionist-invite' ? 'NUTRITIONIST' : 'TRAINER',
    };
  }

  async validateInviteToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get('JWT_SECRET'),
      });
      if (payload.type !== 'student-invite' && payload.type !== 'nutritionist-invite') {
        throw new Error('invalid type');
      }
      return {
        valid: true,
        trainerName: payload.trainerName as string,
        professionalType: payload.type === 'nutritionist-invite' ? 'NUTRITIONIST' : 'TRAINER',
        tenantId: payload.tenantId as string,
      };
    } catch {
      throw new BadRequestException('Link inválido ou expirado');
    }
  }

  async checkInviteEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true },
    });
    return { exists: !!user, email: email.trim().toLowerCase() };
  }

  async linkExistingStudent(email: string, password: string, inviteToken: string) {
    const payload = await this.jwtService.verifyAsync(inviteToken, {
      secret: this.config.get('JWT_SECRET'),
    });
    if (payload.type !== 'student-invite' && payload.type !== 'nutritionist-invite') {
      throw new BadRequestException('Token de convite inválido');
    }

    const user = await this.prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() },
      include: { profile: true, student: true },
    });
    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.student) {
      throw new NotFoundException('Conta não possui perfil de aluno');
    }

    const professionalId = payload.sub as string;
    const studentId = user.student.id;
    const isNutritionistInvite = payload.type === 'nutritionist-invite';

    const existing = isNutritionistInvite
      ? await this.prisma.nutritionistPatient.findUnique({
          where: { nutritionistId_studentId: { nutritionistId: professionalId, studentId } },
        })
      : await this.prisma.trainerStudent.findUnique({
          where: { trainerId_studentId: { trainerId: professionalId, studentId } },
        });

    if (existing?.isActive) {
      return { alreadyLinked: true, user: this.sanitizeUser(user) };
    }

    if (isNutritionistInvite) {
      await this.prisma.nutritionistPatient.upsert({
        where: { nutritionistId_studentId: { nutritionistId: professionalId, studentId } },
        update: { isActive: true, startedAt: new Date(), endedAt: null },
        create: { nutritionistId: professionalId, studentId, isActive: true },
      });
    } else {
      await this.prisma.trainerStudent.upsert({
        where: { trainerId_studentId: { trainerId: professionalId, studentId } },
        update: { isActive: true, startedAt: new Date(), endedAt: null },
        create: { trainerId: professionalId, studentId, isActive: true },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { alreadyLinked: false, user: this.sanitizeUser(user), ...tokens };
  }

  async adminResetPassword(email: string, newPassword: string, adminKey: string) {
    const expectedKey = this.config.get<string>('ADMIN_RESET_KEY');
    if (!expectedKey) {
      throw new BadRequestException('Funcionalidade não configurada. Defina ADMIN_RESET_KEY no ambiente.');
    }
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

    const firstName = (user as any).profile?.firstName || user.email.split('@')[0];
    await this.emailService.sendPasswordResetEmail({
      to: user.email,
      firstName,
      resetUrl,
    });

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

  async deleteMyAccount(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { student: true, trainer: true, nutritionist: true },
      });

      if (!user) throw new NotFoundException('Usuário não encontrado');

      // 1. Dependências RESTRICT do Student
      if (user.student) {
        const sid = user.student.id;
        await tx.workoutLog.deleteMany({ where: { studentId: sid } });
        await tx.workoutPlan.deleteMany({ where: { studentId: sid } });
        await tx.mealLog.deleteMany({ where: { studentId: sid } });
        await tx.dietPlan.deleteMany({ where: { studentId: sid } });
        await tx.appointment.deleteMany({ where: { studentId: sid } });
        await tx.trainerStudent.deleteMany({ where: { studentId: sid } });
        await tx.nutritionistPatient.deleteMany({ where: { studentId: sid } });
        await tx.nutritionalAssessment.deleteMany({ where: { studentId: sid } });
        await tx.physicalAssessment.deleteMany({ where: { studentId: sid } });
        await tx.studentChallenge.deleteMany({ where: { studentId: sid } });
        await tx.trainerStudentGoal.deleteMany({ where: { studentId: sid } });
        await tx.evolutionInsight.deleteMany({ where: { studentId: sid } });
      }

      // 2. Dependências RESTRICT do Trainer
      if (user.trainer) {
        const tid = user.trainer.id;

        const trainerWorkouts = await tx.workout.findMany({
          where: { trainerId: tid },
          select: { id: true },
        });
        if (trainerWorkouts.length > 0) {
          const wIds = trainerWorkouts.map((w) => w.id);
          const wExercises = await tx.workoutExercise.findMany({
            where: { workoutId: { in: wIds } },
            select: { id: true },
          });
          if (wExercises.length > 0) {
            await tx.workoutExerciseLog.deleteMany({
              where: { workoutExerciseId: { in: wExercises.map((e) => e.id) } },
            });
          }
          await tx.workoutPlan.deleteMany({ where: { workoutId: { in: wIds } } });
          await tx.workout.deleteMany({ where: { trainerId: tid } });
        }

        await tx.trainerStudent.deleteMany({ where: { trainerId: tid } });
        await tx.appointment.deleteMany({ where: { trainerId: tid } });
        await tx.studentBilling.deleteMany({ where: { trainerId: tid } });
        await tx.trainerStudentGoal.deleteMany({ where: { trainerId: tid } });
      }

      // 3. Dependências RESTRICT do Nutritionist
      if (user.nutritionist) {
        const nid = user.nutritionist.id;

        const nutritionistDiets = await tx.diet.findMany({
          where: { nutritionistId: nid },
          select: { id: true },
        });
        if (nutritionistDiets.length > 0) {
          const dIds = nutritionistDiets.map((d) => d.id);
          await tx.dietPlan.deleteMany({ where: { dietId: { in: dIds } } });
        }

        await tx.nutritionistPatient.deleteMany({ where: { nutritionistId: nid } });
        await tx.diet.deleteMany({ where: { nutritionistId: nid } });
        await tx.nutritionalConsultation.deleteMany({ where: { nutritionistId: nid } });
        await tx.clinicalNote.deleteMany({ where: { nutritionistId: nid } });
        await tx.supplementationPlan.deleteMany({ where: { nutritionistId: nid } });
        await tx.patientExam.deleteMany({ where: { nutritionistId: nid } });
      }

      // 4. Dependências RESTRICT do User
      await tx.chatParticipant.deleteMany({ where: { userId } });
      await tx.message.deleteMany({ where: { senderId: userId } });

      // 5. Deletar User (cascade → Student, Trainer, Nutritionist, Profile, RefreshToken, DeviceToken, Notification)
      await tx.user.delete({ where: { id: userId } });

      this.logger.log(`[DeleteAccount] Conta excluída: ${user.email} (${user.role})`);

      return { message: 'Conta excluída com sucesso. Todos os seus dados foram removidos.', email: user.email };
    });
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

  /**
   * Remove a senha e, quando trainer/nutritionist vierem incluídos na query,
   * troca os objetos de relação por flags booleanas simples (o front só
   * precisa saber SE existe o sub-perfil, não os dados dele) — usado pelo
   * seletor de papel para contas que são personal E nutricionista.
   */
  private sanitizeUser(user: any) {
    const { password, trainer, nutritionist, ...rest } = user;
    const result: any = { ...rest };
    if (trainer !== undefined) result.hasTrainerProfile = !!trainer;
    if (nutritionist !== undefined) result.hasNutritionistProfile = !!nutritionist;
    return result;
  }

  /**
   * Troca o papel ATIVO de uma conta que já possui os dois sub-perfis
   * (personal e nutricionista). Não precisa reemitir token: o JwtStrategy
   * busca o `role` direto do banco a cada request, então a troca já vale
   * na próxima chamada com o mesmo access token.
   */
  async switchRole(userId: string, role: 'TRAINER' | 'NUTRITIONIST') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { trainer: true, nutritionist: true, profile: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const hasProfile = role === 'TRAINER' ? !!user.trainer : !!user.nutritionist;
    if (!hasProfile) {
      throw new BadRequestException(
        role === 'TRAINER'
          ? 'Esta conta ainda não tem perfil de personal trainer'
          : 'Esta conta ainda não tem perfil de nutricionista',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: role === 'TRAINER' ? UserRole.TRAINER : UserRole.NUTRITIONIST },
      include: { trainer: true, nutritionist: true, profile: true },
    });

    return { user: this.sanitizeUser(updated) };
  }

  /**
   * Cria o sub-perfil que falta (trainer OU nutritionist) para uma conta que
   * já é uma dessas duas coisas, reaproveitando o MESMO usuário/tenant — em
   * vez de exigir um segundo cadastro com e-mail diferente. Já deixa o novo
   * papel como ativo, pronto pra configurar.
   */
  async addRole(userId: string, role: 'TRAINER' | 'NUTRITIONIST') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { trainer: true, nutritionist: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (user.role !== UserRole.TRAINER && user.role !== UserRole.NUTRITIONIST) {
      throw new BadRequestException('Apenas contas de personal ou nutricionista podem adicionar o outro papel');
    }

    if (role === 'TRAINER' && !user.trainer) {
      await this.prisma.trainer.create({ data: { userId } });
    } else if (role === 'NUTRITIONIST' && !user.nutritionist) {
      await this.prisma.nutritionist.create({ data: { userId } });
    }

    return this.switchRole(userId, role);
  }
}
