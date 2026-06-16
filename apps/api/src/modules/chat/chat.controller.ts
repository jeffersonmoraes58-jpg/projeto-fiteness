import { Controller, Get, Post, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService, private chatGateway: ChatGateway) {}

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
  async sendMessage(
    @Param('chatId') chatId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { content?: string; type?: string; fileUrl?: string; fileName?: string },
  ) {
    if (!body.content?.trim() && !body.fileUrl) throw new BadRequestException('Conteúdo ou arquivo obrigatório');
    const message = await this.chatService.sendMessage(userId, chatId, body as any);
    this.chatGateway.server.to(`chat:${chatId}`).emit('message:received', message);
    const participantIds = await this.chatService.getChatParticipantIds(chatId);
    for (const participantId of participantIds) {
      if (participantId !== userId) {
        this.chatGateway.server.to(`user:${participantId}`).emit('notification:message', { chatId, senderId: userId });
      }
    }
    return message;
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
