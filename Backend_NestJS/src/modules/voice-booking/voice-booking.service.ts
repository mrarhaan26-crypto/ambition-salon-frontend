import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class VoiceBookingService {
  constructor(private readonly prisma: PrismaService) {}

  async processCommand(staffId: string, rawText: string) {
    if (!staffId) throw new BadRequestException('staffId is required');
    if (!rawText || !rawText.trim()) throw new BadRequestException('rawText is required');

    await this.ensureStaffExists(staffId);

    const parsed = this.parseIntent(rawText.trim());

    let booking = null;
    if (parsed.intent === 'BOOK' && parsed.slots.service) {
      booking = await this.createBookingFromVoice(staffId, parsed.slots);
    }

    await this.prisma.voiceCommand.create({
      data: {
        staffId,
        rawText: rawText.trim(),
        parsedIntent: parsed.intent,
        parsedSlots: JSON.stringify(parsed.slots),
        bookingId: booking?.id ?? null,
        confidence: parsed.confidence,
      },
    });

    return {
      intent: parsed.intent,
      slots: parsed.slots,
      confidence: parsed.confidence,
      booking,
      message: this.getIntentMessage(parsed.intent, booking),
    };
  }

  parseIntent(text: string) {
    const lower = text.toLowerCase().trim();

    const bookingPatterns = [
      /book\s+(?:a\s+)?(.+)/i,
      /schedule\s+(?:a\s+)?(.+)/i,
      /set\s+(?:up\s+)?(?:a\s+)?(.+)/i,
      /reserve\s+(?:a\s+)?(.+)/i,
      /appointment\s+(?:for\s+)?(.+)/i,
      /i\s+(?:want|need|would\s+like)\s+(?:to\s+)?(?:book|schedule)\s+(?:a\s+)?(.+)/i,
    ];

    const cancelPatterns = [
      /cancel\s+(?:my\s+)?(?:the\s+)?(?:booking|appointment|reservation)/i,
      /delete\s+(?:my\s+)?(?:the\s+)?(?:booking|appointment)/i,
    ];

    const reschedulePatterns = [
      /reschedule\s+(?:my\s+)?(?:the\s+)?(?:booking|appointment)/i,
      /change\s+(?:my\s+)?(?:the\s+)?(?:booking|appointment)\s+(?:time|date)/i,
      /move\s+(?:my\s+)?(?:the\s+)?(?:booking|appointment)/i,
    ];

    const checkPatterns = [
      /(?:what|when|where)\s+(?:is|are|do\s+I\s+have)\s+(?:my\s+)?(?:the\s+)?(?:booking|appointment)/i,
      /check\s+(?:my\s+)?(?:the\s+)?(?:booking|appointment|schedule)/i,
      /show\s+(?:my\s+)?(?:the\s+)?(?:booking|appointment)/i,
      /my\s+(?:next|upcoming)\s+(?:booking|appointment)/i,
    ];

    for (const pattern of cancelPatterns) {
      if (pattern.test(lower)) {
        return { intent: 'CANCEL', slots: {}, confidence: 0.85 };
      }
    }

    for (const pattern of reschedulePatterns) {
      if (pattern.test(lower)) {
        return { intent: 'RESCHEDULE', slots: {}, confidence: 0.80 };
      }
    }

    for (const pattern of checkPatterns) {
      if (pattern.test(lower)) {
        return { intent: 'CHECK', slots: {}, confidence: 0.80 };
      }
    }

    for (const pattern of bookingPatterns) {
      const match = lower.match(pattern);
      if (match) {
        const slots = this.extractSlots(match[1] || lower);
        return { intent: 'BOOK', slots, confidence: 0.75 };
      }
    }

    const serviceKeywords = ['haircut', 'hair cut', 'manicure', 'pedicure', 'facial', 'massage', 'styling', 'color', 'highlight', 'trim', 'beard', 'shave'];
    for (const keyword of serviceKeywords) {
      if (lower.includes(keyword)) {
        const slots = this.extractSlots(lower);
        return { intent: 'BOOK', slots, confidence: 0.65 };
      }
    }

    return { intent: 'UNKNOWN', slots: { raw: lower }, confidence: 0.3 };
  }

  async createBookingFromVoice(staffId: string, parsedSlots: any) {
    const now = new Date();
    const startTime = parsedSlots.date ? new Date(parsedSlots.date) : new Date(now.getTime() + 60 * 60 * 1000);
    if (Number.isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid date/time in voice command');
    }

    const durationMin = Number(parsedSlots.duration) || 30;
    const endTime = new Date(startTime.getTime() + durationMin * 60 * 1000);

    const staff = await this.prisma.user.findUnique({ where: { id: staffId }, select: { id: true } });
    const branchId = parsedSlots.branchId;
    const clientId = parsedSlots.clientId;

    if (!branchId) throw new BadRequestException('branchId is required');
    if (!clientId) throw new BadRequestException('clientId is required');

    if (branchId) {
      const conflict = await this.prisma.booking.findFirst({
        where: {
          staffId,
          branchId,
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });
      if (conflict) throw new BadRequestException('Staff already has a booking in this slot');
    }

    const serviceName = parsedSlots.service || 'Voice Booking';
    const price = Number(parsedSlots.price) || 0;

    return this.prisma.booking.create({
      data: {
        branchId,
        clientId,
        staffId,
        title: `Voice: ${serviceName}`,
        notes: `Booked via voice command`,
        status: 'PENDING',
        startTime,
        endTime,
        totalAmount: price,
        services: {
          create: [{ name: serviceName, durationMin, price }],
        },
      },
      include: { client: true, branch: true, staff: true, services: true },
    });
  }

  async getVoiceLogs(staffId: string, limit: number = 50) {
    if (!staffId) throw new BadRequestException('staffId is required');

    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);

    return this.prisma.voiceCommand.findMany({
      where: { staffId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  private extractSlots(text: string): any {
    const slots: any = {};

    const timePatterns = [
      { pattern: /(\d{1,2}):(\d{2})\s*(am|pm)?/i, handler: (m: RegExpMatchArray) => {
        let hour = parseInt(m[1], 10);
        const minute = parseInt(m[2], 10);
        if (m[3]?.toLowerCase() === 'pm' && hour < 12) hour += 12;
        if (m[3]?.toLowerCase() === 'am' && hour === 12) hour = 0;
        slots.time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      }},
      { pattern: /at\s+(\d{1,2})\s*(am|pm)/i, handler: (m: RegExpMatchArray) => {
        let hour = parseInt(m[1], 10);
        if (m[2]?.toLowerCase() === 'pm' && hour < 12) hour += 12;
        if (m[2]?.toLowerCase() === 'am' && hour === 12) hour = 0;
        slots.time = `${String(hour).padStart(2, '0')}:00`;
      }},
    ];

    for (const { pattern, handler } of timePatterns) {
      const match = text.match(pattern);
      if (match) { handler(match); break; }
    }

    const datePatterns = [
      { pattern: /tomorrow/i, handler: () => {
        const d = new Date(); d.setDate(d.getDate() + 1);
        slots.date = d.toISOString().slice(0, 10);
      }},
      { pattern: /today/i, handler: () => {
        slots.date = new Date().toISOString().slice(0, 10);
      }},
      { pattern: /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, handler: (m: RegExpMatchArray) => {
        const days: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
        const target = days[m[1].toLowerCase()];
        const now = new Date();
        const diff = (target - now.getDay() + 7) % 7 || 7;
        const d = new Date(now); d.setDate(now.getDate() + diff);
        slots.date = d.toISOString().slice(0, 10);
      }},
    ];

    for (const { pattern, handler } of datePatterns) {
      const match = text.match(pattern);
      if (match) { handler(match); break; }
    }

    const serviceKeywords: Record<string, string> = {
      'haircut': 'Haircut', 'hair cut': 'Haircut', 'manicure': 'Manicure',
      'pedicure': 'Pedicure', 'facial': 'Facial', 'massage': 'Massage',
      'styling': 'Hair Styling', 'color': 'Hair Coloring', 'highlight': 'Highlights',
      'trim': 'Trim', 'beard': 'Beard Trim', 'shave': 'Shave',
    };

    for (const [keyword, service] of Object.entries(serviceKeywords)) {
      if (text.toLowerCase().includes(keyword)) {
        slots.service = service;
        break;
      }
    }

    return slots;
  }

  private getIntentMessage(intent: string, booking: any): string {
    switch (intent) {
      case 'BOOK':
        return booking
          ? `Booking confirmed for ${booking.services?.[0]?.name || 'service'} on ${new Date(booking.startTime).toLocaleString()}`
          : 'I can help you book an appointment. What service would you like?';
      case 'CANCEL':
        return 'Please provide the booking ID to cancel your appointment.';
      case 'RESCHEDULE':
        return 'Please provide the booking ID and new preferred time.';
      case 'CHECK':
        return 'Let me look up your upcoming appointments.';
      default:
        return 'I didn\'t quite understand. You can say things like "book a haircut" or "cancel my appointment".';
    }
  }

  private async ensureStaffExists(staffId: string) {
    const staff = await this.prisma.user.findUnique({ where: { id: staffId }, select: { id: true } });
    if (!staff) throw new NotFoundException('Staff not found');
  }
}
