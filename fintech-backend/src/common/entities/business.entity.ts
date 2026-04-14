import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Customer } from './customer.entity';
import { BankAccount } from './bank-account.entity';
import { Mandate } from './mandate.entity';
import { Payment } from './payment.entity';
import { PaymentPlan } from './payment-plan.entity';

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 2 })
  country: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  taxId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeAccountId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  wiseProfileId: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.businesses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Customer, (customer) => customer.business, { cascade: true })
  customers: Customer[];

  @OneToMany(() => BankAccount, (bankAccount) => bankAccount.business, { cascade: true })
  bankAccounts: BankAccount[];

  @OneToMany(() => Mandate, (mandate) => mandate.business, { cascade: true })
  mandates: Mandate[];

  @OneToMany(() => Payment, (payment) => payment.business, { cascade: true })
  payments: Payment[];

  @OneToMany(() => PaymentPlan, (paymentPlan) => paymentPlan.business, { cascade: true })
  paymentPlans: PaymentPlan[];
}
