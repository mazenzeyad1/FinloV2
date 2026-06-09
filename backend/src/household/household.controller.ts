import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { CreateHouseholdDto, InviteMemberDto } from './dto/household.dto';
import { HouseholdService } from './household.service';

@Controller('household')
@UseGuards(JwtAuthGuard)
export class HouseholdController {
  constructor(private readonly service: HouseholdService) {}

  /** Create a new household (requester becomes OWNER) */
  @Post()
  create(@Request() req: any, @Body() dto: CreateHouseholdDto) {
    return this.service.createHousehold(req.user.id, dto);
  }

  /** Get current user's household details + members + pending invites */
  @Get()
  get(@Request() req: any) {
    return this.service.getHousehold(req.user.id);
  }

  /** Send an email invite to a new member */
  @Post('invite')
  invite(@Request() req: any, @Body() dto: InviteMemberDto) {
    return this.service.inviteMember(req.user.id, dto);
  }

  /**
   * Guard against mistaken GET requests to invite endpoint.
   * The invite endpoint only accepts POST requests with an email in the body.
   */
  @Get('invite')
  inviteGetNotAllowed() {
    throw new BadRequestException('The invite endpoint only accepts POST requests. Please provide the email address in the request body.');
  }

  /**
   * Accept an invite via token.
   * Called after the user clicks the email link and logs in.
   * Token comes from the query string: GET /household/accept?token=...
   */
  @Get('accept')
  accept(@Request() req: any, @Query('token') token: string) {
    return this.service.acceptInvite(req.user.id, token);
  }

  /** Remove a specific member (owner only) */
  @Delete('members/:userId')
  removeMember(@Request() req: any, @Param('userId') targetUserId: string) {
    return this.service.removeMember(req.user.id, targetUserId);
  }

  /** Leave the household */
  @Delete('leave')
  leave(@Request() req: any) {
    return this.service.leaveHousehold(req.user.id);
  }

  /** All accounts belonging to household members */
  @Get('accounts')
  accounts(@Request() req: any) {
    return this.service.getHouseholdAccounts(req.user.id);
  }

  /** Paginated transactions across all household members */
  @Get('transactions')
  transactions(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getHouseholdTransactions(req.user.id, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      from,
      to,
    });
  }

  /** Budget summary for all household members this month */
  @Get('budgets/summary')
  budgetSummary(@Request() req: any) {
    return this.service.getHouseholdBudgetSummary(req.user.id);
  }
}
