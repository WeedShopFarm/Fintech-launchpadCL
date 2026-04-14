import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentPlan } from '../common/entities';
import { PaymentOrchestrator } from '../providers/payment-orchestrator.service';
import { CreateOneTimePaymentDto, CreateRecurringPaymentDto, PaymentResponseDto } from './dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(PaymentPlan)
    private paymentPlansRepository: Repository<PaymentPlan>,
    private paymentOrchestrator: PaymentOrchestrator,
  ) {}

  async createOneTime(businessId: string, createPaymentDto: CreateOneTimePaymentDto): Promise<PaymentResponseDto> {
    const { customerId, amount, currency, description, bankAccountId, metadata } = createPaymentDto;

    // Route payment through orchestrator
    const routeDecision = await this.paymentOrchestrator.routePayment({
      customerId,
      amount,
      currency,
      description,
      metadata,
      bankAccountId,
    });

    // Initiate payment
    const result = await this.paymentOrchestrator.initiatePayment(
      {
        customerId,
        amount,
        currency,
        description,
        metadata,
        bankAccountId,
      },
      routeDecision,
    );

    // Fetch and return payment details
    const payment = await this.paymentsRepository.findOne({ where: { id: result.id } });
    return this.mapToResponseDto(payment);
  }

  async createRecurring(businessId: string, createPaymentDto: CreateRecurringPaymentDto): Promise<any> {
    const { customerId, mandateId, amount, currency, frequency, description, metadata } = createPaymentDto;

    // Create payment plan
    const paymentPlan = this.paymentPlansRepository.create({
      businessId,
      customerId,
      mandateId,
      amount,
      currency,
      frequency,
      description,
      name: `${frequency} payment - ${amount} ${currency}`,
      startDate: new Date(),
      status: 'active',
    });

    const savedPlan = await this.paymentPlansRepository.save(paymentPlan);

    return {
      id: savedPlan.id,
      customerId,
      mandateId,
      amount,
      currency,
      frequency,
      status: 'active',
      createdAt: savedPlan.createdAt,
    };
  }

  async findAll(businessId: string, customerId?: string): Promise<PaymentResponseDto[]> {
    const query = this.paymentsRepository.createQueryBuilder('payment').where('payment.businessId = :businessId', {
      businessId,
    });

    if (customerId) {
      query.andWhere('payment.customerId = :customerId', { customerId });
    }

    const payments = await query.orderBy('payment.createdAt', 'DESC').getMany();

    return payments.map((p) => this.mapToResponseDto(p));
  }

  async findOne(id: string, businessId: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentsRepository.findOne({
      where: { id, businessId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.mapToResponseDto(payment);
  }

  async retry(id: string, businessId: string): Promise<PaymentResponseDto> {
    const payment = await this.findOne(id, businessId);

    if (payment.status === 'paid') {
      throw new BadRequestException('Payment is already paid');
    }

    // Retry logic (simplified)
    await this.paymentsRepository.update(id, {
      status: 'processing',
    });

    const updatedPayment = await this.paymentsRepository.findOne({ where: { id } });
    return this.mapToResponseDto(updatedPayment);
  }

  async refund(id: string, businessId: string, amount?: number): Promise<PaymentResponseDto> {
    const payment = await this.findOne(id, businessId);

    if (payment.status !== 'paid') {
      throw new BadRequestException('Only paid payments can be refunded');
    }

    // Refund logic (simplified)
    await this.paymentsRepository.update(id, {
      status: 'refunded',
    });

    const updatedPayment = await this.paymentsRepository.findOne({ where: { id } });
    return this.mapToResponseDto(updatedPayment);
  }

  private mapToResponseDto(payment: Payment): PaymentResponseDto {
    return {
      id: payment.id,
      businessId: payment.businessId,
      customerId: payment.customerId,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      amount: payment.amount as any,
      currency: payment.currency,
      status: payment.status,
      feeAmount: payment.feeAmount as any,
      createdAt: payment.createdAt,
      collectedAt: payment.collectedAt,
      failureReason: payment.failureReason,
    };
  }
}
