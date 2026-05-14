import { Controller, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil do usuário autenticado' })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Put('me/profile')
  @ApiOperation({ summary: 'Atualizar perfil' })
  updateProfile(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.usersService.updateProfile(userId, data);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar usuários' })
  search(
    @CurrentUser('tenantId') tenantId: string,
    @Query('q') query: string,
    @Query('role') role?: string,
  ) {
    return this.usersService.searchUsers(tenantId, query, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
