import type { BankAccount, Customer, Mandate, PaymentPlan, Payment, Wallet, LedgerEntry, Payout, CryptoWallet } from '@/types';

export const mockBankAccounts: BankAccount[] = [
  { id: '1', business_id: 'b1', iban: 'FR76 3000 6000 0112 3456 7890 189', bank_name: 'Qonto', is_primary: true, is_verified: true, status: 'verified', created_at: '2024-01-15' },
  { id: '2', business_id: 'b1', iban: 'DE89 3704 0044 0532 0130 00', bank_name: 'N26', is_primary: false, is_verified: true, status: 'verified', created_at: '2024-02-20' },
  { id: '3', business_id: 'b1', iban: 'GB29 NWBK 6016 1331 9268 19', bank_name: 'Wise', is_primary: false, is_verified: false, status: 'pending', created_at: '2024-03-01' },
];

export const mockCustomers: Customer[] = [
  { id: 'c1', business_id: 'b1', name: 'Marie Dupont', email: 'marie@example.com', iban: 'FR76 1234 5678 9012 3456 7890 123', created_at: '2024-01-20' },
  { id: 'c2', business_id: 'b1', name: 'Hans Mueller', email: 'hans@example.com', iban: 'DE89 3704 0044 0532 0130 00', created_at: '2024-02-10' },
  { id: 'c3', business_id: 'b1', name: 'Sofia Garcia', email: 'sofia@example.com', iban: 'ES91 2100 0418 4502 0005 1332', created_at: '2024-03-05' },
];

export const mockMandates: Mandate[] = [
  { id: 'm1', customer_id: 'c1', status: 'active', gocardless_id: 'MD_001234', created_at: '2024-01-22' },
  { id: 'm2', customer_id: 'c2', status: 'pending', gocardless_id: 'MD_001235', created_at: '2024-02-12' },
];

export const mockWallet: Wallet = {
  id: 'w1', user_id: 'u1', available_balance: 12450, pending_balance: 3200, reserved_balance: 500, currency: 'EUR',
};

export const mockLedgerEntries: LedgerEntry[] = [
  { id: 'l1', wallet_id: 'w1', type: 'credit', amount: 5000, status: 'confirmed', source: 'gocardless', reference_id: 'p1', description: 'SEPA collection – Marie Dupont', created_at: '2024-03-01' },
  { id: 'l2', wallet_id: 'w1', type: 'debit', amount: 2000, status: 'confirmed', source: 'crypto', reference_id: 'po1', description: 'Crypto payout – 0xABC...', created_at: '2024-03-02' },
];

export const mockPayouts: Payout[] = [
  { id: 'po1', user_id: 'u1', amount: 2000, currency: 'EUR', method: 'crypto', status: 'completed', destination: '0xABC123...DEF', created_at: '2024-03-02' },
];

export const mockCryptoWallets: CryptoWallet[] = [
  { id: 'cw1', user_id: 'u1', address: '0xABC123...DEF', network: 'ethereum', label: 'Main ETH Wallet' },
];
