import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { ReplyThreadDto } from './dto/reply-thread.dto';

@Controller('threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  /**
   * POST /api/threads
   * Create a new email thread with an AI-generated email.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createThread(@Body() createThreadDto: CreateThreadDto) {
    const { prompt, tone, recipientName } = createThreadDto;
    return this.threadsService.createThreadWithEmail(
      prompt,
      tone || 'professional',
      recipientName,
    );
  }

  /**
   * GET /api/threads
   * List all email threads.
   */
  @Get()
  async getAllThreads() {
    const threads = await this.threadsService.getThreads();
    return { threads };
  }

  /**
   * GET /api/threads/:threadId
   * Get the details of a specific thread with all messages.
   */
  @Get(':threadId')
  async getThread(@Param('threadId') threadId: string) {
    return this.threadsService.getThreadDetails(threadId);
  }

  /**
   * POST /api/threads/:threadId/reply
   * Reply to an existing thread with context-aware AI generation.
   */
  @Post(':threadId/reply')
  @HttpCode(HttpStatus.CREATED)
  async replyToThread(
    @Param('threadId') threadId: string,
    @Body() replyThreadDto: ReplyThreadDto,
  ) {
    const { replyInstruction, tone } = replyThreadDto;
    const email = await this.threadsService.replyToThread(
      threadId,
      replyInstruction,
      tone,
    );
    return { email };
  }
}
