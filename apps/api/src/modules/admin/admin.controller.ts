import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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

  @Get('analytics')
  @ApiOperation({ summary: 'Analytics de crescimento (últimos 30 dias)' })
  getAnalytics() {
    return this.service.getAnalytics();
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
}
