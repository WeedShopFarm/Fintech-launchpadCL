import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios, { AxiosInstance } from 'axios';
import { AppConfigService } from '../config/config.service';
import { Payment } from '../common/entities/payment.entity';
import { Mandate } from '../common/entities/mandate.entity';

@Injectable()
export class GoCardlessService {
  private readonly logger = new Logger(GoCardlessService.name);
  private axiosInstance: AxiosInstance;
  private baseUrl: string;

  constructor(
    private configService: AppConfigService,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Mandate)
    private mandatesRepository: Repository<Mandate>,
  ) {
    this.baseUrl =
      configService.gocardlessEnvironment === 'live'
        ? 'https://api.gocardless.com'
        : 'https://api.sandbox.gocardless.com';

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${configService.gocardlessAccessToken}`,
        'Content-Type': 'application/json',
        'GoCardless-Version': '2015-07-06',
      },
    });
  }

  async createPayment(
    mandateId: string,
    amount: number,
    currency: string,
    description: string,
    paymentId: string,
  ): Promise<any> {
    try {
      this.logger.log(`Creating GoCardless payment for mandate ${mandateId}: ${amount} ${currency}`);

      // Get mandate details
      const mandate = await this.mandatesRepository.findOne({ where: { id: mandateId } });
      if (!mandate) {
        throw new BadRequestException('Mandate not found');
      }

      // Create payment
      const paymentResponse = await this.axiosInstance.post('/payments', {
        payments: {
          amount: Math.round(amount * 100), // GoCardless uses cents
          currency: currency,
          mandate: mandate.providerMandateId,
          description: description,
          metadata: {
            paymentId: paymentId,
          },
        },
      });

      const gocardlessPaymentId = paymentResponse.data.payments.id;

      // Update payment record
      await this.paymentsRepository.update(paymentId, {
        providerPaymentId: gocardlessPaymentId,
        providerStatus: paymentResponse.data.payments.status,
        status: this.normalizeGoCardlessStatus(paymentResponse.data.payments.status),
      });

      this.logger.log(`Payment ${paymentId} created with GoCardless ID: ${gocardlessPaymentId}`);

      return {
        id: paymentId,
        provider: 'gocardless',
        providerPaymentId: gocardlessPaymentId,
        status: 'processing',
        amount,
        currency,
      };
    } catch (error) {
      this.logger.error(`GoCardless payment creation failed: ${error.message}`);
      throw new BadRequestException(`GoCardless payment failed: ${error.message}`);
    }
  }

  async createMandate(
    customerId: string,
    bankAccountId: string,
    scheme: string,
    isVrp: boolean = false,
  ): Promise<any> {
    try {
      this.logger.log(`Creating GoCardless mandate for scheme: ${scheme}`);

      const mandateData: any = {
        mandates: {
          scheme: scheme,
          reference: `MANDATE-${Date.now()}`,
        },
      };

      // Add VRP-specific data if needed
      if (isVrp) {
        mandateData.mandates.links = {
          creditor: this.configService.gocardlessCreditorId,
        };
      }

      const mandateResponse = await this.axiosInstance.post('/mandates', mandateData);

      return {
        id: mandateResponse.data.mandates.id,
        status: mandateResponse.data.mandates.status,
        scheme: scheme,
      };
    } catch (error) {
      this.logger.error(`GoCardless mandate creation failed: ${error.message}`);
      throw new BadRequestException(`Mandate creation failed: ${error.message}`);
    }
  }

  async getPaymentStatus(paymentId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/payments/${paymentId}`);
      return response.data.payments;
    } catch (error) {
      this.logger.error(`Failed to get GoCardless payment status: ${error.message}`);
      throw new BadRequestException(`Failed to get payment status: ${error.message}`);
    }
  }

  async cancelMandate(mandateId: string): Promise<void> {
    try {
      this.logger.log(`Cancelling GoCardless mandate: ${mandateId}`);

      await this.axiosInstance.post(`/mandates/${mandateId}/actions/cancel`);

      await this.mandatesRepository.update({ providerMandateId: mandateId }, { status: 'cancelled', cancelledAt: new Date() });

      this.logger.log(`Mandate ${mandateId} cancelled`);
    } catch (error) {
      this.logger.error(`Mandate cancellation failed: ${error.message}`);
      throw new BadRequestException(`Mandate cancellation failed: ${error.message}`);
    }
  }

  async handleWebhook(payload: any): Promise<void> {
    try {
      const event = payload.events?.[0];
      if (!event) return;

      const { resource_type, action, links } = event;

      if (resource_type === 'payments') {
        const paymentId = links?.payment;
        const status = this.normalizeGoCardlessStatus(action);

        const payment = await this.paymentsRepository.findOne({
          where: { providerPaymentId: paymentId },
        });

        if (payment) {
          await this.paymentsRepository.update(payment.id, {
            status: status,
            ...(status === 'paid' && { collectedAt: new Date() }),
            ...(status === 'failed' && { failedAt: new Date() }),
          });

          this.logger.log(`Payment ${payment.id} updated to ${status}`);
        }
      }

      if (resource_type === 'mandates') {
        const mandateId = links?.mandate;
        const status = this.normalizeGoCardlessMandateStatus(action);

        await this.mandatesRepository.update({ providerMandateId: mandateId }, { status });

        this.logger.log(`Mandate ${mandateId} updated to ${status}`);
      }
    } catch (error) {
      this.logger.error(`Webhook handling failed: ${error.message}`);
    }
  }

  private normalizeGoCardlessStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending_submission': 'processing',
      'submitted': 'processing',
      'confirmed': 'paid',
      'paid': 'paid',
      'failed': 'failed',
      'charged_back': 'charged_back',
      'cancelled': 'failed',
    };

    return statusMap[status] || 'pending';
  }

  private normalizeGoCardlessMandateStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'created': 'pending',
      'active': 'active',
      'cancelled': 'cancelled',
      'expired': 'expired',
      'failed': 'failed',
    };

    return statusMap[status] || 'pending';
  }
}
