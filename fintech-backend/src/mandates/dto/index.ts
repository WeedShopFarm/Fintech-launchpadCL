import { IsUUID, IsString, IsEnum, IsOptional, IsDecimal, IsBoolean } from 'class-validator';

export class CreateMandateDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  bankAccountId: string;

  @IsString()
  @IsEnum(['sepa_core', 'sepa_b2b', 'bacs', 'pad', 'becs', 'autogiro', 'betalingsservice'])
  scheme: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isVrp?: boolean;

  @IsDecimal()
  @IsOptional()
  vrpMaxAmount?: number;

  @IsString()
  @IsOptional()
  vrpCurrency?: string;
}

export class MandateResponseDto {
  id: string;
  customerId: string;
  bankAccountId: string;
  provider: string;
  providerMandateId: string;
  scheme: string;
  status: string;
  isVrp: boolean;
  vrpMaxAmount?: number;
  vrpCurrency?: string;
  createdAt: Date;
  activatedAt?: Date;
  expiresAt?: Date;
}
