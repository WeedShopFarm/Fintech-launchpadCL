import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount, Customer, Payment, Mandate } from '../common/entities';
import { StripeService } from './stripe.service';
import { YapilyService } from './yapily.service';
import { GoCardlessService } from './gocardless.service';

export interface PaymentRouteDecision {
  provider: 'stripe' | 'yapily' | 'gocardless';
  scheme?: string;
  reason: string;
}

export interface PaymentRequest {
  customerId: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: any;
  bankAccountId?: string;
  mandateId?: string;
}

export interface PaymentResult {
  id: string;
  provider: string;
  providerPaymentId: string;
  status: string;
  amount: number;
  currency: string;
}

@Injectable()
export class PaymentOrchestrator {
  private readonly logger = new Logger(PaymentOrchestrator.name);

  constructor(
    @InjectRepository(BankAccount)
    private bankAccountsRepository: Repository<BankAccount>,
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Mandate)
    private mandatesRepository: Repository<Mandate>,
    private stripeService: StripeService,
    private yapilyService: YapilyService,
    private goCardlessService: GoCardlessService,
  ) {}

  async routePayment(paymentRequest: PaymentRequest): Promise<PaymentRouteDecision> {
    const { customerId, amount, currency, bankAccountId } = paymentRequest;

    // Get customer and bank account
    const customer = await this.customersRepository.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    let bankAccount: BankAccount;
    if (bankAccountId) {
      bankAccount = await this.bankAccountsRepository.findOne({ where: { id: bankAccountId } });
    } else {
      // Get primary bank account
      bankAccount = await this.bankAccountsRepository.findOne({
        where: { customerId, isActive: true },
        order: { createdAt: 'ASC' },
      });
    }

    if (!bankAccount) {
      throw new BadRequestException('No bank account found');
    }

    const region = this.detectRegion(bankAccount.countryCode, bankAccount.iban);

    // Payment decision logic based on region
    if (region === 'EU') {
      return this.routeEUPayment(bankAccount, amount, currency);
    }

    if (region === 'UK') {
      return this.routeUKPayment(bankAccount, amount, currency);
    }

    if (region === 'US') {
      return this.routeUSPayment(bankAccount, amount, currency);
    }

    // Default: GoCardless for other regions
    return {
      provider: 'gocardless',
      reason: `Region ${region} - using GoCardless`,
    };
  }

  private detectRegion(countryCode: string, iban?: string): string {
    // EU countries (SEPA zone)
    const euCountries = [
      'AT', 'BE', 'DE', 'DK', 'ES', 'FI', 'FR', 'GR', 'IE', 'IT', 'LU', 'NL', 'PT', 'SE',
      'CY', 'CZ', 'EE', 'HR', 'HU', 'LT', 'LV', 'MT', 'PL', 'RO', 'SK', 'SI', 'BG', 'GB', 'CH',
    ];

    if (countryCode === 'GB' || countryCode === 'UK') {
      return 'UK';
    }

    if (countryCode === 'US') {
      return 'US';
    }

    if (euCountries.includes(countryCode)) {
      return 'EU';
    }

    // Map other countries to supported schemes
    const regionMap: { [key: string]: string } = {
      'CA': 'PAD', // Canada - Pre-Authorized Debit
      'AU': 'BECS', // Australia - BACS EzyCheque System
      'NZ': 'ACH', // New Zealand - Automated Clearing House
      'SE': 'EU', // Sweden - European/SEPA
      'DK': 'EU', // Denmark - European/SEPA
    };

    return regionMap[countryCode] || 'OTHER';
  }

  private routeEUPayment(bankAccount: BankAccount, amount: number, currency: string): PaymentRouteDecision {
    // Try Yapily for instant payments under €10,000
    if (amount <= 10000 && currency === 'EUR') {
      return {
        provider: 'yapily',
        reason: 'EU - Yapily A2A for instant settlement (< €10k)',
      };
    }

    // Fallback to GoCardless SEPA Direct Debit
    return {
      provider: 'gocardless',
      scheme: 'sepa_core',
      reason: 'EU - GoCardless SEPA Direct Debit',
    };
  }

  private routeUKPayment(bankAccount: BankAccount, amount: number, currency: string): PaymentRouteDecision {
    // Try Yapily for instant payments
    if (currency === 'GBP' && amount <= 5000) {
      return {
        provider: 'yapily',
        reason: 'UK - Yapily A2A for instant settlement (< £5k)',
      };
    }

    // Fallback to GoCardless Bacs Direct Debit
    return {
      provider: 'gocardless',
      scheme: 'bacs',
      reason: 'UK - GoCardless Bacs Direct Debit',
    };
  }

  private routeUSPayment(bankAccount: BankAccount, amount: number, currency: string): PaymentRouteDecision {
    if (currency === 'USD') {
      return {
        provider: 'stripe',
        reason: 'US - Stripe ACH with Financial Connections',
      };
    }

    throw new BadRequestException('Unsupported currency for US payments');
  }

  async initiatePayment(paymentRequest: PaymentRequest, routeDecision: PaymentRouteDecision): Promise<PaymentResult> {
    this.logger.log(`Initiating payment via ${routeDecision.provider}: ${routeDecision.reason}`);

    const { customerId, amount, currency, description, metadata, mandateId } = paymentRequest;

    // Create payment record
    const payment = this.paymentsRepository.create({
      customerId,
      amount,
      currency,
      provider: routeDecision.provider,
      status: 'pending',
      metadata: { ...metadata, routingReason: routeDecision.reason },
    });

    const savedPayment = await this.paymentsRepository.save(payment);

    try {
      switch (routeDecision.provider) {
        case 'stripe':
          return await this.stripeService.createACHPayment(
            customerId,
            amount,
            currency,
            description,
            savedPayment.id,
          );

        case 'yapily':
          return await this.yapilyService.initiatePayment(
            customerId,
            amount,
            currency,
            description,
            savedPayment.id,
          );

        case 'gocardless':
          if (!mandateId) {
            throw new BadRequestException('Mandate required for GoCardless payments');
          }
          return await this.goCardlessService.createPayment(
            mandateId,
            amount,
            currency,
            description,
            savedPayment.id,
          );

        default:
          throw new BadRequestException(`Unknown provider: ${routeDecision.provider}`);
      }
    } catch (error) {
      this.logger.error(`Payment initiation failed: ${error.message}`);

      // Update payment status to failed
      await this.paymentsRepository.update(savedPayment.id, {
        status: 'failed',
        failureReason: error.message,
        failedAt: new Date(),
      });

      throw error;
    }
  }
}
