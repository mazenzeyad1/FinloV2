import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { addDays } from 'date-fns';
import { MailerService } from '../common/mailer/mailer.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateHouseholdDto, InviteMemberDto } from './dto/household.dto';

@Injectable()
export class HouseholdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private hash(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async getMemberOrThrow(userId: string) {
    const member = await this.prisma.householdMember.findUnique({
      where: { userId },
      include: { household: true },
    });
    if (!member) throw new NotFoundException('You are not in a household');
    return member;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async createHousehold(userId: string, dto: CreateHouseholdDto) {
    const existing = await this.prisma.householdMember.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new BadRequestException(
        'You are already in a household. Leave it first.',
      );
    }

    const household = await this.prisma.household.create({
      data: {
        name: dto.name ?? 'Our Household',
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: { members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } } },
    });

    return household;
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async getHousehold(userId: string) {
    const member = await this.getMemberOrThrow(userId);
    return this.prisma.household.findUnique({
      where: { id: member.householdId },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        invites: {
          where: { acceptedAt: null, expiresAt: { gt: new Date() } },
          select: { id: true, email: true, createdAt: true, expiresAt: true },
        },
      },
    });
  }

  // ── Invite ────────────────────────────────────────────────────────────────

  async inviteMember(userId: string, dto: InviteMemberDto) {
    const member = await this.getMemberOrThrow(userId);

    // Only owners can invite
    if (member.role !== 'OWNER') {
      throw new ForbiddenException('Only household owners can send invites');
    }

    // Don't invite someone already in the household
    const alreadyMember = await this.prisma.householdMember.findFirst({
      where: { household: { id: member.householdId }, user: { email: dto.email } },
    });
    if (alreadyMember) {
      throw new BadRequestException('This person is already in your household');
    }

    // Don't invite someone already in any household
    const targetUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (targetUser) {
      const theirMembership = await this.prisma.householdMember.findUnique({
        where: { userId: targetUser.id },
      });
      if (theirMembership) {
        throw new BadRequestException('This person is already part of a household');
      }
    }

    // Expire any existing pending invite for this email in this household
    await this.prisma.householdInvite.updateMany({
      where: {
        householdId: member.householdId,
        email: dto.email,
        acceptedAt: null,
      },
      data: { expiresAt: new Date() },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hash(rawToken);

    const invite = await this.prisma.householdInvite.create({
      data: {
        householdId: member.householdId,
        email: dto.email,
        tokenHash,
        expiresAt: addDays(new Date(), 7),
      },
      include: { household: true },
    });

    const inviter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const acceptUrl = `${process.env.FRONTEND_URL}/household/accept?token=${rawToken}`;

    await this.mailer.send({
      to: dto.email,
      subject: `${inviter?.firstName} invited you to join their household on Finlo`,
      html: `
        <p>Hi there,</p>
        <p><strong>${inviter?.firstName} ${inviter?.lastName}</strong> has invited you to join the
        <strong>${invite.household.name}</strong> household on Finlo.</p>
        <p>
          <a href="${acceptUrl}" style="
            display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;
            text-decoration:none;border-radius:8px;font-weight:600;
          ">Accept Invitation</a>
        </p>
        <p style="color:#666;font-size:13px;">This link expires in 7 days.</p>
      `,
    });

    return { message: 'Invitation sent', email: dto.email };
  }

  // ── Accept ────────────────────────────────────────────────────────────────

  async acceptInvite(userId: string, rawToken: string) {
    const tokenHash = this.hash(rawToken);

    const invite = await this.prisma.householdInvite.findUnique({
      where: { tokenHash },
      include: { household: true },
    });

    if (!invite) throw new NotFoundException('Invite not found or already used');
    if (invite.acceptedAt) throw new BadRequestException('Invite already accepted');
    if (invite.expiresAt < new Date()) throw new BadRequestException('Invite has expired');

    // Verify the logged-in user's email matches the invite
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.email !== invite.email) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address',
      );
    }

    // Check user isn't already in a household
    const alreadyMember = await this.prisma.householdMember.findUnique({
      where: { userId },
    });
    if (alreadyMember) {
      throw new BadRequestException(
        'You are already in a household. Leave it first.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.householdMember.create({
        data: { householdId: invite.householdId, userId, role: 'MEMBER' },
      }),
      this.prisma.householdInvite.update({
        where: { tokenHash },
        data: { acceptedAt: new Date() },
      }),
    ]);

    return { message: 'You have joined the household', householdId: invite.householdId };
  }

  // ── Remove member ─────────────────────────────────────────────────────────

  async removeMember(requesterId: string, targetUserId: string) {
    const requester = await this.getMemberOrThrow(requesterId);

    if (requester.role !== 'OWNER') {
      throw new ForbiddenException('Only owners can remove members');
    }
    if (requesterId === targetUserId) {
      throw new BadRequestException('Owners cannot remove themselves — use leave or transfer ownership');
    }

    const target = await this.prisma.householdMember.findFirst({
      where: { userId: targetUserId, householdId: requester.householdId },
    });
    if (!target) throw new NotFoundException('Member not found in your household');

    await this.prisma.householdMember.delete({ where: { id: target.id } });
    return { message: 'Member removed' };
  }

  // ── Leave ─────────────────────────────────────────────────────────────────

  async leaveHousehold(userId: string) {
    const member = await this.getMemberOrThrow(userId);

    if (member.role === 'OWNER') {
      const otherMembers = await this.prisma.householdMember.count({
        where: { householdId: member.householdId, userId: { not: userId } },
      });
      if (otherMembers > 0) {
        throw new BadRequestException(
          'Transfer ownership before leaving, or remove all other members first',
        );
      }
      // Last person — delete the whole household
      await this.prisma.household.delete({ where: { id: member.householdId } });
      return { message: 'Household deleted' };
    }

    await this.prisma.householdMember.delete({ where: { id: member.id } });
    return { message: 'You have left the household' };
  }

  // ── Household data views ──────────────────────────────────────────────────

  async getHouseholdAccounts(userId: string) {
    const member = await this.getMemberOrThrow(userId);

    const members = await this.prisma.householdMember.findMany({
      where: { householdId: member.householdId },
      select: { userId: true, user: { select: { firstName: true, lastName: true } } },
    });

    const memberIds = members.map((m) => m.userId);

    const accounts = await this.prisma.account.findMany({
      where: { userId: { in: memberIds } },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ userId: 'asc' }, { name: 'asc' }],
    });

    return accounts;
  }

  async getHouseholdTransactions(
    userId: string,
    query: { page?: number; pageSize?: number; from?: string; to?: string },
  ) {
    const member = await this.getMemberOrThrow(userId);

    const members = await this.prisma.householdMember.findMany({
      where: { householdId: member.householdId },
      select: { userId: true },
    });
    const memberIds = members.map((m) => m.userId);

    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: any = { userId: { in: memberIds } };
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          category: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { transactions, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getHouseholdBudgetSummary(userId: string) {
    const member = await this.getMemberOrThrow(userId);

    const members = await this.prisma.householdMember.findMany({
      where: { householdId: member.householdId },
      select: { userId: true, user: { select: { firstName: true, lastName: true } } },
    });
    const memberIds = members.map((m) => m.userId);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const [budgets, spending] = await Promise.all([
      this.prisma.budget.findMany({
        where: { userId: { in: memberIds }, year, month },
        include: { category: true, user: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId', 'userId'],
        where: {
          userId: { in: memberIds },
          amount: { gt: 0 },
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    // Merge spending into budgets
    const spendingMap = new Map<string, number>();
    for (const s of spending) {
      const key = `${s.userId}:${s.categoryId}`;
      spendingMap.set(key, (spendingMap.get(key) ?? 0) + (s._sum.amount ?? 0));
    }

    const summary = budgets.map((b) => ({
      ...b,
      spent: spendingMap.get(`${b.userId}:${b.categoryId}`) ?? 0,
      remaining: b.plannedAmount - (spendingMap.get(`${b.userId}:${b.categoryId}`) ?? 0),
    }));

    return { year, month, members, summary };
  }
}
