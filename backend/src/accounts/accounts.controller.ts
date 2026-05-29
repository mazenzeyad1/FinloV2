import { Controller, Get, Post, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private service: AccountsService) {}

  @Get()
  getAccounts(@Request() req: any) {
    return this.service.getAccounts(req.user.id);
  }

  @Get(':id')
  getAccountById(@Request() req: any, @Param('id') id: string) {
    return this.service.getAccountById(req.user.id, id);
  }

  @Patch(':id/set-primary')
  setPrimaryAccount(@Request() req: any, @Param('id') id: string) {
    return this.service.setPrimaryAccount(req.user.id, id);
  }

  @Post('sync')
  syncBalances(@Request() req: any) {
    return this.service.syncBalances(req.user.id);
  }
}
