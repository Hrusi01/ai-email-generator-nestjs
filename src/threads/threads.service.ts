import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailThread, EmailThreadDocument } from '../schemas/email-thread.schema';
import { Email, EmailDocument } from '../schemas/email.schema';
import { AiService } from '../ai/ai.service';
import { NotFoundException } from '../common/exceptions/api.exception';

@Injectable()
export class ThreadsService {
  constructor(
    @InjectModel(EmailThread.name) private readonly emailThreadModel: Model<EmailThreadDocument>,
    @InjectModel(Email.name) private readonly emailModel: Model<EmailDocument>,
    private readonly aiService: AiService,
  ) {}


  async createThreadWithEmail(prompt: string, tone: string, recipientName?: string) {
 
    const generated = await this.aiService.generateNewEmail(prompt, tone, recipientName);

    const title = prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt;


    const thread = await this.emailThreadModel.create({
      title,
      tone,
      recipientName,
    });

    
    await this.emailModel.create({
      threadId: thread._id,
      role: 'user',
      content: prompt,
    });

    const assistantEmail = await this.emailModel.create({
      threadId: thread._id,
      role: 'assistant',
      subject: generated.subject,
      content: generated.content,
    });

    return {
      threadId: thread._id,
      email: assistantEmail,
    };
  }

 
  async getThreads() {
    return this.emailThreadModel.find().sort({ updatedAt: -1 }).lean();
  }

 
  async getThreadDetails(threadId: string) {
    const thread = await this.emailThreadModel.findById(threadId).lean();
    if (!thread) {
      throw new NotFoundException('Thread');
    }

    const messages = await this.emailModel.find({ threadId }).sort({ createdAt: 1 }).lean();

    return { thread, messages };
  }


  async replyToThread(threadId: string, instruction: string, overrideTone?: string) {
    const thread = await this.emailThreadModel.findById(threadId);
    if (!thread) {
      throw new NotFoundException('Thread');
    }

    const toneToUse = overrideTone || thread.tone;

    const history = await this.emailModel.find({ threadId }).sort({ createdAt: 1 }).lean();

    const historyFormatted = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    
    const generated = await this.aiService.generateReply(
      historyFormatted,
      instruction,
      toneToUse,
      thread.recipientName,
    );

    
    await this.emailModel.create({
      threadId: thread._id,
      role: 'user',
      content: instruction,
    });

    
    const assistantEmail = await this.emailModel.create({
      threadId: thread._id,
      role: 'assistant',
      subject: generated.subject,
      content: generated.content,
    });

    if (overrideTone) {
      thread.tone = overrideTone;
    }
    await thread.save();

    return assistantEmail;
  }
}
