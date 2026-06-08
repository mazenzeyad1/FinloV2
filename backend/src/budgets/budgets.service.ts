import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppExceptions, ERROR_CODES } from '../common/errors/app-exception';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async getBudgetSummary(userId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const [budgets, transactions, categories] = await Promise.all([
      this.prisma.budget.findMany({
        where: { userId, year, month },
        include: { category: true },
      }),
      this.prisma.transaction.findMany({
        where: { userId, date: { gte: start, lt: end }, amount: { gt: 0 } },
        select: { categoryId: true, amount: true },
      }),
      this.prisma.category.findMany({
        where: { OR: [{ userId: null }, { userId }] },
      }),
    ]);

    const spendMap = new Map<string, number>();
    for (const t of transactions) {
      if (!t.categoryId) continue;
      spendMap.set(t.categoryId, (spendMap.get(t.categoryId) ?? 0) + t.amount);
    }

    const budgetMap = new Map(budgets.map((b) => [b.categoryId, b]));

    const result = [];
    for (const cat of categories) {
      const budget = budgetMap.get(cat.id);
      const spentAmount = spendMap.get(cat.id) ?? 0;
      const plannedAmount = budget?.plannedAmount ?? 0;
      const remaining = plannedAmount - spentAmount;
      const percentUsed = plannedAmount > 0 ? (spentAmount / plannedAmount) * 100 : 0;

      result.push({
        categoryId: cat.id,
        categoryName: cat.name,
        groupName: cat.groupName,
        isCustom: cat.userId !== null,
        plannedAmount,
        spentAmount,
        remaining,
        percentUsed,
      });
    }

    return result.sort((a, b) => a.groupName.localeCompare(b.groupName) || a.categoryName.localeCompare(b.categoryName));
  }

  async upsertBudget(
    userId: string,
    categoryId: string,
    year: number,
    month: number,
    plannedAmount: number,
  ) {
    return this.prisma.budget.upsert({
      where: { userId_categoryId_year_month: { userId, categoryId, year, month } },
      create: { userId, categoryId, year, month, plannedAmount },
      update: { plannedAmount },
      include: { category: true },
    });
  }

  async copyFromPreviousMonth(userId: string, year: number, month: number) {
    if (month < 1 || month > 12) throw AppExceptions.badRequest(ERROR_CODES.INVALID_INPUT);
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }

    const prevBudgets = await this.prisma.budget.findMany({
      where: { userId, year: prevYear, month: prevMonth },
    });

    let copied = 0;
    for (const b of prevBudgets) {
      const exists = await this.prisma.budget.findUnique({
        where: { userId_categoryId_year_month: { userId, categoryId: b.categoryId, year, month } },
      });
      if (!exists) {
        await this.prisma.budget.create({
          data: { userId, categoryId: b.categoryId, year, month, plannedAmount: b.plannedAmount },
        });
        copied++;
      }
    }

    return { copied };
  }
}
