import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../common/entities/bank-account.entity';
import { CreateBankAccountDto, VerifyBankAccountDto } from './dto';

@Injectable()
export class BankAccountsService {
  constructor(
    @InjectRepository(BankAccount)
    private bankAccountsRepository: Repository<BankAccount>,
  ) {}

  async create(customerId: string, createBankAccountDto: CreateBankAccountDto): Promise<BankAccount> {
    const bankAccount = this.bankAccountsRepository.create({
      customerId,
      ...createBankAccountDto,
      isVerified: false,
    });

    return this.bankAccountsRepository.save(bankAccount);
  }

  async findAll(customerId: string): Promise<BankAccount[]> {
    return this.bankAccountsRepository.find({
      where: { customerId, isActive: true },
    });
  }

  async findOne(id: string, customerId: string): Promise<BankAccount> {
    const bankAccount = await this.bankAccountsRepository.findOne({
      where: { id, customerId },
    });

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    return bankAccount;
  }

  async verify(id: string, customerId: string, verifyDto: VerifyBankAccountDto): Promise<BankAccount> {
    const bankAccount = await this.findOne(id, customerId);

    // Verify based on provider
    // This is a stub - actual verification logic depends on provider
    bankAccount.isVerified = true;
    bankAccount.verifiedAt = new Date();
    bankAccount.verificationMethod = verifyDto.verificationMethod;

    return this.bankAccountsRepository.save(bankAccount);
  }

  async remove(id: string, customerId: string): Promise<void> {
    const bankAccount = await this.findOne(id, customerId);
    
    // Soft delete
    bankAccount.isActive = false;
    await this.bankAccountsRepository.save(bankAccount);
  }

  async getBalance(id: string, customerId: string): Promise<any> {
    // TODO: Integrate with provider APIs to get real balance
    return {
      accountId: id,
      balance: 0,
      currency: 'USD',
    };
  }
}
