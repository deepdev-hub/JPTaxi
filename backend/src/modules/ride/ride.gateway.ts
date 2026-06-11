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
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverLocationHistory } from '../../entities/driver-location-history.entity';
import { Trip, TripStatusType } from '../../entities/trip.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class RideGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Bản ghi các kết nối đang hoạt động (in-memory mapping)
  private activeConnections = new Map<string, { userId: number; role: string; socketId: string }>();

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
      // 1. Lấy token JWT từ Header Auth hoặc Query String
      const token =
        client.handshake.auth?.token?.split(' ')[1] ||
        client.handshake.query?.token;

      if (!token) {
        client.disconnect();
        return;
      }

      // 2. Xác thực và giải mã token
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'jp-taxi-dev-secret'),
      });

      const userId = decoded.id;
      const role = decoded.role || 'customer';

      // 3. Lưu thông tin ánh xạ socket
      this.activeConnections.set(client.id, { userId, role, socketId: client.id });

      // 4. Cho socket tự động tham gia vào phòng cá nhân để nhận thông báo trực tiếp
      client.join(`${role}_${userId}`);
      console.log(`[Socket.io] Client kết nối thành công: ${role} ID ${userId} (Socket: ${client.id})`);
    } catch (err) {
      console.error('[Socket.io] Xác thực kết nối thất bại:', err.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const conn = this.activeConnections.get(client.id);
    if (conn) {
      console.log(`[Socket.io] Client ngắt kết nối: ${conn.role} ID ${conn.userId}`);
      this.activeConnections.delete(client.id);
    }
  }

  /**
   * Khách hàng hoặc tài xế tham gia vào phòng cuốc xe/chuyến đi
   */
  @SubscribeMessage('joinRideRoom')
  async handleJoinRideRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { requestId?: number; tripId?: number },
  ) {
    if (data.requestId) {
      client.join(`request_${data.requestId}`);
      console.log(`[Socket.io] Socket ${client.id} tham gia phòng request_${data.requestId}`);
    }
    if (data.tripId) {
      client.join(`trip_${data.tripId}`);
      console.log(`[Socket.io] Socket ${client.id} tham gia phòng trip_${data.tripId}`);
    }
    return { status: 'success' };
  }

  /**
   * Tài xế phát sóng tọa độ GPS thời gian thực của họ
   */
  @SubscribeMessage('updateDriverLocation')
  async handleUpdateDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number },
  ) {
    const conn = this.activeConnections.get(client.id);
    if (!conn || conn.role !== 'driver') {
      return { error: 'Unauthorized: Chỉ có tài xế mới có quyền cập nhật tọa độ.' };
    }

    const { userId: driverId } = conn;
    const { lat, lng } = data;

    // 1. Lưu lịch sử tọa độ GPS vào bảng `driver_location_history`
    const history = this.locationRepo.create({
      driverId,
      latitude: lat.toString(),
      longitude: lng.toString(),
      recordedAt: new Date(),
    });
    await this.locationRepo.save(history);

    // 2. Tìm chuyến đi đang hoạt động (ongoing) của tài xế này
    const activeTrip = await this.tripRepo
      .createQueryBuilder('trip')
      .innerJoinAndSelect('trip.rideRequest', 'rideRequest')
      .where('trip.driver_id = :driverId', { driverId })
      .andWhere('trip.status = :status', { status: TripStatusType.ongoing })
      .getOne();

    if (activeTrip) {
      // 3. Tính khoảng cách địa lý (Euclid * 111) và ETA từ tọa độ tài xế đến điểm trả khách
      const targetLat = parseFloat(activeTrip.rideRequest.dropoffLat);
      const targetLng = parseFloat(activeTrip.rideRequest.dropoffLng);

      const distance =
        Math.sqrt(
          Math.pow(targetLat - lat, 2) + Math.pow(targetLng - lng, 2),
        ) * 111;

      // Tính ETA dự kiến dựa trên vận tốc trung bình 30 km/h
      const eta = Math.round((distance / 30) * 60);

      // 4. Phát sóng thời gian thực đến room chuyến đi (trip room) cho khách hàng xem bản đồ cập nhật
      this.server.to(`trip_${activeTrip.tripId}`).emit('locationUpdated', {
        driverId,
        latitude: lat,
        longitude: lng,
        distanceKm: distance.toFixed(2),
        etaMinutes: eta,
      });
    }

    return { status: 'success' };
  }

  /**
   * Các hàm phụ trợ (helper) phát tín hiệu từ các Service khác
   */
  emitToTrip(tripId: number, event: string, payload: any) {
    this.server.to(`trip_${tripId}`).emit(event, payload);
  }

  emitToRequest(requestId: number, event: string, payload: any) {
    this.server.to(`request_${requestId}`).emit(event, payload);
  }

  emitToUser(userId: number, role: 'customer' | 'driver', event: string, payload: any) {
    this.server.to(`${role}_${userId}`).emit(event, payload);
  }
}
