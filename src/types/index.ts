export type UserRole = 'admin' | 'business' | 'sub_user';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  business_id?: string;
  full_name: string;
}

export interface Business {
  id: string;
  name: string;
  country: string;
  created_at: string;
}

export interface BankAccount {
  id: string;
  business_id: string;
  iban: string;
  bank_name: string;
  is_primary: boolean;
  is_verified: boolean;
  status: 'pending' | 'verified' | 'failed';
  created_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  email: string;
  iban: string;
  created_at: string;
}

export interface Mandate {
  id: string;
  customer_id: string;
  status: 'pending' | 'active' | 'cancelled' | 'expired';
  gocardless_id: string;
  created_at: string;
}

export interface PaymentPlan {
  id: string;
  customer_id: string;
  mandate_id: string;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  start_date: string;
  status: 'active' | 'paused' | 'completed';
  next_payment_date: string;
}

export interface Payment {
  id: string;
  plan_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  available_balance: number;
  pending_balance: number;
  reserved_balance: number;
  currency: string;
}

export interface LedgerEntry {
  id: string;
  wallet_id: string;
  type: 'credit' | 'debit';
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  source: 'gocardless' | 'crypto' | 'stripe' | 'manual' | 'iban_payout';
  reference_id: string;
  description: string;
  created_at: string;
}

export interface Payout {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: 'crypto' | 'iban' | 'stripe';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  destination: string;
  created_at: string;
}

export interface CryptoWallet {
  id: string;
  user_id: string;
  address: string;
  network: 'ethereum' | 'polygon' | 'bitcoin';
  label: string;
}
