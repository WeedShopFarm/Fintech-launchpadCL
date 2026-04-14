CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'business', 'sub_user')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  country VARCHAR(2) NOT NULL,
  tax_id VARCHAR(50),
  stripe_account_id VARCHAR(255),
  wise_profile_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(2) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('stripe', 'yapily', 'gocardless', 'manual')),
  provider_account_id VARCHAR(255),
  provider_institution_id VARCHAR(255),
  provider_consent_id VARCHAR(255),
  bank_name VARCHAR(255),
  account_holder_name VARCHAR(255),
  account_type VARCHAR(20) CHECK (account_type IN ('checking', 'savings', 'business')),
  country_code VARCHAR(2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  routing_number VARCHAR(9),
  account_number_last4 VARCHAR(4),
  iban VARCHAR(34),
  sort_code VARCHAR(8),
  is_verified BOOLEAN DEFAULT false,
  verification_method VARCHAR(50),
  verified_at TIMESTAMP,
  permissions JSONB,
  consent_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE mandates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  provider_mandate_id VARCHAR(255) NOT NULL,
  scheme VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'failed')),
  is_vrp BOOLEAN DEFAULT false,
  vrp_max_amount DECIMAL(15,2),
  vrp_currency VARCHAR(3),
  created_at TIMESTAMP DEFAULT now(),
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,
  cancelled_at TIMESTAMP
);

CREATE TABLE payment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  mandate_id UUID REFERENCES mandates(id),
  name VARCHAR(255),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id),
  customer_id UUID REFERENCES customers(id),
  payment_plan_id UUID REFERENCES payment_plans(id),
  mandate_id UUID REFERENCES mandates(id),
  bank_account_id UUID REFERENCES bank_accounts(id),
  provider VARCHAR(20) NOT NULL,
  provider_payment_id VARCHAR(255),
  provider_status VARCHAR(50),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'charged_back')),
  fee_amount DECIMAL(15,2) DEFAULT 0,
  fee_currency VARCHAR(3),
  collected_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  currency VARCHAR(3) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE wallet_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  available_balance DECIMAL(15,2) DEFAULT 0,
  pending_balance DECIMAL(15,2) DEFAULT 0,
  reserved_balance DECIMAL(15,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('credit', 'debit')),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed', 'reversed')),
  source VARCHAR(50) NOT NULL,
  source_id UUID,
  reference_id VARCHAR(255),
  previous_balance DECIMAL(15,2),
  new_balance DECIMAL(15,2),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  method VARCHAR(20) NOT NULL CHECK (method IN ('crypto', 'stripe', 'wise')),
  destination TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  crypto_network VARCHAR(20),
  crypto_transaction_hash VARCHAR(255),
  stripe_transfer_id VARCHAR(255),
  wise_transfer_id VARCHAR(255),
  fee_amount DECIMAL(15,2) DEFAULT 0,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE crypto_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  address VARCHAR(255) NOT NULL,
  network VARCHAR(20) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_id VARCHAR(255) UNIQUE,
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  processing_errors TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  entity_type VARCHAR(50),
  entity_id UUID,
  action VARCHAR(100),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_bank_accounts_customer_id ON bank_accounts(customer_id);
CREATE INDEX idx_bank_accounts_provider_account_id ON bank_accounts(provider_account_id);
CREATE INDEX idx_mandates_customer_id ON mandates(customer_id);
CREATE INDEX idx_mandates_provider_mandate_id ON mandates(provider_mandate_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_provider_payment_id ON payments(provider_payment_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_ledger_entries_wallet_id ON ledger_entries(wallet_id);
CREATE INDEX idx_ledger_entries_created_at ON ledger_entries(created_at);
CREATE INDEX idx_webhook_events_provider_event_id ON webhook_events(provider, event_id);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
