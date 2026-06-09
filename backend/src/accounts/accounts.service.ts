import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PlaidService } from '../providers/plaid/plaid.service';
import { AppExceptions, ERROR_CODES } from '../common/errors/app-exception';
import { ConnectionsService } from '../connections/connections.service';

@Injectable()
export class AccountsService {
  constructor(
    private prisma: PrismaService,
    private plaid: PlaidService,
    private connections: ConnectionsService,
  ) {}

  async getAccounts(userId: string) {
    return this.prisma.account.findMany({
      where: { userId },
      include: { connection: { select: { id: true, institutionName: true, status: true } } },
      orderBy: { balance: 'desc' },
    });
  }

  async getAccountById(userId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { connection: { select: { id: true, institutionName: true, status: true } } },
    });
    if (!account) throw AppExceptions.notFound(ERROR_CODES.RESOURCE_NOT_FOUND);
    if (account.userId !== userId) throw AppExceptions.forbidden();
    return account;
  }

  async setPrimaryAccount(userId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw AppExceptions.notFound(ERROR_CODES.RESOURCE_NOT_FOUND);
    if (account.userId !== userId) throw AppExceptions.forbidden();

    await this.prisma.$transaction(async (tx) => {
      await tx.account.updateMany({ where: { userId }, data: { isPrimary: false } });
      await tx.account.update({ where: { id: accountId }, data: { isPrimary: true } });
    });

    return this.prisma.account.findUnique({ where: { id: accountId } });
  }

  async syncBalances(userId: string) {
    const conns = await this.prisma.connection.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    const errors: { institution: string; reason: string }[] = [];

    for (const conn of conns) {
      try {
        const plaidAccounts = await this.plaid.getAccounts(conn.plaidAccessToken);
        for (const pa of plaidAccounts) {
          await this.prisma.account.updateMany({
            where: { externalId: pa.account_id, userId },
            data: { balance: pa.balances.current ?? 0 },
          });
        }
        await this.connections.syncTransactions(userId, conn.id);
      } catch (err: any) {
        const plaidCode: string | undefined = err?.response?.data?.error_code;
        const needsReauth = plaidCode === 'ITEM_LOGIN_REQUIRED' || plaidCode === 'INVALID_ACCESS_TOKEN';

        await this.prisma.connection.update({
          where: { id: conn.id },
          data: { status: needsReauth ? 'EXPIRED' : 'ERROR' },
        });

        errors.push({
          institution: conn.institutionName ?? conn.id,
          reason: needsReauth ? 'Re-authentication required' : (plaidCode ?? err?.message ?? 'Unknown error'),
        });
      }
    }

    if (errors.length > 0 && errors.length === conns.length) {
      throw AppExceptions.externalError(ERROR_CODES.PLAID_SYNC_FAILED, { errors });
    }

    return { synced: conns.length - errors.length, errors };
  }

  async getNetWorthHistory(userId: string, months = 12) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { id: true, type: true, balance: true },
    });
    if (accounts.length === 0) return [];

    const accountIds = accounts.map((a) => a.id);
    const LIABILITY_TYPES = ['credit', 'loan'];

    const currentNetWorth = accounts.reduce((sum, a) => {
      return sum + (LIABILITY_TYPES.includes(a.type) ? -a.balance : a.balance);
    }, 0);

    const windowStart = new Date();
    windowStart.setMonth(windowStart.getMonth() - months);
    windowStart.setDate(1);

    const txns = await this.prisma.transaction.findMany({
      where: { userId, accountId: { in: accountIds }, pending: false, date: { gte: windowStart } },
      select: { accountId: true, amount: true, date: true },
      orderBy: { date: 'asc' },
    });

    const now = new Date();
    const result: { year: number; month: number; netWorth: number }[] = [];

    for (let i = 0; i < months; i++) {
      const snapDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const snapEnd = new Date(snapDate.getFullYear(), snapDate.getMonth() + 1, 0, 23, 59, 59);

      // Transactions after snapEnd haven't happened yet at that point — reverse them out
      const txnsAfter = txns.filter((t) => new Date(t.date) > snapEnd);
      const netAdjustment = txnsAfter.reduce((sum, t) => {
        const acct = accounts.find((a) => a.id === t.accountId);
        if (!acct) return sum;
        // Plaid: positive = expense (balance went down), negative = income (balance went up)
        // LIABILITY accounts invert their contribution to net worth
        const factor = LIABILITY_TYPES.includes(acct.type) ? 1 : -1;
        return sum + t.amount * factor;
      }, 0);

      result.unshift({
        year: snapDate.getFullYear(),
        month: snapDate.getMonth() + 1,
        netWorth: Math.round((currentNetWorth + netAdjustment) * 100) / 100,
      });
    }

    return result;
  }
}
