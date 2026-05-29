import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Base pagination query DTO - extend this in feature DTOs
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number = 20;
}

/**
 * Paginated response wrapper
 */
export class PaginatedResponseDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };

  constructor(data: T[], total: number, page: number, pageSize: number) {
    this.data = data;
    const totalPages = Math.ceil(total / pageSize);
    this.meta = {
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }
}

/**
 * Helper function to calculate skip/take for Prisma
 */
export function calculateSkipTake(page: number = 1, pageSize: number = 20) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
