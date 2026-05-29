import { IsOptional, IsString, IsInt, IsNumber, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

export class QueryTransactionsDto extends PaginationQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() type?: 'income' | 'expense' | 'all';
  @IsOptional() @Type(() => Number) @IsNumber() minAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxAmount?: number;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() uncategorized?: boolean;
  @IsOptional() @IsString() sortBy?: 'date' | 'amount';
  @IsOptional() @IsString() sortDir?: 'asc' | 'desc';
}

export class UpdateTransactionDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() notes?: string;
}

export class BulkUpdateCategoryDto {
  ids: string[];
  categoryId: string;
}

export class SummaryQueryDto {
  @Type(() => Number) @IsInt() month: number;
  @Type(() => Number) @IsInt() year: number;
}
