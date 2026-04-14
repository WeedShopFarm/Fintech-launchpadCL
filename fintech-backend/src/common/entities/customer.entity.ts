import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Business } from './business.entity';
import { BankAccount } from './bank-account.entity';
import { Mandate } from './mandate.entity';
import { Payment } from './payment.entity';
import { PaymentPlan } from './payment-plan.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  businessId: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber: string;

  @Column({ type: 'text', nullable: true })
  addressLine1: string;

  @Column({ type: 'text', nullable: true })
  addressLine2: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode: string;

  @Column({ type: 'varchar', length: 2 })
  country: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Business, (business) => business.customers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @OneToMany(() => BankAccount, (bankAccount) => bankAccount.customer, { cascade: true })
  bankAccounts: BankAccount[];

  @OneToMany(() => Mandate, (mandate) => mandate.customer, { cascade: true })
  mandates: Mandate[];

  @OneToMany(() => Payment, (payment) => payment.customer, { cascade: true })
  payments: Payment[];

  @OneToMany(() => PaymentPlan, (paymentPlan) => paymentPlan.customer, { cascade: true })
  paymentPlans: PaymentPlan[];
}
