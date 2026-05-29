import { Controller, Get, Put, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Type } from 'class-transformer';
import { IsInt, IsNumber } from 'class-validator';

class BudgetQueryDto {
  @Type(() => Number) @IsInt() year: number;
  @Type(() => Number) @IsInt() month: number;
}

class UpsertBudgetDto {
  @IsNumber() plannedAmount: number;
}

class CopyBudgetsDto {
  @Type(() => Number) @IsInt() year: number;
  @Type(() => Number) @IsInt() month: number;
}

@ApiTags('budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private service: BudgetsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get budget summary with spending for a month' })
  getSummary(@Request() req: any, @Query() query: BudgetQueryDto) {
    return this.service.getBudgetSummary(req.user.id, query.year, query.month);
  }

  @Put(':categoryId')
  @ApiOperation({ summary: 'Create or update a budget for a category' })
  upsertBudget(
    @Request() req: any,
    @Param('categoryId') categoryId: string,
    @Query() query: BudgetQueryDto,
    @Body() dto: UpsertBudgetDto,
  ) {
    return this.service.upsertBudget(req.user.id, categoryId, query.year, query.month, dto.plannedAmount);
  }

  @Post('copy')
  @ApiOperation({ summary: 'Copy budgets from previous month' })
  copyFromPreviousMonth(@Request() req: any, @Body() dto: CopyBudgetsDto) {
    return this.service.copyFromPreviousMonth(req.user.id, dto.year, dto.month);
  }
}
