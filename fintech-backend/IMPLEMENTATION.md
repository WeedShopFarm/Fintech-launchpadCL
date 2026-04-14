# AutoCollect Fintech MVP - Backend Setup Guide

## Project Overview

Production-ready NestJS fintech backend with hybrid payment orchestration supporting Yapily, GoCardless, and Stripe across US, EU, UK, and other regions.

## Architecture Components

### 1. **Payment Orchestration Engine**
- Smart routing based on region, bank support, and transaction characteristics
- EU: Yapily A2A (instant) → GoCardless SEPA DD (fallback)
- UK: Yapily A2A (instant) → GoCardless Bacs DD (fallback)
- US: Stripe ACH + Financial Connections → Stripe Card (fallback)
- Other: GoCardless regional schemes (PAD, BECS, Autogiro, etc.)

### 2. **Provider Integration**
- **Stripe**: ACH payments, card transfers, instant verification
- **Yapily**: Account-to-account transfers, open banking, instant settlements
- **GoCardless**: Direct debit mandates, recurring payments, multiple schemes

### 3. **Core Modules**
- `auth/` - JWT authentication, user registration/login
- `providers/` - Payment provider services and orchestration
- `payments/` - Payment creation, processing, status tracking
- `mandates/` - DD mandate management
- `bank-accounts/` - Bank account verification and management
- `wallets/` - Wallet and ledger management
- `webhooks/` - Provider webhook handlers

## Setup Instructions

### Prerequisites
```bash
Node.js 18+
PostgreSQL 14+
Redis 7+
```

### 1. Install Dependencies
```bash
cd fintech-backend
npm install
# or
bun install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your credentials:
# - Database credentials
# - API keys (Stripe, Yapily, GoCardless)
# - JWT secrets
# - Webhook secrets
```

### 3. Database Setup
```bash
# Create database
createdb autocollect

# Run migrations
npm run migration:run

# Or sync entities (development only)
npm run typeorm:run
```

### 4. Start Development Server
```bash
npm run start:dev

# Server runs on: http://localhost:3000
```

## API Endpoints

### Authentication
```
POST   /api/auth/register     - User registration
POST   /api/auth/login        - User login
POST   /api/auth/refresh      - Refresh token
POST   /api/auth/logout       - Logout
GET    /api/auth/me           - Get current user (authenticated)
```

### Bank Accounts
```
POST   /api/bank-accounts                  - Add bank account
GET    /api/bank-accounts                  - List bank accounts
GET    /api/bank-accounts/:id              - Get bank account
DELETE /api/bank-accounts/:id              - Remove bank account
POST   /api/bank-accounts/:id/verify       - Verify account
GET    /api/bank-accounts/:id/balance      - Get account balance
```

### Mandates (Direct Debit)
```
POST   /api/mandates                       - Create mandate
GET    /api/mandates                       - List mandates
GET    /api/mandates/:id                   - Get mandate
POST   /api/mandates/:id/cancel            - Cancel mandate
```

### Payments
```
POST   /api/payments/one-time              - One-time payment
POST   /api/payments/recurring             - Recurring payment
GET    /api/payments                       - List payments
GET    /api/payments/:id                   - Get payment
POST   /api/payments/:id/retry             - Retry payment
POST   /api/payments/:id/refund            - Refund payment
```

### Wallets
```
GET    /api/wallets/balance                - Get wallet balance
GET    /api/wallets/transactions           - Get ledger entries
POST   /api/payouts/crypto                 - Crypto payout
POST   /api/payouts/bank                   - Bank payout
GET    /api/payouts                        - List payouts
GET    /api/payouts/:id                    - Get payout
```

### Webhooks
```
POST   /api/webhooks/stripe                - Stripe webhook
POST   /api/webhooks/yapily                - Yapily webhook
POST   /api/webhooks/gocardless            - GoCardless webhook
```

## Database Schema

### Core Entities
- **users** - System users
- **businesses** - Business accounts
- **customers** - Business customers
- **bank_accounts** - Linked bank accounts
- **mandates** - Direct debit mandates
- **payments** - Payment transactions
- **payment_plans** - Recurring payment plans
- **wallets** - User/business wallets
- **wallet_balances** - Current balance tracking
- **ledger_entries** - Immutable transaction log
- **payouts** - Withdrawal transactions
- **crypto_wallets** - Crypto addresses
- **webhook_events** - Webhook log
- **audit_logs** - Action audit trail

## Payment Flow Example

```typescript
// 1. User adds bank account (via Yapily/Stripe/manual)
POST /api/bank-accounts

// 2. Create mandate (for recurring payments)
POST /api/mandates

// 3. Initiate payment (orchestrator routes automatically)
POST /api/payments/one-time

// 4. Wait for webhook updates
// Webhooks automatically update payment status

// 5. Payment appears in ledger
GET /api/wallets/transactions
```

## Configuration

### Environment Variables
See `.env.example` for complete list. Key variables:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost/autocollect

# JWT
JWT_SECRET=your-32-char-minimum-secret-key
JWT_REFRESH_SECRET=your-32-char-minimum-secret-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Yapily
YAPILY_APPLICATION_ID=your-app-id
YAPILY_SECRET_KEY=your-secret-key
YAPILY_ENVIRONMENT=sandbox

# GoCardless
GOCARDLESS_ACCESS_TOKEN=your-token
GOCARDLESS_ENVIRONMENT=sandbox
GOCARDLESS_CREDITOR_ID=CR123456789
```

## Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run coverage
npm run test:cov

# Run E2E tests
npm run test:e2e
```

## Deployment

### Docker Build
```bash
docker build -t fintech-backend:latest .
docker run -p 3000:3000 --env-file .env fintech-backend:latest
```

### Production Checklist
- [ ] Database backups enabled
- [ ] Redis persistence configured
- [ ] SSL/TLS certificates installed
- [ ] Rate limiting enabled
- [ ] Health check endpoints available
- [ ] Monitoring and logging setup
- [ ] Webhook secret keys secured
- [ ] API key rotation scheduled
- [ ] Database encryption enabled
- [ ] Audit logs enabled

## Monitoring & Logging

Health check endpoints:
```bash
GET /health              - Basic health
GET /ready               - Readiness probe
GET /metrics             - Prometheus metrics
```

Logs include:
- Request/response logging
- Payment processing logs
- Webhook processing logs
- Error tracking
- Audit logs for all mutations

## Security Features

- JWT token-based authentication
- Password hashing (bcrypt)
- Input validation (class-validator)
- CORS protection
- Helmet security headers
- Rate limiting
- SQL injection protection (TypeORM)
- HTTPS/TLS support
- Webhook signature verification

## Payment Status Normalization

All providers normalized to unified statuses:
- `pending` - Awaiting processing
- `processing` - Being processed  
- `paid` - Successfully collected
- `failed` - Payment failed
- `refunded` - Refund issued
- `charged_back` - Chargeback initiated

## Error Handling

All errors return standardized JSON:
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "BadRequest"
}
```

## Support

For issues or questions:
1. Check logs: `logs/` directory
2. Review webhook events: `webhook_events` table
3. Check audit logs: `audit_logs` table
4. Verify provider API status
5. Check provider webhook logs

## License

MIT
