import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  accountId: number;

  @Column('decimal')
  amount: number;

  @Column()
  transactionType: string;

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;
}