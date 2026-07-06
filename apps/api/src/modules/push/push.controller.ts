import { Controller, Get, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('push')
@Controller('push')
export class PushController {
  constructor(private pushService: PushService) {}

  /**
   * Endpoint público — retorna a VAPID public key para inscrição push
   */
  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Retorna a VAPID public key para push notifications' })
  getVapidPublicKey() {
    return this.pushService.getVapidPublicKey();
  }

  /**
   * Inscreve o dispositivo do usuário em push notifications
   */
  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inscrever dispositivo em push notifications' })
  @HttpCode(200)
  async subscribe(
    @CurrentUser() user: any,
    @Body() body: { subscription: any; userAgent?: string },
  ) {
    return this.pushService.subscribe(user.id, body.subscription, body.userAgent);
  }

  /**
   * Remove a inscrição push do dispositivo
   */
  @Post('unsubscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover inscrição push' })
  @HttpCode(200)
  async unsubscribe(
    @CurrentUser() user: any,
    @Body() body?: { subscription?: any },
  ) {
    return this.pushService.unsubscribe(user.id, body?.subscription);
  }
}
