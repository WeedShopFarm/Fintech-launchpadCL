import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios, { AxiosInstance } from 'axios';
import { AppConfigService } from '../config/config.service';
import { Payment } from '../common/entities/payment.entity';

@Injectable()
export class YapilyService {
  private readonly logger = new Logger(YapilyService.name);
  private axiosInstance: AxiosInstance;
  private baseUrl: string;

  constructor(
    private configService: AppConfigService,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
  ) {
    this.baseUrl =
      configService.yapilyEnvironment === 'live'
        ? 'https://api.yapily.com'
        : 'https://sandbox.yapily.com';

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${configService.yapilySecretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async initiatePayment(
    customerId: string,
    amount: number,
    currency: string,
    description: string,
    paymentId: string,
  ): Promise<any> {
    try {
      this.logger.log(`Initiating Yapily A2A payment: ${amount} ${currency}`);

      // Create payment request
      const paymentResponse = await this.axiosInstance.post('/payments', {
        paymentRequest: {
          type: 'DOMESTIC_PAYMENT',
          paymentType: 'SINGLE_PAYMENT',
          amount: {
            amount: amount,
            currency: currency,
          },
          description: description,
          beneficiary: {
            accountNumber: 'ACCOUNT_NUMBER',
            routingCode: 'ROUTING_CODE',
            accountHolderName: 'Beneficiary Name',
          },
          payer: {
            id: customerId,
          },
        },
      });

      const paymentRequestId = paymentResponse.data.id;

      // Update payment record
      await this.paymentsRepository.update(paymentId, {
        providerPaymentId: paymentRequestId,
        providerStatus: 'PENDING',
        status: 'processing',
      });

      return {
        id: paymentId,
        provider: 'yapily',
        providerPaymentId: paymentRequestId,
        status: 'processing',
        amount,
        currency,
      };
    } catch (error) {
      this.logger.error(`Yapily payment failed: ${error.message}`);
      throw new BadRequestException(`Yapily payment failed: ${error.message}`);
    }
  }

  async getPaymentStatus(paymentId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get Yapily payment status: ${error.message}`);
      throw new BadRequestException(`Failed to get payment status: ${error.message}`);
    }
  }

  async isBankSupported(institutionId: string): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get(`/institutions/${institutionId}`);
      return response.data.features?.includes('PAYMENT_INITIATION');
    } catch (error) {
      this.logger.warn(`Bank ${institutionId} not supported or error checking: ${error.message}`);
      return false;
    }
  }

  async handleWebhook(payload: any): Promise<void> {
    try {
      const { id, status, metadata } = payload;

      if (metadata?.paymentId) {
        const paymentStatus = this.normalizeYapilyStatus(status);

        await this.paymentsRepository.update(metadata.paymentId, {
          providerStatus: status,
          status: paymentStatus,
          ...(paymentStatus === 'paid' && { collectedAt: new Date() }),
          ...(paymentStatus === 'failed' && { failedAt: new Date() }),
        });

        this.logger.log(`Payment ${metadata.paymentId} updated to ${paymentStatus}`);
      }
    } catch (error) {
      this.logger.error(`Webhook handling failed: ${error.message}`);
    }
  }

  private normalizeYapilyStatus(yapilyStatus: string): string {
    const statusMap: { [key: string]: string } = {
      PENDING: 'processing',
      EXECUTED: 'paid',
      FAILED: 'failed',
      CANCELLED: 'failed',
      REJECTED: 'failed',
    };

    return statusMap[yapilyStatus] || 'pending';
  }
}
