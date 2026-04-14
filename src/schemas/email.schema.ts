import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EmailDocument = HydratedDocument<Email>;

@Schema({ timestamps: true })
export class Email {
  @Prop({ type: Types.ObjectId, ref: 'EmailThread', required: true, index: true })
  threadId: Types.ObjectId;

  @Prop({ required: true, enum: ['user', 'assistant'] })
  role: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  subject?: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const EmailSchema = SchemaFactory.createForClass(Email);
