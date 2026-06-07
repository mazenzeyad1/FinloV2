import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGoalDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() emoji?: string;
  @Type(() => Number) @IsNumber() @Min(0.01) targetAmount: number;
  @IsOptional() @IsISO8601() targetDate?: string;
}

export class UpdateGoalDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) targetAmount?: number;
  @IsOptional() @IsISO8601() targetDate?: string;
}

export class ContributeDto {
  @Type(() => Number) @IsNumber() @Min(0.01) amount: number;
  @IsOptional() @IsString() note?: string;
}
