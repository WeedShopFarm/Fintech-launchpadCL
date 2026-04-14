import { IsUUID, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  provider: 'stripe' | 'yapily' | 'gocardless' | 'manual';

  @IsString()
  @IsOptional()
  providerAccountId?: string;

  @IsString()
  bankName: string;

  @IsString()
  accountHolderName: string;

  @IsString()
  @IsOptional()
  @IsEnum(['checking', 'savings', 'business'])
  accountType?: string;

  @IsString()
  countryCode: string;

  @IsString()
  currency: string;

  @IsString()
  @IsOptional()
  routingNumber?: string;

  @IsString()
  @IsOptional()
  iban?: string;
}

export class VerifyBankAccountDto {
  @IsString()
  verificationMethod: string;

  @IsString()
  @IsOptional()
  amount1?: string;

  @IsString()
  @IsOptional()
  amount2?: string;
}

export class BankAccountResponseDto {
  id: string;
  provider: string;
  bankName: string;
  accountHolderName: string;
  accountNumberLast4: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
}
