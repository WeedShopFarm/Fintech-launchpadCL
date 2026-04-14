import { Injectable } from '@nestjs/common';
import { Transaction } from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
    private transactions: Transaction[] = [];

    create(transaction: Transaction): Transaction {
        this.transactions.push(transaction);
        return transaction;
    }

    findAll(): Transaction[] {
        return this.transactions;
    }

    findOne(id: number): Transaction {
        return this.transactions.find(transaction => transaction.id === id);
    }

    update(id: number, updatedTransaction: Transaction): Transaction {
        const index = this.transactions.findIndex(transaction => transaction.id === id);
        if (index > -1) {
            this.transactions[index] = updatedTransaction;
            return updatedTransaction;
        }
        return null;
    }

    remove(id: number): void {
        this.transactions = this.transactions.filter(transaction => transaction.id !== id);
    }
}