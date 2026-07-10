import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AiReceptionistService {
  constructor(private readonly prisma: PrismaService) {}

  async processMessage(channel: string, direction: string, content: string, clientId?: string) {
    if (!channel) throw new BadRequestException('channel is required');
    if (!direction) throw new BadRequestException('direction is required');
    if (!content || !content.trim()) throw new BadRequestException('content is required');

    const validChannels = ['WHATSAPP', 'VOICE', 'SMS', 'EMAIL', 'WEBCHAT'];
    if (!validChannels.includes(channel.toUpperCase())) {
      throw new BadRequestException(`Invalid channel. Must be one of: ${validChannels.join(', ')}`);
    }

    const validDirections = ['INBOUND', 'OUTBOUND'];
    if (!validDirections.includes(direction.toUpperCase())) {
      throw new BadRequestException(`Invalid direction. Must be one of: ${validDirections.join(', ')}`);
    }

    if (clientId) {
      const client = await this.prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
      if (!client) throw new NotFoundException('Client not found');
    }

    const intent = this.classifyIntent(content);
    const sentiment = this.analyzeSentiment(content);

    const log = await this.prisma.aIReceptionistLog.create({
      data: {
        channel: channel.toUpperCase(),
        direction: direction.toUpperCase(),
        content: content.trim(),
        clientId: clientId ?? null,
        intent,
        sentiment,
        createdAt: new Date(),
      },
    });

    const response = this.generateResponse(intent, content);

    return {
      logId: log.id,
      channel: channel.toUpperCase(),
      direction: direction.toUpperCase(),
      intent,
      sentiment,
      response,
      clientId: clientId ?? null,
    };
  }

  async handleWhatsApp(message: any) {
    const { from, body, messageId, timestamp } = message;
    if (!from) throw new BadRequestException('from (phone number) is required');
    if (!body) throw new BadRequestException('body is required');

    const client = await this.prisma.client.findFirst({
      where: { phone: from },
      select: { id: true, fullName: true, phone: true },
    });

    const log = await this.prisma.aIReceptionistLog.create({
      data: {
        channel: 'WHATSAPP',
        direction: 'INBOUND',
        content: body,
        clientId: client?.id ?? null,
        intent: this.classifyIntent(body),
        sentiment: this.analyzeSentiment(body),
        createdAt: new Date(),
      },
    });

    const intent = this.classifyIntent(body);
    const response = this.generateResponse(intent, body);

    return {
      logId: log.id,
      channel: 'WHATSAPP',
      client: client ?? null,
      intent,
      response,
      messageId: log.id,
    };
  }

  async handleCall(callData: any) {
    const { callerNumber, duration, recordingUrl, branchId } = callData;
    if (!callerNumber) throw new BadRequestException('callerNumber is required');

    const client = await this.prisma.client.findFirst({
      where: { phone: callerNumber },
      select: { id: true, fullName: true, phone: true },
    });

    const log = await this.prisma.aIReceptionistLog.create({
      data: {
        channel: 'VOICE',
        direction: 'INBOUND',
        content: `Call from ${callerNumber} - Duration: ${duration || 'unknown'}s`,
        clientId: client?.id ?? null,
        intent: 'CALL',
        sentiment: 'NEUTRAL',
        createdAt: new Date(),
      },
    });

    return {
      logId: log.id,
      channel: 'VOICE',
      client: client ?? null,
      duration: duration ?? null,
      recordingUrl: recordingUrl ?? null,
      status: 'RECORDED',
    };
  }

  async handleVoice(voiceData: any) {
    const { transcript, confidence, language, staffId } = voiceData;
    if (!transcript) throw new BadRequestException('transcript is required');

    const intent = this.classifyIntent(transcript);
    const sentiment = this.analyzeSentiment(transcript);

    const log = await this.prisma.aIReceptionistLog.create({
      data: {
        channel: 'VOICE',
        direction: 'INBOUND',
        content: transcript,
        intent,
        sentiment,
        createdAt: new Date(),
      },
    });

    const response = this.generateResponse(intent, transcript);

    return {
      logId: log.id,
      channel: 'VOICE',
      transcript,
      intent,
      sentiment,
      response,
    };
  }

  async getLogs(channel?: string, limit: number = 50) {
    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);

    const where: any = {};
    if (channel) where.channel = channel.toUpperCase();

    return this.prisma.aIReceptionistLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async getStats(channel?: string, dateRange?: { from: string; to: string }) {
    const where: any = {};
    if (channel) where.channel = channel.toUpperCase();

    if (dateRange) {
      const from = new Date(dateRange.from);
      const to = new Date(dateRange.to);
      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
        where.createdAt = { gte: from, lte: to };
      }
    }

    const [totalMessages, channelBreakdown, intentBreakdown, sentimentBreakdown] =
      await this.prisma.$transaction([
        this.prisma.aIReceptionistLog.count({ where }),
        this.prisma.aIReceptionistLog.groupBy({
          by: ['channel'],
          where,
          _count: { id: true },
          orderBy: { channel: 'asc' },
        }),
        this.prisma.aIReceptionistLog.groupBy({
          by: ['intent'],
          where,
          _count: { id: true },
          orderBy: { intent: 'asc' },
        }),
        this.prisma.aIReceptionistLog.groupBy({
          by: ['sentiment'],
          where,
          _count: { id: true },
          orderBy: { sentiment: 'asc' },
        }),
      ]);

    return {
      totalMessages,
      channelBreakdown: channelBreakdown.map((c: any) => ({
        channel: c.channel,
        count: c._count.id,
      })),
      intentBreakdown: intentBreakdown.map((i: any) => ({
        intent: i.intent,
        count: i._count.id,
      })),
      sentimentBreakdown: sentimentBreakdown.map((s: any) => ({
        sentiment: s.sentiment,
        count: s._count.id,
      })),
    };
  }

  private classifyIntent(text: string): string {
    const lower = text.toLowerCase();

    const intentMap: Array<{ patterns: RegExp[]; intent: string }> = [
      { patterns: [/book/i, /schedule/i, /appointment/i, /reserve/i], intent: 'BOOKING' },
      { patterns: [/cancel/i, /delete/i, /remove/i], intent: 'CANCELLATION' },
      { patterns: [/reschedule/i, /change.*time/i, /move/i], intent: 'RESCHEDULE' },
      { patterns: [/price/i, /cost/i, /how much/i, /rate/i], intent: 'PRICING' },
      { patterns: [/hours/i, /open/i, /close/i, /timing/i], intent: 'HOURS' },
      { patterns: [/location/i, /address/i, /where/i, /direction/i], intent: 'LOCATION' },
      { patterns: [/service/i, /offer/i, /available/i, /menu/i], intent: 'SERVICES' },
      { patterns: [/help/i, /support/i, /assist/i], intent: 'SUPPORT' },
      { patterns: [/hi/i, /hello/i, /hey/i, /good\s+(morning|afternoon|evening)/i], intent: 'GREETING' },
      { patterns: [/thank/i, /thanks/i, /appreciate/i], intent: 'THANKS' },
      { patterns: [/complaint/i, /problem/i, /issue/i, /bad/i, /terrible/i], intent: 'COMPLAINT' },
    ];

    for (const { patterns, intent } of intentMap) {
      if (patterns.some((p) => p.test(lower))) return intent;
    }

    return 'GENERAL';
  }

  private analyzeSentiment(text: string): string {
    const lower = text.toLowerCase();

    const positiveWords = ['great', 'awesome', 'love', 'excellent', 'amazing', 'perfect', 'wonderful', 'fantastic', 'good', 'nice', 'happy', 'pleased', 'satisfied', 'best', 'thank'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'angry', 'upset', 'disappointed', 'poor', 'rude', 'slow', 'dirty', 'never', 'complaint'];

    const positiveCount = positiveWords.filter((w) => lower.includes(w)).length;
    const negativeCount = negativeWords.filter((w) => lower.includes(w)).length;

    if (positiveCount > negativeCount) return 'POSITIVE';
    if (negativeCount > positiveCount) return 'NEGATIVE';
    return 'NEUTRAL';
  }

  private generateResponse(intent: string, _content: string): string {
    const responses: Record<string, string> = {
      BOOKING: 'I\'d be happy to help you book an appointment. What service are you looking for and when would you like to come in?',
      CANCELLATION: 'I understand you\'d like to cancel. Can you please provide your booking reference or the details of the appointment?',
      RESCHEDULE: 'Sure, I can help you reschedule. What\'s your preferred new date and time?',
      PRICING: 'Our pricing varies by service. Would you like me to share our menu with current prices?',
      HOURS: 'We\'re open Monday-Saturday 9AM-8PM and Sunday 10AM-6PM. Would you like to book an appointment?',
      LOCATION: 'We\'re located at our main branch. Would you like directions or to book an appointment?',
      SERVICES: 'We offer a wide range of services including haircuts, styling, coloring, facials, manicures, pedicures, and more. What interests you?',
      SUPPORT: 'I\'m here to help! What can I assist you with today?',
      GREETING: 'Hello! Welcome to Ambition Unisex Salon. How can I help you today?',
      THANKS: 'You\'re welcome! Is there anything else I can help you with?',
      COMPLAINT: 'I\'m sorry to hear about your experience. I\'d like to help make this right. Can you share more details?',
      GENERAL: 'Thank you for reaching out. How can I assist you today?',
    };

    return responses[intent] || responses.GENERAL;
  }
}
