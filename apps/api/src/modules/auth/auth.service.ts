import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
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
      await this.prisma.tenantSubscription.create({ data: { tenantId: tenant.id } });
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

    return { user: this.sanitizeUser(user), ...tokens };
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
