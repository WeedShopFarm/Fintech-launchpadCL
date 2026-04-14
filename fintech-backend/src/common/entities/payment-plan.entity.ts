import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Business } from './business.entity';
import { Customer } from './customer.entity';
import { Mandate } from './mandate.entity';
import { Payment } from './payment.entity';

@Entity('payment_plans')
export class PaymentPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  businessId: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @Column({ type: 'uuid', nullable: true })
  mandateId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 20, enum: ['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'] })
  frequency: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'varchar', length: 20, default: 'active', enum: ['active', 'paused', 'completed', 'cancelled'] })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Business, (business) => business.paymentPlans, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @ManyToOne(() => Customer, (customer) => customer.paymentPlans, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @ManyToOne(() => Mandate, (mandate) => mandate.paymentPlans, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'mandateId' })
  mandate: Mandate;

  @OneToMany(() => Payment, (payment) => payment.paymentPlan, { cascade: true })
  payments: Payment[];
}
