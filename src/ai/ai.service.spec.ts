import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { GoogleGenerativeAI } from '@google/generative-ai';


jest.mock('@google/generative-ai');

describe('AiService', () => {
  let service: AiService;
  let mockGenerateContent: jest.Mock;

  beforeEach(async () => {
    mockGenerateContent = jest.fn();

    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => {
      return {
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        }),
      };
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                GEMINI_API_KEY: 'test_key',
                GEMINI_MODEL: 'gemini-2.0-flash',
                DEFAULT_AI_PERSONA: 'testing persona',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a new email properly parsing JSON', async () => {
    const mockJsonOutput = JSON.stringify({
      subject: 'Test Subject',
      content: 'This is a test email body.',
    });

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => mockJsonOutput,
      },
    });

    const result = await service.generateNewEmail('Hello world', 'friendly');

    expect(result).toHaveProperty('subject', 'Test Subject');
    expect(result).toHaveProperty('content', 'This is a test email body.');
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('should generate a reply successfully', async () => {
    const mockJsonOutput = JSON.stringify({
      subject: 'Re: Test',
      content: 'Here is my reply.',
    });

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => `\`\`\`json\n${mockJsonOutput}\n\`\`\``, // simulating markdown wrap
      },
    });

    const history = [{ role: 'user', content: 'What is your name?' }];
    const result = await service.generateReply(history, 'Answer the question', 'professional');

    expect(result).toHaveProperty('subject', 'Re: Test');
    expect(result).toHaveProperty('content', 'Here is my reply.');
  });
});
