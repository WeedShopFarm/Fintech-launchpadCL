import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment, Mandate, BankAccount, Customer } from '../common/entities';
import { PaymentOrchestrator } from './payment-orchestrator.service';
import { StripeService } from './stripe.service';
import { YapilyService } from './yapily.service';
import { GoCardlessService } from './gocardless.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Mandate, BankAccount, Customer])],
  providers: [PaymentOrchestrator, StripeService, YapilyService, GoCardlessService],
  exports: [PaymentOrchestrator, StripeService, YapilyService, GoCardlessService],
})
export class ProvidersModule {}
