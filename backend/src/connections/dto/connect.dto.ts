import { IsString, IsOptional } from 'class-validator';

export class CreateLinkTokenDto {}

export class ExchangeTokenDto {
  @IsString()
  publicToken: string;
}

export class SyncDto {
  @IsOptional()
  @IsString()
  connectionId?: string;
}
