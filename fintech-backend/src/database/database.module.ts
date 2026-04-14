import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from '../config/config.service';
import {
  User,
  Business,
  Customer,
  BankAccount,
  Mandate,
  Payment,
  PaymentPlan,
  Wallet,
  WalletBalance,
  LedgerEntry,
  Payout,
  CryptoWallet,
  WebhookEvent,
  AuditLog,
} from '../common/entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        type: 'postgres',
        host: configService.databaseHost,
        port: configService.databasePort,
        username: configService.databaseUsername,
        password: configService.databasePassword,
        database: configService.databaseName,
        entities: [
          User,
          Business,
          Customer,
          BankAccount,
          Mandate,
          Payment,
          PaymentPlan,
          Wallet,
          WalletBalance,
          LedgerEntry,
          Payout,
          CryptoWallet,
          WebhookEvent,
          AuditLog,
        ],
        synchronize: configService.databaseSynchronize,
        logging: configService.databaseLogging,
        maxQueryExecutionTime: 1000,
        extra: {
          max: configService.databasePoolSize,
        },
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      Business,
      Customer,
      BankAccount,
      Mandate,
      Payment,
      PaymentPlan,
      Wallet,
      WalletBalance,
      LedgerEntry,
      Payout,
      CryptoWallet,
      WebhookEvent,
      AuditLog,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
