import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppExceptions, ERROR_CODES } from '../common/errors/app-exception';
import { PaginatedResponseDto } from '../common/pagination/pagination.dto';
import { QueryTransactionsDto, UpdateTransactionDto } from './dto/query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async getTransactions(userId: string, filters: QueryTransactionsDto) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.TransactionWhereInput = { userId };

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { merchantName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }
    if (filters.accountId) where.accountId = filters.accountId;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.type === 'income') where.amount = { lt: 0 };
    if (filters.type === 'expense') where.amount = { gt: 0 };
    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      where.amount = {
        ...(filters.minAmount !== undefined ? { gte: filters.minAmount } : {}),
        ...(filters.maxAmount !== undefined ? { lte: filters.maxAmount } : {}),
      };
    }
    if (filters.uncategorized) where.categoryId = null;

    const sortBy = filters.sortBy === 'amount' ? 'amount' : 'date';
    const sortDir = filters.sortDir === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { category: true, account: { select: { id: true, name: true, mask: true } } },
        orderBy: { [sortBy]: sortDir },
        skip,
        take: pageSize,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  async getTransaction(userId: string, id: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      include: { category: true, account: { select: { id: true, name: true, mask: true } } },
    });
    if (!tx) throw AppExceptions.notFound(ERROR_CODES.RESOURCE_NOT_FOUND);
    if (tx.userId !== userId) throw AppExceptions.forbidden();
    return tx;
  }

  async updateTransaction(userId: string, id: string, dto: UpdateTransactionDto) {
    const tx = await this.prisma.transaction.findUnique({ where: { id } });
    if (!tx) throw AppExceptions.notFound(ERROR_CODES.RESOURCE_NOT_FOUND);
    if (tx.userId !== userId) throw AppExceptions.forbidden();
    return this.prisma.transaction.update({
      where: { id },
      data: { categoryId: dto.categoryId, notes: dto.notes },
      include: { category: true },
    });
  }

  async bulkUpdateCategory(userId: string, ids: string[], categoryId: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw AppExceptions.notFound(ERROR_CODES.RESOURCE_NOT_FOUND);
    // Only allow assigning to a built-in category or one the user owns
    if (category.userId !== null && category.userId !== userId) throw AppExceptions.forbidden();
    const result = await this.prisma.transaction.updateMany({
      where: { id: { in: ids }, userId },
      data: { categoryId },
    });
    return { updated: result.count };
  }

  // Built-in categories (userId null) plus the user's own custom ones
  async getCategories(userId: string) {
    return this.prisma.category.findMany({
      where: { OR: [{ userId: null }, { userId }] },
      orderBy: [{ groupName: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(userId: string, name: string) {
    const trimmed = (name ?? '').trim();
    if (!trimmed) throw AppExceptions.badRequest(ERROR_CODES.INVALID_INPUT);
    // Reject duplicates against built-in categories or the user's existing ones
    const existing = await this.prisma.category.findFirst({
      where: {
        name: { equals: trimmed, mode: 'insensitive' },
        OR: [{ userId: null }, { userId }],
      },
    });
    if (existing) throw AppExceptions.conflict(ERROR_CODES.RESOURCE_ALREADY_EXISTS);
    return this.prisma.category.create({
      data: { name: trimmed, groupName: 'Other', userId, isDefault: false },
    });
  }

  async deleteCategory(userId: string, id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw AppExceptions.notFound(ERROR_CODES.RESOURCE_NOT_FOUND);
    // Only the owner can delete, and built-in categories can never be deleted
    if (cat.userId !== userId) throw AppExceptions.forbidden();
    await this.prisma.$transaction([
      this.prisma.transaction.updateMany({ where: { categoryId: id, userId }, data: { categoryId: null } }),
      this.prisma.budget.deleteMany({ where: { categoryId: id, userId } }),
      this.prisma.category.delete({ where: { id } }),
    ]);
    return { message: 'Category deleted' };
  }

  async getSummary(userId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const txns = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: start, lt: end }, pending: false },
      select: { amount: true },
    });

    let income = 0;
    let expenses = 0;
    for (const t of txns) {
      if (t.amount < 0) income += Math.abs(t.amount);
      else expenses += t.amount;
    }

    return { income, expenses, net: income - expenses };
  }
}
