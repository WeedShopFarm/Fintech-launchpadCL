import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mandate, BankAccount, Customer } from '../common/entities';
import { GoCardlessService } from '../providers/gocardless.service';
import { CreateMandateDto, MandateResponseDto } from './dto';

@Injectable()
export class MandatesService {
  constructor(
    @InjectRepository(Mandate)
    private mandatesRepository: Repository<Mandate>,
    @InjectRepository(BankAccount)
    private bankAccountsRepository: Repository<BankAccount>,
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
    private goCardlessService: GoCardlessService,
  ) {}

  async create(businessId: string, createMandateDto: CreateMandateDto): Promise<MandateResponseDto> {
    const { customerId, bankAccountId, scheme, isVrp, vrpMaxAmount, vrpCurrency } = createMandateDto;

    // Verify customer exists and belongs to business
    const customer = await this.customersRepository.findOne({
      where: { id: customerId, businessId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Verify bank account exists and is verified
    const bankAccount = await this.bankAccountsRepository.findOne({
      where: { id: bankAccountId, customerId },
    });

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    if (!bankAccount.isVerified) {
      throw new BadRequestException('Bank account is not verified');
    }

    // Create mandate via provider (using GoCardless for now)
    const providerMandate = await this.goCardlessService.createMandate(
      customerId,
      bankAccountId,
      scheme,
      isVrp,
    );

    // Store mandate in database
    const mandate = this.mandatesRepository.create({
      businessId,
      customerId,
      bankAccountId,
      provider: 'gocardless',
      providerMandateId: providerMandate.id,
      scheme,
      status: 'pending',
      isVrp: isVrp || false,
      vrpMaxAmount,
      vrpCurrency,
    });

    const savedMandate = await this.mandatesRepository.save(mandate);

    return this.mapToResponseDto(savedMandate);
  }

  async findAll(businessId: string, customerId?: string): Promise<MandateResponseDto[]> {
    const query = this.mandatesRepository.createQueryBuilder('mandate').where('mandate.businessId = :businessId', {
      businessId,
    });

    if (customerId) {
      query.andWhere('mandate.customerId = :customerId', { customerId });
    }

    const mandates = await query.getMany();
    return mandates.map((m) => this.mapToResponseDto(m));
  }

  async findOne(id: string, businessId: string): Promise<MandateResponseDto> {
    const mandate = await this.mandatesRepository.findOne({
      where: { id, businessId },
    });

    if (!mandate) {
      throw new NotFoundException('Mandate not found');
    }

    return this.mapToResponseDto(mandate);
  }

  async cancel(id: string, businessId: string): Promise<MandateResponseDto> {
    const mandate = await this.findOne(id, businessId);

    if (mandate.status === 'cancelled') {
      throw new BadRequestException('Mandate is already cancelled');
    }

    // Cancel via provider
    await this.goCardlessService.cancelMandate(mandate.providerMandateId);

    // Update in database
    await this.mandatesRepository.update(id, {
      status: 'cancelled',
      cancelledAt: new Date(),
    });

    const updatedMandate = await this.mandatesRepository.findOne({ where: { id } });
    return this.mapToResponseDto(updatedMandate);
  }

  async updateStatus(mandateId: string, status: string): Promise<void> {
    await this.mandatesRepository.update(
      { providerMandateId: mandateId },
      {
        status,
        ...(status === 'active' && { activatedAt: new Date() }),
        ...(status === 'expired' && { expiresAt: new Date() }),
      },
    );
  }

  private mapToResponseDto(mandate: Mandate): MandateResponseDto {
    return {
      id: mandate.id,
      customerId: mandate.customerId,
      bankAccountId: mandate.bankAccountId,
      provider: mandate.provider,
      providerMandateId: mandate.providerMandateId,
      scheme: mandate.scheme,
      status: mandate.status,
      isVrp: mandate.isVrp,
      vrpMaxAmount: mandate.vrpMaxAmount as any,
      vrpCurrency: mandate.vrpCurrency,
      createdAt: mandate.createdAt,
      activatedAt: mandate.activatedAt,
      expiresAt: mandate.expiresAt,
    };
  }
}
