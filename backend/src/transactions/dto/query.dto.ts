import { IsOptional, IsString, IsInt, IsNumber, IsBoolean, IsArray, ArrayMinSize, IsNotEmpty } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

export class QueryTransactionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'Starbucks' })
  @IsOptional() @IsString() search?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional() @IsString() from?: string;

  @ApiPropertyOptional({ example: '2024-01-31' })
  @IsOptional() @IsString() to?: string;

  @ApiPropertyOptional({ example: 'uuid' })
  @IsOptional() @IsString() accountId?: string;

  @ApiPropertyOptional({ example: 'uuid' })
  @IsOptional() @IsString() categoryId?: string;

  @ApiPropertyOptional({ example: 'expense', enum: ['income', 'expense', 'all'] })
  @IsOptional() @IsString() type?: 'income' | 'expense' | 'all';

  @ApiPropertyOptional({ example: 10 })
  @IsOptional() @Type(() => Number) @IsNumber() minAmount?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional() @Type(() => Number) @IsNumber() maxAmount?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() uncategorized?: boolean;

  @ApiPropertyOptional({ example: 'date', enum: ['date', 'amount'] })
  @IsOptional() @IsString() sortBy?: 'date' | 'amount';

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
  @IsOptional() @IsString() sortDir?: 'asc' | 'desc';
}

export class UpdateTransactionDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() notes?: string;
}

export class BulkUpdateCategoryDto {
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) ids: string[];
  @IsString() @IsNotEmpty() categoryId: string;
}

export class SummaryQueryDto {
  @Type(() => Number) @IsInt() month: number;
  @Type(() => Number) @IsInt() year: number;
}

export class CreateCategoryDto {
  @IsString() @IsNotEmpty() name: string;
}

export class MonthlySummaryQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() months?: number;
}
