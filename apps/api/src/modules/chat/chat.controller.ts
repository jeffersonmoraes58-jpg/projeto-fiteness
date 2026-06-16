import { Controller, Get, Post, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('direct/:targetUserId')
  @ApiOperation({ summary: 'Criar ou buscar chat direto' })
  createOrGetDirectChat(
    @CurrentUser('id') userId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.chatService.createOrGetDirectChat(userId, targetUserId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar chats do usuário' })
  getUserChats(@CurrentUser('id') userId: string) {
    return this.chatService.getUserChats(userId);
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Total de mensagens não lidas' })
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.chatService.getUnreadCount(userId);
  }

  @Get(':chatId/messages')
  @ApiOperation({ summary: 'Mensagens do chat' })
  getChatMessages(
    @Param('chatId') chatId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getChatMessages(chatId, userId, page, limit);
  }

  @Post(':chatId/messages')
  @ApiOperation({ summary: 'Enviar mensagem via HTTP (fallback)' })
  sendMessage(
    @Param('chatId') chatId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { content: string; type?: string },
  ) {
    if (!body.content?.trim()) throw new BadRequestException('Conteúdo obrigatório');
    return this.chatService.sendMessage(userId, chatId, body as any);
  }

  @Post(':chatId/mark-read')
  @ApiOperation({ summary: 'Marcar mensagens como lidas (fallback HTTP)' })
  markAsRead(
    @Param('chatId') chatId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.markAsRead(userId, chatId);
  }
}
