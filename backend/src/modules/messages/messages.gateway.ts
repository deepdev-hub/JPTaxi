import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { corsOrigin } from '../../config/cors';

type Recipient = { role: 'customer' | 'driver'; id: number };

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
})
@Injectable()
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connections = new Map<string, { userId: number; role: string }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token?.replace(/^Bearer\s+/i, '') ||
        client.handshake.query?.token;

      if (!token || Array.isArray(token)) {
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      const userId = Number(decoded.id);
      const role = String(decoded.role);
      if (!Number.isInteger(userId) || !['customer', 'driver'].includes(role)) {
        client.disconnect();
        return;
      }

      this.connections.set(client.id, { userId, role });
      client.join(this.userRoom(role, userId));
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connections.delete(client.id);
  }

  @SubscribeMessage('joinConversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: number },
  ) {
    if (data.conversationId != null) {
      client.join(`conversation_${data.conversationId}`);
    }
    return { status: 'success' };
  }

  emitNewMessage(
    recipient: Recipient,
    payload: { conversationId: number; message: unknown },
  ) {
    this.server.to(this.userRoom(recipient.role, recipient.id)).emit('newMessage', payload);
    this.server.to(`conversation_${payload.conversationId}`).emit('newMessage', payload);
  }

  private userRoom(role: string, userId: number): string {
    return `${role}_${userId}`;
  }
}
