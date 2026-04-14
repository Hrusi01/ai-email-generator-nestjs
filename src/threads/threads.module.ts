import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';
import { EmailThread, EmailThreadSchema } from '../schemas/email-thread.schema';
import { Email, EmailSchema } from '../schemas/email.schema';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmailThread.name, schema: EmailThreadSchema },
      { name: Email.name, schema: EmailSchema },
    ]),
    AiModule,
  ],
  controllers: [ThreadsController],
  providers: [ThreadsService],
})
export class ThreadsModule {}
