import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppExceptions, ERROR_CODES } from '../common/errors/app-exception';

interface CreateGoalDto {
  name: string;
  emoji?: string;
  targetAmount: number;
  targetDate?: string;
}

interface UpdateGoalDto {
  name?: string;
  emoji?: string;
  targetAmount?: number;
  targetDate?: string;
}

interface ContributeDto {
  amount: number;
  note?: string;
}

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async getGoals(userId: string) {
    return this.prisma.goal.findMany({
      where: { userId },
      include: { contributions: { orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createGoal(userId: string, dto: CreateGoalDto) {
    return this.prisma.goal.create({
      data: {
        userId,
        name: dto.name,
        emoji: dto.emoji,
        targetAmount: dto.targetAmount,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      },
    });
  }

  async updateGoal(userId: string, id: string, dto: UpdateGoalDto) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal) throw AppExceptions.notFound(ERROR_CODES.RESOURCE_NOT_FOUND);
    if (goal.userId !== userId) throw AppExceptions.forbidden();
    return this.prisma.goal.update({
      where: { id },
      data: {
        name: dto.name,
        emoji: dto.emoji,
        targetAmount: dto.targetAmount,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
  }

  async deleteGoal(userId: string, id: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal) throw AppExceptions.notFound(ERROR_CODES.RESOURCE_NOT_FOUND);
    if (goal.userId !== userId) throw AppExceptions.forbidden();
    await this.prisma.goal.delete({ where: { id } });
    return { message: 'Goal deleted' };
  }

  async addContribution(userId: string, goalId: string, dto: ContributeDto) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw AppExceptions.notFound(ERROR_CODES.RESOURCE_NOT_FOUND);
    if (goal.userId !== userId) throw AppExceptions.forbidden();

    const [contribution] = await this.prisma.$transaction([
      this.prisma.goalContribution.create({
        data: { goalId, amount: dto.amount, note: dto.note },
      }),
      this.prisma.goal.update({
        where: { id: goalId },
        data: { currentAmount: { increment: dto.amount } },
      }),
    ]);

    return contribution;
  }
}
