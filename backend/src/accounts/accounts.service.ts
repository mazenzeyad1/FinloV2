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
}
