import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Wallet } from './wallet.entity';

@Entity('payouts')
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  walletId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 20, enum: ['crypto', 'stripe', 'wise'] })
  method: string;

  @Column({ type: 'text' })
  destination: string;

  @Column({ type: 'varchar', length: 20, enum: ['pending', 'processing', 'completed', 'failed'] })
  status: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  cryptoNetwork: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cryptoTransactionHash: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeTransferId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  wiseTransferId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  feeAmount: number;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt: Date;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Wallet, (wallet) => wallet.payouts, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;
}
