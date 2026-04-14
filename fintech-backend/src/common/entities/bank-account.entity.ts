import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { Business } from './business.entity';
import { Mandate } from './mandate.entity';
import { Payment } from './payment.entity';

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  customerId: string;

  @Column({ type: 'uuid', nullable: true })
  businessId: string;

  @Column({ type: 'varchar', length: 20, enum: ['stripe', 'yapily', 'gocardless', 'manual'] })
  provider: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerAccountId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerInstitutionId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerConsentId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bankName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  accountHolderName: string;

  @Column({ type: 'varchar', length: 20, nullable: true, enum: ['checking', 'savings', 'business'] })
  accountType: string;

  @Column({ type: 'varchar', length: 2 })
  countryCode: string;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 9, nullable: true })
  routingNumber: string;

  @Column({ type: 'varchar', length: 4, nullable: true })
  accountNumberLast4: string;

  @Column({ type: 'varchar', length: 34, nullable: true })
  iban: string;

  @Column({ type: 'varchar', length: 8, nullable: true })
  sortCode: string;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  verificationMethod: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  permissions: any;

  @Column({ type: 'timestamp', nullable: true })
  consentExpiresAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Customer, (customer) => customer.bankAccounts, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @ManyToOne(() => Business, (business) => business.bankAccounts, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @OneToMany(() => Mandate, (mandate) => mandate.bankAccount, { cascade: true })
  mandates: Mandate[];

  @OneToMany(() => Payment, (payment) => payment.bankAccount, { cascade: true })
  payments: Payment[];
}
