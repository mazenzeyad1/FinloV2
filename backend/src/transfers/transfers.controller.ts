import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@ApiTags('transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private service: TransfersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all transfers for current user' })
  getTransfers(@Request() req: any) {
    return this.service.getTransfers(req.user.id);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send money to another Finlo user' })
  sendMoney(@Request() req: any, @Body() dto: any) {
    return this.service.sendMoney(req.user.id, dto);
  }

  @Patch(':id/decline')
  @ApiOperation({ summary: 'Decline a pending transfer request' })
  declineRequest(@Request() req: any, @Param('id') id: string) {
    return this.service.declineRequest(req.user.id, id);
  }
}
