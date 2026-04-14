import { IsUUID, IsNumber, IsString, IsEnum, IsOptional } from 'class-validator';

export class WalletBalanceDto {
  walletId: string;
  availableBalance: number;
  pendingBalance: number;
  reservedBalance: number;
  currency: string;
}

export class LedgerEntryDto {
  id: string;
  walletId: string;
  entryType: 'credit' | 'debit';
  amount: number;
  currency: string;
  status: string;
  source: string;
  description?: string;
  createdAt: Date;
}

export class CreatePayoutDto {
  @IsUUID()
  walletId: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsEnum(['crypto', 'stripe', 'wise'])
  method: string;

  @IsString()
  destination: string;

  @IsOptional()
  cryptoNetwork?: string;
}

export class PayoutResponseDto {
  id: string;
  walletId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  destination: string;
  feeAmount: number;
  createdAt: Date;
  completedAt?: Date;
}
