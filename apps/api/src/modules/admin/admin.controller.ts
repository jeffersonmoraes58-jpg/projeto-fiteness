import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private service: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard principal do admin' })
  getDashboard() {
    return this.service.getDashboard();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas gerais da plataforma' })
  getStats() {
    return this.service.getStats();
  }

  @Get('health')
  @ApiOperation({ summary: 'Saúde dos serviços (DB, Redis, IA)' })
  getHealth() {
    return this.service.getHealth();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Analytics de crescimento e uso' })
  getAnalytics(@Query('period') period?: string) {
    return this.service.getAnalytics(period);
  }

  @Get('tenants')
  @ApiOperation({ summary: 'Listar tenants' })
  getTenants(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getTenants(search, page ? +page : 1, limit ? +limit : 20);
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Detalhe de um tenant' })
  getTenant(@Param('id') id: string) {
    return this.service.getTenant(id);
  }

  @Patch('tenants/:id')
  @ApiOperation({ summary: 'Atualizar tenant' })
  updateTenant(@Param('id') id: string, @Body() body: any) {
    return this.service.updateTenant(id, body);
  }

  @Get('users')
  @ApiOperation({ summary: 'Listar usuários' })
  getUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getUsers(search, role, page ? +page : 1, limit ? +limit : 20);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Ativar/desativar usuário ou alterar role' })
  updateUser(@Param('id') id: string, @Body() body: { isActive?: boolean; role?: string }) {
    return this.service.updateUser(id, body);
  }

  // ── Notificações em massa ─────────────────────────────────

  @Get('notifications')
  @ApiOperation({ summary: 'Listar broadcasts enviados (agrupados)' })
  listBroadcasts() {
    return this.service.listBroadcasts();
  }

  @Post('notifications/broadcast')
  @ApiOperation({ summary: 'Enviar notificação para todos os usuários (ou por role)' })
  broadcast(@Body() body: { title: string; body: string; type?: 'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT'; targetRole?: string | null }) {
    return this.service.broadcast(body);
  }

  @Delete('notifications/:id')
  @ApiOperation({ summary: 'Apagar broadcast (e todas as notificações geradas)' })
  deleteBroadcast(@Param('id') id: string) {
    return this.service.deleteBroadcast(id);
  }

  // ── Configurações da plataforma ───────────────────────────

  @Get('settings')
  @ApiOperation({ summary: 'Configurações globais da plataforma' })
  getSettings() {
    return this.service.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Atualizar configurações (features, limits, email)' })
  updateSettings(@Body() body: { features?: any; limits?: any; email?: any }) {
    return this.service.updateSettings(body);
  }
}
