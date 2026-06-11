import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../../entities/conversation.entity';
import { Customer } from '../../entities/customer.entity';
import { Driver } from '../../entities/driver.entity';
import { Message } from '../../entities/message.entity';
import { RideRequest } from '../../entities/ride-request.entity';
import { Trip } from '../../entities/trip.entity';
import { AuthModule } from '../auth/auth.module';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      Customer,
      Driver,
      RideRequest,
      Trip,
    ]),
    AuthModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
  exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
