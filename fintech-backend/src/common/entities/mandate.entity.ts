import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Business } from './business.entity';
import { Customer } from './customer.entity';
import { BankAccount } from './bank-account.entity';
import { Payment } from './payment.entity';
import { PaymentPlan } from './payment-plan.entity';

@Entity('mandates')
export class Mandate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  businessId: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @Column({ type: 'uuid' })
  bankAccountId: string;

  @Column({ type: 'varchar', length: 20 })
  provider: string;

  @Column({ type: 'varchar', length: 255 })
  providerMandateId: string;

  @Column({ type: 'varchar', length: 20 })
  scheme: string;

  @Column({ type: 'varchar', length: 20, enum: ['pending', 'active', 'cancelled', 'expired', 'failed'] })
  status: string;

  @Column({ type: 'boolean', default: false })
  isVrp: boolean;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  vrpMaxAmount: number;

  @Column({ type: 'varchar', length: 3, nullable: true })
  vrpCurrency: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  activatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @ManyToOne(() => Business, (business) => business.mandates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @ManyToOne(() => Customer, (customer) => customer.mandates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @ManyToOne(() => BankAccount, (bankAccount) => bankAccount.mandates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bankAccountId' })
  bankAccount: BankAccount;

  @OneToMany(() => Payment, (payment) => payment.mandate, { cascade: true })
  payments: Payment[];

  @OneToMany(() => PaymentPlan, (paymentPlan) => paymentPlan.mandate, { cascade: true })
  paymentPlans: PaymentPlan[];
}
