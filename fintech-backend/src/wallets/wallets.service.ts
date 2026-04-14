import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet, WalletBalance, LedgerEntry, Payout } from '../common/entities';
import { CreatePayoutDto, WalletBalanceDto, LedgerEntryDto, PayoutResponseDto } from './dto';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletsRepository: Repository<Wallet>,
    @InjectRepository(WalletBalance)
    private walletBalancesRepository: Repository<WalletBalance>,
    @InjectRepository(LedgerEntry)
    private ledgerEntriesRepository: Repository<LedgerEntry>,
    @InjectRepository(Payout)
    private payoutsRepository: Repository<Payout>,
  ) {}

  async getBalance(walletId: string): Promise<WalletBalanceDto> {
    const wallet = await this.walletsRepository.findOne({ where: { id: walletId } });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const balance = await this.walletBalancesRepository.findOne({
      where: { walletId },
    });

    if (!balance) {
      throw new NotFoundException('Wallet balance not found');
    }

    return {
      walletId,
      availableBalance: balance.availableBalance as any,
      pendingBalance: balance.pendingBalance as any,
      reservedBalance: balance.reservedBalance as any,
      currency: wallet.currency,
    };
  }

  async getTransactions(walletId: string, limit: number = 50, offset: number = 0): Promise<LedgerEntryDto[]> {
    const wallet = await this.walletsRepository.findOne({ where: { id: walletId } });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const entries = await this.ledgerEntriesRepository.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return entries.map((entry) => ({
      id: entry.id,
      walletId: entry.walletId,
      entryType: entry.entryType as 'credit' | 'debit',
      amount: entry.amount as any,
      currency: entry.currency,
      status: entry.status,
      source: entry.source,
      description: entry.description,
      createdAt: entry.createdAt,
    }));
  }

  async createLedgerEntry(
    walletId: string,
    entryType: 'credit' | 'debit',
    amount: number,
    currency: string,
    source: string,
    sourceId: string,
    description: string,
  ): Promise<void> {
    const wallet = await this.walletsRepository.findOne({ where: { id: walletId } });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const balance = await this.walletBalancesRepository.findOne({ where: { walletId } });

    const previousBalance = balance?.availableBalance || 0;
    let newBalance = previousBalance;

    if (entryType === 'credit') {
      newBalance = previousBalance + amount;
    } else {
      newBalance = previousBalance - amount;
    }

    // Create ledger entry
    const entry = this.ledgerEntriesRepository.create({
      walletId,
      entryType,
      amount,
      currency,
      status: 'confirmed',
      source,
      sourceId,
      description,
      previousBalance,
      newBalance,
    });

    await this.ledgerEntriesRepository.save(entry);

    // Update wallet balance
    if (balance) {
      await this.walletBalancesRepository.update(balance.id, {
        availableBalance: newBalance,
      });
    } else {
      const newBalance = this.walletBalancesRepository.create({
        walletId,
        availableBalance: amount,
        pendingBalance: 0,
        reservedBalance: 0,
      });
      await this.walletBalancesRepository.save(newBalance);
    }
  }

  async createPayout(userId: string, createPayoutDto: CreatePayoutDto): Promise<PayoutResponseDto> {
    const { walletId, amount, currency, method, destination, cryptoNetwork } = createPayoutDto;

    // Verify sufficient balance
    const balance = await this.getBalance(walletId);

    if (balance.availableBalance < amount) {
      throw new BadRequestException('Insufficient balance for payout');
    }

    // Reserve amount
    await this.walletBalancesRepository.update({ walletId }, (qb) =>
      qb.set({
        availableBalance: () => `available_balance - ${amount}`,
        reservedBalance: () => `reserved_balance + ${amount}`,
      }),
    );

    // Create payout record
    const payout = this.payoutsRepository.create({
      userId,
      walletId,
      amount,
      currency,
      method,
      destination,
      cryptoNetwork,
      status: 'pending',
      feeAmount: this.calculateFee(amount, method),
    });

    const savedPayout = await this.payoutsRepository.save(payout);

    return {
      id: savedPayout.id,
      walletId: savedPayout.walletId,
      amount: savedPayout.amount as any,
      currency: savedPayout.currency,
      method: savedPayout.method,
      status: savedPayout.status,
      destination: savedPayout.destination,
      feeAmount: savedPayout.feeAmount as any,
      createdAt: savedPayout.createdAt,
    };
  }

  async findPayout(id: string, userId: string): Promise<PayoutResponseDto> {
    const payout = await this.payoutsRepository.findOne({
      where: { id, userId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return {
      id: payout.id,
      walletId: payout.walletId,
      amount: payout.amount as any,
      currency: payout.currency,
      method: payout.method,
      status: payout.status,
      destination: payout.destination,
      feeAmount: payout.feeAmount as any,
      createdAt: payout.createdAt,
      completedAt: payout.completedAt,
    };
  }

  async listPayouts(userId: string, limit: number = 50, offset: number = 0): Promise<PayoutResponseDto[]> {
    const payouts = await this.payoutsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return payouts.map((p) => ({
      id: p.id,
      walletId: p.walletId,
      amount: p.amount as any,
      currency: p.currency,
      method: p.method,
      status: p.status,
      destination: p.destination,
      feeAmount: p.feeAmount as any,
      createdAt: p.createdAt,
      completedAt: p.completedAt,
    }));
  }

  private calculateFee(amount: number, method: string): number {
    const feePercentages: { [key: string]: number } = {
      crypto: 0.01, // 1%
      stripe: 0.025, // 2.5%
      wise: 0.015, // 1.5%
    };

    const percentage = feePercentages[method] || 0.02;
    return amount * percentage;
  }
}
