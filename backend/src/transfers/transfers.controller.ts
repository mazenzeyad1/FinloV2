import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private service: TransfersService) {}

  @Get()
  getTransfers(@Request() req: any) {
    return this.service.getTransfers(req.user.id);
  }

  @Post('send')
  sendMoney(@Request() req: any, @Body() dto: any) {
    return this.service.sendMoney(req.user.id, dto);
  }

  @Patch(':id/decline')
  declineRequest(@Request() req: any, @Param('id') id: string) {
    return this.service.declineRequest(req.user.id, id);
  }
}
