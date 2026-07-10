import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { LogQueryDto } from './dto/query-logs.dto';

@Injectable()
export class WhatsAppService {
  constructor(private readonly prisma: PrismaService) {}

  async sendTemplate(
    branchId: string,
    toPhone: string,
    templateName: string,
    variables: string[] = [],
  ) {
    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: { name: templateName, isActive: true },
    });

    if (!template) throw new NotFoundException(`Template "${templateName}" not found`);

    let content = template.body;
    variables.forEach((v, i) => {
      content = content.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'), v);
    });

    const log = await this.prisma.whatsAppLog.create({
      data: {
        branchId,
        type: 'TEMPLATE',
        toNumber: toPhone,
        templateName,
        status: 'SENT',
        metadata: JSON.stringify({ variables }),
      },
    });

    await this.prisma.whatsAppMessage.create({
      data: {
        branchId,
        toNumber: toPhone,
        fromNumber: '',
        direction: 'OUTBOUND',
        messageType: 'TEMPLATE',
        content,
        status: 'SENT',
        templateId: template.id,
      },
    });

    return { success: true, logId: log.id, template: templateName };
  }

  async sendText(branchId: string, toPhone: string, message: string) {
    const log = await this.prisma.whatsAppLog.create({
      data: {
        branchId,
        type: 'TEXT',
        toNumber: toPhone,
        status: 'SENT',
      },
    });

    await this.prisma.whatsAppMessage.create({
      data: {
        branchId,
        toNumber: toPhone,
        fromNumber: '',
        direction: 'OUTBOUND',
        messageType: 'TEXT',
        content: message,
        status: 'SENT',
      },
    });

    return { success: true, logId: log.id };
  }

  async sendBookingConfirmation(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true, branch: true, services: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const phone = booking.client.phone;
    if (!phone) return { success: false, reason: 'Client has no phone number' };

    const serviceNames = booking.services.map((s) => s.name).join(', ');
    const message = `Hi ${booking.client.fullName}, your booking "${booking.title}" at ${booking.branch.name} is confirmed for ${booking.startTime.toLocaleString()}. Services: ${serviceNames}.`;

    return this.sendText(booking.branchId, phone, message);
  }

  async sendReminder(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true, branch: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const phone = booking.client.phone;
    if (!phone) return { success: false, reason: 'Client has no phone number' };

    const message = `Reminder: You have an appointment "${booking.title}" at ${booking.branch.name} on ${booking.startTime.toLocaleString()}. See you soon!`;

    return this.sendText(booking.branchId, phone, message);
  }

  async sendOTP(clientId: string, otp: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');
    if (!client.phone) return { success: false, reason: 'Client has no phone number' };

    const message = `Your verification OTP is: ${otp}. It is valid for 10 minutes. Do not share it with anyone.`;

    return this.sendText('', client.phone, message);
  }

  async sendInvoice(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true, items: true },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!invoice.client?.phone) {
      return { success: false, reason: 'Client has no phone number' };
    }

    const itemList = invoice.items
      .map((item) => `${item.description}: $${item.totalPrice}`)
      .join('\n');
    const message = `Invoice ${invoice.invoiceNumber}\n${itemList}\nTotal: $${invoice.total}\nStatus: ${invoice.status}`;

    return this.sendText('', invoice.client.phone, message);
  }

  async sendReviewRequest(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true, branch: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const phone = booking.client.phone;
    if (!phone) return { success: false, reason: 'Client has no phone number' };

    const message = `Hi ${booking.client.fullName}, thank you for visiting ${booking.branch.name}! We'd love your feedback. Please rate your experience.`;

    return this.sendText(booking.branchId, phone, message);
  }

  async sendBirthdayWish(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');
    if (!client.phone) return { success: false, reason: 'Client has no phone number' };

    const message = `Happy Birthday, ${client.fullName}! Wishing you a wonderful day. As a special treat, enjoy 10% off your next visit!`;

    return this.sendText('', client.phone, message);
  }

  async sendCancellationNotice(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true, branch: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const phone = booking.client.phone;
    if (!phone) return { success: false, reason: 'Client has no phone number' };

    const message = `Hi ${booking.client.fullName}, your booking "${booking.title}" at ${booking.branch.name} scheduled for ${booking.startTime.toLocaleString()} has been cancelled.`;

    return this.sendText(booking.branchId, phone, message);
  }

  async sendFollowUp(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');
    if (!client.phone) return { success: false, reason: 'Client has no phone number' };

    const message = `Hi ${client.fullName}, it's been a while since your last visit. We'd love to see you again! Book your next appointment today.`;

    return this.sendText('', client.phone, message);
  }

  async getTemplates() {
    return this.prisma.whatsAppTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTemplate(dto: CreateTemplateDto) {
    return this.prisma.whatsAppTemplate.create({
      data: {
        name: dto.name,
        category: dto.category,
        language: dto.language ?? 'en',
        body: dto.body,
        variables: dto.variables ? JSON.stringify(dto.variables) : null,
      },
    });
  }

  async getLogs(branchId: string, query: LogQueryDto) {
    const where: Prisma.WhatsAppLogWhereInput = {};

    if (branchId) where.branchId = branchId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.whatsAppLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.whatsAppLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getStats(branchId: string, dateRange?: { from?: string; to?: string }) {
    const where: Prisma.WhatsAppLogWhereInput = {};
    if (branchId) where.branchId = branchId;

    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = new Date(dateRange.from);
      if (dateRange.to) where.createdAt.lte = new Date(dateRange.to);
    }

    const [total, sent, failed, byType] = await Promise.all([
      this.prisma.whatsAppLog.count({ where }),
      this.prisma.whatsAppLog.count({ where: { ...where, status: 'SENT' } }),
      this.prisma.whatsAppLog.count({ where: { ...where, status: 'FAILED' } }),
      this.prisma.whatsAppLog.groupBy({
        by: ['type'],
        where,
        _count: { type: true },
      }),
    ]);

    return {
      total,
      sent,
      failed,
      deliveryRate: total > 0 ? ((sent / total) * 100).toFixed(1) : '0',
      byType: byType.map((g) => ({ type: g.type, count: g._count.type })),
    };
  }
}
