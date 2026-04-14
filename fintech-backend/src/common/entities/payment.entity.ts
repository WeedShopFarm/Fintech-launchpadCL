import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Business } from './business.entity';
import { Customer } from './customer.entity';
import { PaymentPlan } from './payment-plan.entity';
import { Mandate } from './mandate.entity';
import { BankAccount } from './bank-account.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  businessId: string;

  @Column({ type: 'uuid', nullable: true })
  customerId: string;

  @Column({ type: 'uuid', nullable: true })
  paymentPlanId: string;

  @Column({ type: 'uuid', nullable: true })
  mandateId: string;

  @Column({ type: 'uuid', nullable: true })
  bankAccountId: string;

  @Column({ type: 'varchar', length: 20 })
  provider: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerPaymentId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  providerStatus: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 20, enum: ['pending', 'processing', 'paid', 'failed', 'refunded', 'charged_back'] })
  status: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  feeAmount: number;

  @Column({ type: 'varchar', length: 3, nullable: true })
  feeCurrency: string;

  @Column({ type: 'timestamp', nullable: true })
  collectedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt: Date;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Business, (business) => business.payments, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @ManyToOne(() => Customer, (customer) => customer.payments, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @ManyToOne(() => PaymentPlan, (paymentPlan) => paymentPlan.payments, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'paymentPlanId' })
  paymentPlan: PaymentPlan;

  @ManyToOne(() => Mandate, (mandate) => mandate.payments, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'mandateId' })
  mandate: Mandate;

  @ManyToOne(() => BankAccount, (bankAccount) => bankAccount.payments, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'bankAccountId' })
  bankAccount: BankAccount;
}
