import { IsUUID, IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateOneTimePaymentDto {
  @IsUUID()
  customerId: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  bankAccountId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateRecurringPaymentDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  mandateId: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  @IsEnum(['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
  frequency: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class PaymentResponseDto {
  id: string;
  businessId: string;
  customerId: string;
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  feeAmount: number;
  createdAt: Date;
  collectedAt?: Date;
  failureReason?: string;
}
