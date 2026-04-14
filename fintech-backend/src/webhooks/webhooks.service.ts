import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import * as crypto from 'crypto';
import { WebhookEvent } from '../common/entities/webhook-event.entity';
import { StripeService } from '../providers/stripe.service';
import { YapilyService } from '../providers/yapily.service';
import { GoCardlessService } from '../providers/gocardless.service';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(WebhookEvent)
    private webhookEventsRepository: Repository<WebhookEvent>,
    private stripeService: StripeService,
    private yapilyService: YapilyService,
    private goCardlessService: GoCardlessService,
    private configService: AppConfigService,
  ) {}

  async processStripeWebhook(rawBody: any, signature: string): Promise<void> {
    try {
      // Construct Stripe event from raw body
      const stripe = new Stripe(this.configService.stripeSecretKey);
      const event = stripe.webhooks.constructEvent(
        JSON.stringify(rawBody),
        signature,
        this.configService.stripeWebhookSecret,
      ) as Stripe.Event;

      // Check for duplicate events
      const existingEvent = await this.webhookEventsRepository.findOne({
        where: { eventId: event.id, provider: 'stripe' },
      });

      if (existingEvent) {
        this.logger.log(`Duplicate Stripe webhook event: ${event.id}`);
        return;
      }

      // Store webhook event
      const webhookEvent = this.webhookEventsRepository.create({
        provider: 'stripe',
        eventType: event.type,
        eventId: event.id,
        payload: event.data,
      });

      await this.webhookEventsRepository.save(webhookEvent);

      // Process event
      await this.stripeService.handleWebhook(event);

      // Mark as processed
      await this.webhookEventsRepository.update(webhookEvent.id, {
        processed: true,
        processedAt: new Date(),
      });

      this.logger.log(`Stripe webhook processed: ${event.type}`);
    } catch (error) {
      this.logger.error(`Stripe webhook processing failed: ${error.message}`);
      throw new BadRequestException(`Invalid Stripe signature or payload`);
    }
  }

  async processYapilyWebhook(payload: any): Promise<void> {
    try {
      const { id, eventType } = payload;

      // Check for duplicate events
      const existingEvent = await this.webhookEventsRepository.findOne({
        where: { eventId: id, provider: 'yapily' },
      });

      if (existingEvent) {
        this.logger.log(`Duplicate Yapily webhook event: ${id}`);
        return;
      }

      // Store webhook event
      const webhookEvent = this.webhookEventsRepository.create({
        provider: 'yapily',
        eventType: eventType,
        eventId: id,
        payload: payload,
      });

      await this.webhookEventsRepository.save(webhookEvent);

      // Process event
      await this.yapilyService.handleWebhook(payload);

      // Mark as processed
      await this.webhookEventsRepository.update(webhookEvent.id, {
        processed: true,
        processedAt: new Date(),
      });

      this.logger.log(`Yapily webhook processed: ${eventType}`);
    } catch (error) {
      this.logger.error(`Yapily webhook processing failed: ${error.message}`);
      throw new BadRequestException(`Yapily webhook processing failed`);
    }
  }

  async processGoCardlessWebhook(payload: any, signature: string): Promise<void> {
    try {
      // Verify signature
      const computedSignature = crypto
        .createHmac('sha256', this.configService.gocardlessWebhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (computedSignature !== signature) {
        throw new BadRequestException('Invalid GoCardless webhook signature');
      }

      const { id, events } = payload;

      // Check for duplicate events
      const existingEvent = await this.webhookEventsRepository.findOne({
        where: { eventId: id, provider: 'gocardless' },
      });

      if (existingEvent) {
        this.logger.log(`Duplicate GoCardless webhook event: ${id}`);
        return;
      }

      // Store webhook event
      const webhookEvent = this.webhookEventsRepository.create({
        provider: 'gocardless',
        eventType: events?.[0]?.resource_type || 'unknown',
        eventId: id,
        payload: payload,
      });

      await this.webhookEventsRepository.save(webhookEvent);

      // Process event
      await this.goCardlessService.handleWebhook(payload);

      // Mark as processed
      await this.webhookEventsRepository.update(webhookEvent.id, {
        processed: true,
        processedAt: new Date(),
      });

      this.logger.log(`GoCardless webhook processed: ${events?.[0]?.resource_type}`);
    } catch (error) {
      this.logger.error(`GoCardless webhook processing failed: ${error.message}`);
      throw new BadRequestException(`GoCardless webhook processing failed`);
    }
  }
}
