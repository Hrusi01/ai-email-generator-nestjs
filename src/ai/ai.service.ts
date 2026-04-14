import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeneratedEmail {
  subject: string;
  content: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly defaultPersona: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY', '');
    this.model = this.configService.get<string>('GEMINI_MODEL', 'gemini-2.0-flash');
    this.defaultPersona = this.configService.get<string>('DEFAULT_AI_PERSONA', 'helpful AI assistant');

    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY environment variable is missing.');
    }
  }

  async generateNewEmail(prompt: string, tone: string, recipientName?: string): Promise<GeneratedEmail> {
    this.ensureApiKey();

    const recipientText = recipientName ? `The recipient is ${recipientName}.` : '';

    const systemInstruction = `You are a ${this.defaultPersona} tasked with writing emails. 
      Your tone should be ${tone}. ${recipientText}
      Output the result exactly as a valid JSON object with {"subject": "<email subject>", "content": "<email body>"}. 
      Do no use markdown formatting (\`\`\`json) outside the brackets, just return the raw JSON object.`;

    const fullPrompt = `${systemInstruction}\n\nEmail Prompt: ${prompt}`;

    try {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: this.model });
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      return this.parseGeminiResponse(text);
    } catch (error) {
      this.handleGeminiError(error, 'email generation');
    }
  }

 
  async generateReply(
    history: { role: string; content: string }[],
    instruction: string,
    tone: string,
    recipientName?: string,
  ): Promise<GeneratedEmail> {
    this.ensureApiKey();

    const recipientText = recipientName ? `The recipient is ${recipientName}.` : '';
    const historyText = history.map((item) => `${item.role.toUpperCase()}: ${item.content}`).join('\n\n');

    const systemInstruction = `You are a ${this.defaultPersona} replying to an email thread. 
      Your tone should be ${tone}. ${recipientText}
      The following is the conversation history so far. Review it carefully before writing the reply.
      
      -- HISTORY START --
      ${historyText}
      -- HISTORY END --
      
      Your new instruction for the reply is: ${instruction}
      
      Output the result exactly as a valid JSON object with {"subject": "<email subject>", "content": "<email body>"}. 
      Do no use markdown formatting (\`\`\`json) outside the brackets, just return the raw JSON object.`;

    try {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: this.model });
      const result = await model.generateContent(systemInstruction);
      const response = await result.response;
      const text = response.text();

      return this.parseGeminiResponse(text);
    } catch (error) {
      this.handleGeminiError(error, 'email reply generation');
    }
  }

  /**
   * Parse the raw Gemini text response into a structured GeneratedEmail object.
   */
  private parseGeminiResponse(text: string): GeneratedEmail {
    const cleaned = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    return JSON.parse(cleaned) as GeneratedEmail;
  }

  /**
   * Ensure that the API key is present before making a request.
   */
  private ensureApiKey(): void {
    if (!this.apiKey) {
      throw new Error('Gemini API functionality requires GEMINI_API_KEY');
    }
  }

  /**
   * Translate known Gemini API errors into clear, user-friendly messages.
   */
  private handleGeminiError(error: unknown, context: string): never {
    const errMsg = error instanceof Error ? error.message : String(error);

    if (errMsg.includes('429') || errMsg.includes('Too Many Requests') || errMsg.includes('quota')) {
      this.logger.error(`${context}:`, error);
      throw new Error(
        'Gemini API rate limit exceeded. Your free-tier quota may be exhausted. ' +
          'Please wait for it to reset or upgrade your plan at https://ai.google.dev/gemini-api/docs/rate-limits',
      );
    }

    if (errMsg.includes('403') || errMsg.includes('PERMISSION_DENIED')) {
      this.logger.error(`${context}:`, error);
      throw new Error('Gemini API key is invalid or does not have permission. Please check your GEMINI_API_KEY.');
    }

    if (errMsg.includes('404') || errMsg.includes('not found')) {
      this.logger.error(`${context}:`, error);
      throw new Error(
        `Gemini model "${this.model}" is not available. ` +
          'Try setting GEMINI_MODEL env var to a valid model like "gemini-2.0-flash" or "gemini-2.0-flash-lite".',
      );
    }

    this.logger.error(`${context}:`, error);
    throw new Error(`AI ${context} failed. See server logs for details.`);
  }
}
