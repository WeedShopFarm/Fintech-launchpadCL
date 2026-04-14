import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mandate, BankAccount, Customer } from '../common/entities';
import { MandatesService } from './mandates.service';
import { MandatesController } from './mandates.controller';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [TypeOrmModule.forFeature([Mandate, BankAccount, Customer]), ProvidersModule],
  controllers: [MandatesController],
  providers: [MandatesService],
  exports: [MandatesService],
})
export class MandatesModule {}
