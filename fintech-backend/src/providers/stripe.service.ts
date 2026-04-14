import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { AppConfigService } from '../config/config.service';
import { Payment } from '../common/entities/payment.entity';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(
    private configService: AppConfigService,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
  ) {
    this.stripe = new Stripe(configService.stripeSecretKey, {
      apiVersion: configService.stripeApiVersion as Stripe.LatestApiVersion,
    });
  }

  async createACHPayment(
    customerId: string,
    amount: number,
    currency: string,
    description: string,
    paymentId: string,
  ): Promise<any> {
    try {
      this.logger.log(`Creating ACH payment for customer ${customerId}: ${amount} ${currency}`);

      // Create payment intent for ACH
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe uses cents
        currency: currency.toLowerCase(),
        payment_method_types: ['us_bank_account'],
        description,
        metadata: {
          paymentId,
          customerId,
        },
      });

      // Update payment record
      await this.paymentsRepository.update(paymentId, {
        providerPaymentId: paymentIntent.id,
        providerStatus: paymentIntent.status,
        status: 'processing',
      });

      return {
        id: paymentId,
        provider: 'stripe',
        providerPaymentId: paymentIntent.id,
        status: 'processing',
        amount,
        currency,
      };
    } catch (error) {
      this.logger.error(`Stripe ACH payment failed: ${error.message}`);
      throw new BadRequestException(`Stripe payment failed: ${error.message}`);
    }
  }

  async createCardPayment(
    customerId: string,
    amount: number,
    currency: string,
    description: string,
    paymentId: string,
  ): Promise<any> {
    try {
      this.logger.log(`Creating card payment for customer ${customerId}: ${amount} ${currency}`);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        payment_method_types: ['card'],
        description,
        metadata: {
          paymentId,
          customerId,
        },
      });

      await this.paymentsRepository.update(paymentId, {
        providerPaymentId: paymentIntent.id,
        providerStatus: paymentIntent.status,
        status: 'processing',
      });

      return {
        id: paymentId,
        provider: 'stripe',
        providerPaymentId: paymentIntent.id,
        status: 'processing',
        amount,
        currency,
      };
    } catch (error) {
      this.logger.error(`Stripe card payment failed: ${error.message}`);
      throw new BadRequestException(`Stripe payment failed: ${error.message}`);
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<any> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
      };
    } catch (error) {
      this.logger.error(`Failed to confirm Stripe payment: ${error.message}`);
      throw new BadRequestException(`Failed to confirm payment: ${error.message}`);
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number): Promise<any> {
    try {
      this.logger.log(`Refunding Stripe payment: ${paymentIntentId}`);

      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });

      return {
        id: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
      };
    } catch (error) {
      this.logger.error(`Stripe refund failed: ${error.message}`);
      throw new BadRequestException(`Refund failed: ${error.message}`);
    }
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          break;
      }
    } catch (error) {
      this.logger.error(`Webhook handling failed: ${error.message}`);
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const paymentId = paymentIntent.metadata?.paymentId;
    if (paymentId) {
      await this.paymentsRepository.update(paymentId, {
        status: 'paid',
        providerStatus: paymentIntent.status,
        collectedAt: new Date(),
      });
      this.logger.log(`Payment ${paymentId} marked as paid`);
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const paymentId = paymentIntent.metadata?.paymentId;
    if (paymentId) {
      await this.paymentsRepository.update(paymentId, {
        status: 'failed',
        providerStatus: paymentIntent.status,
        failureReason: paymentIntent.last_payment_error?.message,
        failedAt: new Date(),
      });
      this.logger.log(`Payment ${paymentId} marked as failed`);
    }
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    if (charge.payment_intent && typeof charge.payment_intent === 'string') {
      const payment = await this.paymentsRepository.findOne({
        where: { providerPaymentId: charge.payment_intent },
      });

      if (payment) {
        await this.paymentsRepository.update(payment.id, {
          status: 'refunded',
        });
        this.logger.log(`Payment ${payment.id} marked as refunded`);
      }
    }
  }
}
