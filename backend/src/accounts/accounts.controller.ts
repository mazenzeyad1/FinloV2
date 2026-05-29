import { Controller, Get, Post, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@ApiTags('accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private service: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all accounts for current user' })
  getAccounts(@Request() req: any) {
    return this.service.getAccounts(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single account by ID' })
  getAccountById(@Request() req: any, @Param('id') id: string) {
    return this.service.getAccountById(req.user.id, id);
  }

  @Patch(':id/set-primary')
  @ApiOperation({ summary: 'Set an account as primary' })
  setPrimaryAccount(@Request() req: any, @Param('id') id: string) {
    return this.service.setPrimaryAccount(req.user.id, id);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync account balances from Plaid' })
  syncBalances(@Request() req: any) {
    return this.service.syncBalances(req.user.id);
  }
}
