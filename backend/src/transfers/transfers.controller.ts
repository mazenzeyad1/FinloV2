import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TransfersService } from './transfers.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

class SendMoneyDto {
  @IsEmail() recipientEmail: string;
  @Type(() => Number) @IsNumber() @Min(0.01) amount: number;
  @IsOptional() @IsString() memo?: string;
}

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
  @HttpCode(201)
  @ApiOperation({ summary: 'Send money to another Finlo user' })
  sendMoney(@Request() req: any, @Body() dto: SendMoneyDto) {
    return this.service.sendMoney(req.user.id, dto);
  }

  @Patch(':id/decline')
  @ApiOperation({ summary: 'Decline a pending transfer request' })
  declineRequest(@Request() req: any, @Param('id') id: string) {
    return this.service.declineRequest(req.user.id, id);
  }
}
