import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { DriverLocationHistory } from '../../entities/driver-location-history.entity';
import { Trip, TripStatusType } from '../../entities/trip.entity';
import { corsOrigin } from '../../config/cors';

@WebSocketGateway({
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
})
@Injectable()
export class RideGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private activeConnections = new Map<
    string,
    { userId: number; role: string; socketId: string }
  >();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(DriverLocationHistory)
    private readonly locationRepo: Repository<DriverLocationHistory>,
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
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

      this.activeConnections.set(client.id, {
        userId,
        role,
        socketId: client.id,
      });
      client.join(`${role}_${userId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.activeConnections.delete(client.id);
  }

  @SubscribeMessage('joinRideRoom')
  async handleJoinRideRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { requestId?: number; tripId?: number },
  ) {
    if (data.requestId) client.join(`request_${data.requestId}`);
    if (data.tripId) client.join(`trip_${data.tripId}`);
    return { status: 'success' };
  }

  @SubscribeMessage('updateDriverLocation')
  async handleUpdateDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number },
  ) {
    const connection = this.activeConnections.get(client.id);
    if (!connection || connection.role !== 'driver') {
      return { error: 'Only drivers can update their location.' };
    }

    const { lat, lng } = data;
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return { error: 'Invalid coordinates.' };
    }

    const history = await this.locationRepo.save(
      this.locationRepo.create({
        driverId: connection.userId,
        latitude: lat.toString(),
        longitude: lng.toString(),
        recordedAt: new Date(),
      }),
    );

    const activeTrip = await this.tripRepo.findOne({
      where: {
        driverId: connection.userId,
        status: TripStatusType.ongoing,
      },
    });

    if (activeTrip) {
      this.server.to(`trip_${activeTrip.tripId}`).emit('locationUpdated', {
        driverId: connection.userId,
        latitude: lat,
        longitude: lng,
        recordedAt: history.recordedAt,
      });
    }

    return { status: 'success' };
  }

  emitToTrip(tripId: number, event: string, payload: unknown) {
    this.server.to(`trip_${tripId}`).emit(event, payload);
  }

  emitToRequest(requestId: number, event: string, payload: unknown) {
    this.server.to(`request_${requestId}`).emit(event, payload);
  }

  emitToUser(
    userId: number,
    role: 'customer' | 'driver',
    event: string,
    payload: unknown,
  ) {
    this.server.to(`${role}_${userId}`).emit(event, payload);
  }
}
