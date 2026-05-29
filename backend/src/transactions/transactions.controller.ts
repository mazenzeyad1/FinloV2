import {
  Controller, Get, Patch, Post, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { QueryTransactionsDto, UpdateTransactionDto, BulkUpdateCategoryDto, SummaryQueryDto } from './dto/query.dto';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private service: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated transactions with filters' })
  @ApiOkResponse({ description: 'Paginated transaction list' })
  getTransactions(@Request() req: any, @Query() query: QueryTransactionsDto) {
    return this.service.getTransactions(req.user.id, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get income/expense summary for a month' })
  getSummary(@Request() req: any, @Query() query: SummaryQueryDto) {
    return this.service.getSummary(req.user.id, query.month, query.year);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single transaction' })
  getTransaction(@Request() req: any, @Param('id') id: string) {
    return this.service.getTransaction(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update transaction notes or category' })
  updateTransaction(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.service.updateTransaction(req.user.id, id, dto);
  }

  @Post('bulk-category')
  @ApiOperation({ summary: 'Bulk update category for transactions' })
  bulkUpdateCategory(@Request() req: any, @Body() dto: BulkUpdateCategoryDto) {
    return this.service.bulkUpdateCategory(req.user.id, dto.ids, dto.categoryId);
  }
}
