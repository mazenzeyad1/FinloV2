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
    return this.getPrimaryAccountTx(this.prisma, userId);
  }

  private async getPrimaryAccountTx(tx: any, userId: string) {
    const primary = await tx.account.findFirst({ where: { userId, isPrimary: true } });
    if (primary) return primary;
    const fallback = await tx.account.findFirst({ where: { userId } });
    if (!fallback) throw AppExceptions.badRequest(ERROR_CODES.OPERATION_NOT_ALLOWED);
    return fallback;
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

    return this.prisma.$transaction(async (tx) => {
      const senderAccount = await this.getPrimaryAccountTx(tx, senderId);
      const recipientAccount = await this.getPrimaryAccountTx(tx, recipient.id);

      if (senderAccount.balance < dto.amount) throw AppExceptions.badRequest(ERROR_CODES.OPERATION_NOT_ALLOWED);

      const transfer = await tx.transfer.create({
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

      const senderName = `${transfer.recipient.firstName ?? ''} ${transfer.recipient.lastName ?? ''}`.trim();
      const recipientName = `${transfer.sender.firstName ?? ''} ${transfer.sender.lastName ?? ''}`.trim();

      await tx.transaction.create({
        data: {
          userId: senderId,
          accountId: senderAccount.id,
          amount: dto.amount,
          currency: 'CAD',
          date: new Date(),
          description: `Transfer to ${senderName || transfer.recipient.email}`,
          merchantName: `Paid ${senderName || transfer.recipient.email}`,
        },
      });

      await tx.transaction.create({
        data: {
          userId: recipient.id,
          accountId: recipientAccount.id,
          amount: -dto.amount,
          currency: 'CAD',
          date: new Date(),
          description: `Transfer from ${recipientName || transfer.sender.email}`,
          merchantName: `Received from ${recipientName || transfer.sender.email}`,
        },
      });

      await tx.account.update({
        where: { id: senderAccount.id },
        data: { balance: { decrement: dto.amount } },
      });

      await tx.account.update({
        where: { id: recipientAccount.id },
        data: { balance: { increment: dto.amount } },
      });

      return transfer;
    });
  }

  async declineRequest(userId: string, transferId: string) {
    const transfer = await this.prisma.transfer.findUnique({ where: { id: transferId } });
    if (!transfer) throw AppExceptions.notFound(ERROR_CODES.RESOURCE_NOT_FOUND);
    if (transfer.senderId !== userId && transfer.recipientId !== userId) throw AppExceptions.forbidden();
    if (transfer.status !== 'PENDING') throw AppExceptions.badRequest(ERROR_CODES.INVALID_STATE);
    return this.prisma.transfer.update({ where: { id: transferId }, data: { status: 'DECLINED' } });
  }
}
