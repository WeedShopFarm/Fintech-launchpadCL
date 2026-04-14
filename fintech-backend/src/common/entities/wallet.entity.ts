import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Business } from './business.entity';
import { WalletBalance } from './wallet-balance.entity';
import { LedgerEntry } from './ledger-entry.entity';
import { Payout } from './payout.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  businessId: string;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Business, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @OneToOne(() => WalletBalance, (balance) => balance.wallet, { cascade: true })
  balance: WalletBalance;

  @OneToMany(() => LedgerEntry, (entry) => entry.wallet, { cascade: true })
  ledgerEntries: LedgerEntry[];

  @OneToMany(() => Payout, (payout) => payout.wallet, { cascade: true })
  payouts: Payout[];
}
