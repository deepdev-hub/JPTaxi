import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { JwtValidatedUser } from '../auth/jwt.strategy';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ListMessagesQueryDto } from './dto/list-messages.query.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

type AuthedRequest = Request & { user: JwtValidatedUser };

@Controller('messages')
@UseGuards(AuthGuard('jwt'))
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('conversations')
  listConversations(@Req() req: AuthedRequest) {
    return this.messages.listConversations(req.user);
  }

  @Post('conversations')
  createConversation(
    @Req() req: AuthedRequest,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messages.getOrCreateConversation(req.user, dto);
  }

  @Get('conversations/:conversationId')
  getConversation(
    @Req() req: AuthedRequest,
    @Param('conversationId', ParseIntPipe) conversationId: number,
  ) {
    return this.messages.getConversation(conversationId, req.user);
  }

  @Get('conversations/:conversationId/messages')
  listMessages(
    @Req() req: AuthedRequest,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.messages.listMessages(
      conversationId,
      req.user,
      query.limit ?? 50,
      query.beforeMessageId,
    );
  }

  @Post('conversations/:conversationId/messages')
  sendMessage(
    @Req() req: AuthedRequest,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.messages.sendMessage(conversationId, req.user, dto);
  }

  @Post('conversations/:conversationId/read')
  markRead(
    @Req() req: AuthedRequest,
    @Param('conversationId', ParseIntPipe) conversationId: number,
  ) {
    return this.messages.markConversationRead(conversationId, req.user);
  }
}
