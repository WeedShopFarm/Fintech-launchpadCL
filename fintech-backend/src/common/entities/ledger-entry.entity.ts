import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Wallet } from './wallet.entity';

@Entity('ledger_entries')
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  walletId: string;

  @Column({ type: 'varchar', length: 10, enum: ['credit', 'debit'] })
  entryType: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 20, enum: ['pending', 'confirmed', 'failed', 'reversed'] })
  status: string;

  @Column({ type: 'varchar', length: 50 })
  source: string;

  @Column({ type: 'uuid', nullable: true })
  sourceId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  referenceId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  previousBalance: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  newBalance: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Wallet, (wallet) => wallet.ledgerEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;
}
