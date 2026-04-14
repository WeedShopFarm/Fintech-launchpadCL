import { Controller, Post, Body, Headers, BadRequestException, Logger } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('api/webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private webhooksService: WebhooksService) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Body() event: any,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    await this.webhooksService.processStripeWebhook(event, signature);
    return { received: true };
  }

  @Post('yapily')
  async handleYapilyWebhook(@Body() payload: any): Promise<{ received: boolean }> {
    await this.webhooksService.processYapilyWebhook(payload);
    return { received: true };
  }

  @Post('gocardless')
  async handleGoCardlessWebhook(
    @Body() payload: any,
    @Headers('webhook-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing webhook-signature header');
    }

    await this.webhooksService.processGoCardlessWebhook(payload, signature);
    return { received: true };
  }
}
