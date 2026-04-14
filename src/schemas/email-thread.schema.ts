import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmailThreadDocument = HydratedDocument<EmailThread>;

@Schema({ timestamps: true })
export class EmailThread {
  @Prop({ required: true })
  title: string;

  @Prop()
  recipientName?: string;

  @Prop({ default: 'professional' })
  tone: string;

  @Prop({ enum: ['active', 'archived'], default: 'active' })
  status: string;
}

export const EmailThreadSchema = SchemaFactory.createForClass(EmailThread);
