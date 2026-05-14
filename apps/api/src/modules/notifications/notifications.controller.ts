import { Controller, Get, Post, Delete, Param, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificações (últimas 50)' })
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Contagem de notificações não lidas' })
  getUnreadCount(@CurrentUser() user: any) {
    return this.service.getUnreadCount(user.id);
  }

  @Post(':id/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.markAsRead(user.id, id);
  }

  @Post('read-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Marcar todas como lidas' })
  markAllAsRead(@CurrentUser() user: any) {
    return this.service.markAllAsRead(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover notificação' })
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.delete(user.id, id);
  }
}
