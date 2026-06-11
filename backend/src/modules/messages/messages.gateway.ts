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

type Recipient = { role: 'customer' | 'driver'; id: number };

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' },
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
        client.handshake.auth?.token?.split(' ')[1] ||
        client.handshake.query?.token;

      if (!token) {
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'jp-taxi-dev-secret'),
      });

      const userId = decoded.id as number;
      const role = (decoded.role as string) || 'customer';

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
