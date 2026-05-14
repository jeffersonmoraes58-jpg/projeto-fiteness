import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, string>();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      client.data.userId = payload.sub;
      this.connectedUsers.set(payload.sub, client.id);

      client.join(`user:${payload.sub}`);

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
      this.server.emit('user:online', { userId: payload.sub });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectedUsers.delete(userId);
      this.server.emit('user:offline', { userId });
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:join')
  async handleJoinChat(@ConnectedSocket() client: Socket, @MessageBody() data: { chatId: string }) {
    client.join(`chat:${data.chatId}`);
    return { event: 'chat:joined', data: { chatId: data.chatId } };
  }

  @SubscribeMessage('chat:leave')
  async handleLeaveChat(@ConnectedSocket() client: Socket, @MessageBody() data: { chatId: string }) {
    client.leave(`chat:${data.chatId}`);
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; content: string; type?: string },
  ) {
    const userId = client.data.userId;
    const message = await this.chatService.sendMessage(userId, data.chatId, {
      content: data.content,
      type: data.type as any,
    });

    this.server.to(`chat:${data.chatId}`).emit('message:received', message);

    return message;
  }

  @SubscribeMessage('message:read')
  async handleReadMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const userId = client.data.userId;
    await this.chatService.markAsRead(userId, data.chatId);
    this.server.to(`chat:${data.chatId}`).emit('message:read', { userId, chatId: data.chatId });
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() data: { chatId: string }) {
    client.to(`chat:${data.chatId}`).emit('typing:start', { userId: client.data.userId });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(@ConnectedSocket() client: Socket, @MessageBody() data: { chatId: string }) {
    client.to(`chat:${data.chatId}`).emit('typing:stop', { userId: client.data.userId });
  }

  sendNotificationToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
