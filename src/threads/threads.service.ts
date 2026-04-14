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

  /**
   * Create a new thread: generate an AI email, persist everything.
   */
  async createThreadWithEmail(prompt: string, tone: string, recipientName?: string) {
    // Generate email via AI
    const generated = await this.aiService.generateNewEmail(prompt, tone, recipientName);

    const title = prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt;

    // Create thread document
    const thread = await this.emailThreadModel.create({
      title,
      tone,
      recipientName,
    });

    // Save the user's prompt as the first message
    await this.emailModel.create({
      threadId: thread._id,
      role: 'user',
      content: prompt,
    });

    // Save the AI-generated email as the second message
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

  /**
   * List all threads, most recently updated first.
   */
  async getThreads() {
    return this.emailThreadModel.find().sort({ updatedAt: -1 }).lean();
  }

  /**
   * Get a single thread with all its messages.
   */
  async getThreadDetails(threadId: string) {
    const thread = await this.emailThreadModel.findById(threadId).lean();
    if (!thread) {
      throw new NotFoundException('Thread');
    }

    const messages = await this.emailModel.find({ threadId }).sort({ createdAt: 1 }).lean();

    return { thread, messages };
  }

  /**
   * Reply to an existing thread: fetch history, generate AI reply, persist.
   */
  async replyToThread(threadId: string, instruction: string, overrideTone?: string) {
    const thread = await this.emailThreadModel.findById(threadId);
    if (!thread) {
      throw new NotFoundException('Thread');
    }

    const toneToUse = overrideTone || thread.tone;

    // Fetch conversation history for context
    const history = await this.emailModel.find({ threadId }).sort({ createdAt: 1 }).lean();

    const historyFormatted = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Generate AI reply
    const generated = await this.aiService.generateReply(
      historyFormatted,
      instruction,
      toneToUse,
      thread.recipientName,
    );

    // Save the user's instruction
    await this.emailModel.create({
      threadId: thread._id,
      role: 'user',
      content: instruction,
    });

    // Save the AI reply
    const assistantEmail = await this.emailModel.create({
      threadId: thread._id,
      role: 'assistant',
      subject: generated.subject,
      content: generated.content,
    });

    // Update thread metadata
    if (overrideTone) {
      thread.tone = overrideTone;
    }
    await thread.save();

    return assistantEmail;
  }
}
