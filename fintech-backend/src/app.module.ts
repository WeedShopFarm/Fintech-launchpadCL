import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AccountsModule } from './accounts/accounts.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { ProvidersModule } from './providers/providers.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { MandatesModule } from './mandates/mandates.module';
import { PaymentsModule } from './payments/payments.module';
import { WalletsModule } from './wallets/wallets.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ProvidersModule,
    AuthModule,
    UsersModule,
    TransactionsModule,
    AccountsModule,
    BankAccountsModule,
    MandatesModule,
    PaymentsModule,
    WalletsModule,
    WebhooksModule,
  ],
})
export class AppModule {}