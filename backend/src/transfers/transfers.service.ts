import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppExceptions, ERROR_CODES } from '../common/errors/app-exception';

interface SendMoneyDto {
  recipientEmail: string;
  amount: number;
  memo?: string;
}

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  private async getPrimaryAccount(userId: string) {
    const primary = await this.prisma.account.findFirst({ where: { userId, isPrimary: true } });
    if (primary) return primary;
    // fallback: first account if none is marked primary
    const fallback = await this.prisma.account.findFirst({ where: { userId } });
    if (!fallback) throw AppExceptions.badRequest(ERROR_CODES.OPERATION_NOT_ALLOWED);
    return fallback;
  }

  private async createTransferTransactions(transfer: any) {
    const senderAccount = await this.getPrimaryAccount(transfer.senderId);
    const recipientAccount = await this.getPrimaryAccount(transfer.recipientId);

    await this.prisma.$transaction([
      this.prisma.transaction.create({
        data: {
          userId: transfer.senderId,
          accountId: senderAccount.id,
          amount: transfer.amount,
          currency: transfer.currency || 'CAD',
          date: new Date(),
          description: `Transfer to ${transfer.recipient?.firstName ?? ''} ${transfer.recipient?.lastName ?? ''}`.trim(),
          merchantName: `Paid ${transfer.recipient?.firstName ?? transfer.recipient?.email ?? 'recipient'}`,
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId: transfer.recipientId,
          accountId: recipientAccount.id,
          amount: -transfer.amount,
          currency: transfer.currency || 'CAD',
          date: new Date(),
          description: `Transfer from ${transfer.sender?.firstName ?? ''} ${transfer.sender?.lastName ?? ''}`.trim(),
          merchantName: `Received from ${transfer.sender?.firstName ?? transfer.sender?.email ?? 'sender'}`,
        },
      }),
      this.prisma.account.update({
        where: { id: senderAccount.id },
        data: { balance: senderAccount.balance - transfer.amount },
      }),
      this.prisma.account.update({
        where: { id: recipientAccount.id },
        data: { balance: recipientAccount.balance + transfer.amount },
      }),
    ]);
  }

  async getTransfers(userId: string) {
    return this.prisma.transfer.findMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, email: true } },
        recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async sendMoney(senderId: string, dto: SendMoneyDto) {
    const recipient = await this.prisma.user.findUnique({ where: { email: dto.recipientEmail } });
    if (!recipient) throw AppExceptions.notFound(ERROR_CODES.RESOURCE_NOT_FOUND);
    if (recipient.id === senderId) throw AppExceptions.badRequest(ERROR_CODES.INVALID_STATE);

    const senderAccount = await this.getPrimaryAccount(senderId);
    if (senderAccount.balance < dto.amount) throw AppExceptions.badRequest(ERROR_CODES.OPERATION_NOT_ALLOWED);

    const transfer = await this.prisma.transfer.create({
      data: {
        senderId,
        recipientId: recipient.id,
        amount: dto.amount,
        memo: dto.memo,
        status: 'COMPLETED',
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, email: true } },
        recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.createTransferTransactions(transfer);
    return transfer;
  }

  async declineRequest(userId: string, transferId: string) {
    const transfer = await this.prisma.transfer.findUnique({ where: { id: transferId } });
    if (!transfer) throw AppExceptions.notFound(ERROR_CODES.RESOURCE_NOT_FOUND);
    if (transfer.senderId !== userId && transfer.recipientId !== userId) throw AppExceptions.forbidden();
    if (transfer.status !== 'PENDING') throw AppExceptions.badRequest(ERROR_CODES.INVALID_STATE);
    return this.prisma.transfer.update({ where: { id: transferId }, data: { status: 'DECLINED' } });
  }
}
