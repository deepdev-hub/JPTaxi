import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Conversation } from '../../entities/conversation.entity';
import { Customer } from '../../entities/customer.entity';
import { Driver } from '../../entities/driver.entity';
import { Message, MessageSenderType } from '../../entities/message.entity';
import { RideRequest } from '../../entities/ride-request.entity';
import { Trip, TripStatusType } from '../../entities/trip.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesGateway } from './messages.gateway';

type AuthUser = { id: number; role: string };

@Injectable()
export class MessagesService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messages: Repository<Message>,
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(Driver)
    private readonly drivers: Repository<Driver>,
    @InjectRepository(RideRequest)
    private readonly rideRequests: Repository<RideRequest>,
    @InjectRepository(Trip)
    private readonly trips: Repository<Trip>,
    private readonly messagesGateway: MessagesGateway,
  ) {}

  async onModuleInit() {
    await this.ensureMessagingSchema();
  }

  private async ensureMessagingSchema() {
    await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'message_sender_type'
        ) THEN
          CREATE TYPE message_sender_type AS ENUM ('customer', 'driver');
        END IF;
      END $$;
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS conversation (
        conversation_id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL,
        driver_id INT NOT NULL,
        request_id INT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NULL,
        FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE CASCADE,
        FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE CASCADE,
        FOREIGN KEY (request_id) REFERENCES ride_request(request_id) ON DELETE SET NULL,
        UNIQUE (customer_id, driver_id)
      );
    `);
    await this.dataSource.query(`
      ALTER TABLE conversation
        ADD COLUMN IF NOT EXISTS request_id INT NULL,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NULL;
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS message (
        message_id SERIAL PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_type message_sender_type NOT NULL,
        sender_id INT NOT NULL,
        body TEXT NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMPTZ NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversation(conversation_id) ON DELETE CASCADE
      );
    `);
    await this.dataSource.query(`
      ALTER TABLE message
        ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ NULL;
    `);

    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_message_conversation_sent
        ON message(conversation_id, sent_at DESC);
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_customer
        ON conversation(customer_id, updated_at DESC);
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_driver
        ON conversation(driver_id, updated_at DESC);
    `);
  }

  async listConversations(user: AuthUser) {
    const qb = this.conversations
      .createQueryBuilder('c')
      .innerJoin('customer', 'cu', 'cu.customer_id = c.customer_id')
      .innerJoin('driver', 'd', 'd.driver_id = c.driver_id')
      .select([
        'c.conversation_id AS "conversationId"',
        'c.customer_id AS "customerId"',
        'c.driver_id AS "driverId"',
        'c.request_id AS "requestId"',
        'c.updated_at AS "updatedAt"',
        'cu.first_name AS "customerFirstName"',
        'cu.last_name AS "customerLastName"',
        'cu.avatar_url AS "customerAvatarUrl"',
        'd.first_name AS "driverFirstName"',
        'd.last_name AS "driverLastName"',
        'd.avatar_url AS "driverAvatarUrl"',
      ])
      .innerJoin(Trip, 't', 't.request_id = c.request_id AND t.status = :ongoingStatus')
      .setParameter('ongoingStatus', TripStatusType.ongoing);

    if (user.role === 'driver') {
      qb.where('c.driver_id = :userId', { userId: user.id });
    } else {
      qb.where('c.customer_id = :userId', { userId: user.id });
    }

    qb.orderBy('c.updated_at', 'DESC', 'NULLS LAST').addOrderBy(
      'c.conversation_id',
      'DESC',
    );

    const rows = await qb.getRawMany<Record<string, string | number | Date | null>>();
    const items = await Promise.all(
      rows.map(async (row) => {
        const conversationId = Number(row.conversationId);
        const lastMessage = await this.messages.findOne({
          where: { conversationId },
          order: { sentAt: 'DESC' },
        });
        const unreadCount = await this.countUnread(conversationId, user);
        const peer = this.buildPeerSummary(user, row);
        return {
          conversationId,
          requestId: row.requestId != null ? Number(row.requestId) : null,
          updatedAt: row.updatedAt,
          peer,
          lastMessage: lastMessage
            ? this.toMessageDto(lastMessage, user)
            : null,
          unreadCount,
        };
      }),
    );

    return { items, count: items.length };
  }

  async getOrCreateConversation(user: AuthUser, dto: CreateConversationDto) {
    const { customerId, driverId } = await this.resolveParticipants(
      user,
      dto.peerRole,
      dto.peerId,
    );

    if (dto.requestId != null) {
      await this.assertActiveTripLink(dto.requestId, customerId, driverId);
    } else {
      const activeTrip = await this.findActiveTripForPair(customerId, driverId);
      if (!activeTrip) {
        throw new BadRequestException('Chỉ có thể chat khi hai bên đang có chuyến xe.');
      }
      dto.requestId = Number(activeTrip.requestId);
    }

    let conversation = await this.conversations.findOne({
      where: { customerId, driverId },
    });

    if (!conversation) {
      conversation = await this.conversations.save(
        this.conversations.create({
          customerId,
          driverId,
          requestId: dto.requestId ?? null,
        }),
      );
    } else if (dto.requestId != null && conversation.requestId !== dto.requestId) {
      conversation.requestId = dto.requestId;
      conversation = await this.conversations.save(conversation);
    }

    return this.getConversationDetail(conversation.conversationId, user);
  }

  async getConversation(conversationId: number, user: AuthUser) {
    return this.getConversationDetail(conversationId, user);
  }

  async listMessages(
    conversationId: number,
    user: AuthUser,
    limit = 50,
    beforeMessageId?: number,
  ) {
    await this.assertConversationAccess(conversationId, user);

    const take = Math.min(Math.max(limit, 1), 100);
    const qb = this.messages
      .createQueryBuilder('m')
      .where('m.conversation_id = :conversationId', { conversationId })
      .orderBy('m.sent_at', 'DESC')
      .limit(take);

    if (beforeMessageId != null) {
      qb.andWhere('m.message_id < :beforeMessageId', { beforeMessageId });
    }

    const rows = await qb.getMany();
    await this.markConversationRead(conversationId, user);

    return {
      conversationId,
      items: rows.reverse().map((m) => this.toMessageDto(m, user)),
      hasMore: rows.length === take,
    };
  }

  async sendMessage(
    conversationId: number,
    user: AuthUser,
    dto: SendMessageDto,
  ) {
    const conversation = await this.assertConversationAccess(conversationId, user);
    const senderType = this.senderTypeFromUser(user);
    const body = dto.body.trim();

    const saved = await this.messages.save(
      this.messages.create({
        conversationId,
        senderType,
        senderId: user.id,
        body,
      }),
    );

    conversation.updatedAt = new Date();
    await this.conversations.save(conversation);

    const messageDto = this.toMessageDto(saved, user);
    const recipient = this.recipientFromConversation(conversation, user);
    this.messagesGateway.emitNewMessage(recipient, {
      conversationId,
      message: messageDto,
    });

    return {
      message: 'Tin nhắn đã được gửi.',
      data: messageDto,
    };
  }

  async markConversationRead(conversationId: number, user: AuthUser) {
    await this.assertConversationAccess(conversationId, user);
    const senderType = this.senderTypeFromUser(user);

    await this.messages
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: () => 'NOW()' })
      .where('conversation_id = :conversationId', { conversationId })
      .andWhere('read_at IS NULL')
      .andWhere(
        '(sender_type != :senderType OR sender_id != :senderId)',
        { senderType, senderId: user.id },
      )
      .execute();

    return { conversationId, read: true };
  }

  private async getConversationDetail(conversationId: number, user: AuthUser) {
    const conversation = await this.assertConversationAccess(conversationId, user);
    const [customer, driver] = await Promise.all([
      this.customers.findOne({ where: { customerId: conversation.customerId } }),
      this.drivers.findOne({ where: { driverId: conversation.driverId } }),
    ]);

    const peer =
      user.role === 'driver'
        ? {
            role: 'customer' as const,
            id: conversation.customerId,
            name: customer
              ? `${customer.lastName} ${customer.firstName}`.trim()
              : 'Khách hàng',
            avatarUrl: customer?.avatarUrl ?? null,
          }
        : {
            role: 'driver' as const,
            id: conversation.driverId,
            name: driver
              ? `${driver.lastName} ${driver.firstName}`.trim()
              : 'Tài xế',
            avatarUrl: driver?.avatarUrl ?? null,
          };

    return {
      conversationId: conversation.conversationId,
      requestId: conversation.requestId,
      customerId: conversation.customerId,
      driverId: conversation.driverId,
      peer,
      unreadCount: await this.countUnread(conversationId, user),
    };
  }

  private async assertConversationAccess(
    conversationId: number,
    user: AuthUser,
  ): Promise<Conversation> {
    const conversation = await this.conversations.findOne({
      where: { conversationId },
    });
    if (!conversation) {
      throw new NotFoundException('Không tìm thấy hội thoại.');
    }
    if (user.role === 'driver') {
      if (conversation.driverId !== user.id) {
        throw new ForbiddenException('Bạn không có quyền truy cập hội thoại này.');
      }
    } else if (conversation.customerId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền truy cập hội thoại này.');
    }
    await this.assertActiveTripLink(conversation.requestId, conversation.customerId, conversation.driverId);
    return conversation;
  }

  private async resolveParticipants(
    user: AuthUser,
    peerRole: 'customer' | 'driver',
    peerId: number,
  ): Promise<{ customerId: number; driverId: number }> {
    if (user.role === 'driver') {
      if (peerRole !== 'customer') {
        throw new BadRequestException('Tài xế chỉ có thể nhắn tin với khách hàng.');
      }
      const customer = await this.customers.findOne({
        where: { customerId: peerId },
      });
      if (!customer) {
        throw new NotFoundException('Không tìm thấy khách hàng.');
      }
      return { customerId: peerId, driverId: user.id };
    }

    if (peerRole !== 'driver') {
      throw new BadRequestException('Khách hàng chỉ có thể nhắn tin với tài xế.');
    }
    const driver = await this.drivers.findOne({ where: { driverId: peerId } });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy tài xế.');
    }
    return { customerId: user.id, driverId: peerId };
  }

  private async assertActiveTripLink(
    requestId: number | null,
    customerId: number,
    driverId: number,
  ): Promise<void> {
    if (requestId == null) {
      throw new BadRequestException('Chỉ có thể chat khi hai bên đang có chuyến xe.');
    }
    const request = await this.rideRequests.findOne({
      where: { requestId },
    });
    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu đặt xe.');
    }
    if (request.customerId !== customerId) {
      throw new BadRequestException('Yêu cầu đặt xe không thuộc khách hàng này.');
    }
    const trip = await this.trips
      .createQueryBuilder('trip')
      .innerJoin('trip.rideRequest', 'rr')
      .where('rr.request_id = :requestId', { requestId })
      .andWhere('trip.driver_id = :driverId', { driverId })
      .andWhere('trip.status = :status', { status: TripStatusType.ongoing })
      .getOne();
    if (!trip) {
      throw new BadRequestException('Chỉ có thể chat khi chuyến xe đang diễn ra.');
    }
  }

  private findActiveTripForPair(customerId: number, driverId: number) {
    return this.trips
      .createQueryBuilder('trip')
      .innerJoin('trip.rideRequest', 'rr')
      .select('rr.request_id', 'requestId')
      .where('rr.customer_id = :customerId', { customerId })
      .andWhere('trip.driver_id = :driverId', { driverId })
      .andWhere('trip.status = :status', { status: TripStatusType.ongoing })
      .orderBy('trip.start_time', 'DESC')
      .getRawOne<{ requestId: number }>();
  }

  private senderTypeFromUser(user: AuthUser): MessageSenderType {
    return user.role === 'driver'
      ? MessageSenderType.driver
      : MessageSenderType.customer;
  }

  private toMessageDto(message: Message, viewer: AuthUser) {
    const isMine =
      message.senderType === this.senderTypeFromUser(viewer) &&
      message.senderId === viewer.id;
    return {
      messageId: message.messageId,
      conversationId: message.conversationId,
      senderType: message.senderType,
      senderId: message.senderId,
      body: message.body,
      sentAt: message.sentAt,
      readAt: message.readAt,
      isMine,
    };
  }

  private buildPeerSummary(user: AuthUser, row: Record<string, unknown>) {
    if (user.role === 'driver') {
      return {
        role: 'customer' as const,
        id: Number(row.customerId),
        name: `${row.customerLastName ?? ''} ${row.customerFirstName ?? ''}`.trim(),
        avatarUrl: row.customerAvatarUrl != null ? String(row.customerAvatarUrl) : null,
      };
    }
    return {
      role: 'driver' as const,
      id: Number(row.driverId),
      name: `${row.driverLastName ?? ''} ${row.driverFirstName ?? ''}`.trim(),
      avatarUrl: row.driverAvatarUrl != null ? String(row.driverAvatarUrl) : null,
    };
  }

  private async countUnread(conversationId: number, user: AuthUser): Promise<number> {
    const senderType = this.senderTypeFromUser(user);
    return this.messages
      .createQueryBuilder('m')
      .where('m.conversation_id = :conversationId', { conversationId })
      .andWhere('m.read_at IS NULL')
      .andWhere(
        '(m.sender_type != :senderType OR m.sender_id != :senderId)',
        { senderType, senderId: user.id },
      )
      .getCount();
  }

  private recipientFromConversation(
    conversation: Conversation,
    sender: AuthUser,
  ): { role: 'customer' | 'driver'; id: number } {
    if (sender.role === 'driver') {
      return { role: 'customer', id: conversation.customerId };
    }
    return { role: 'driver', id: conversation.driverId };
  }
}
