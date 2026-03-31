
-- 1. Drop the wallet UPDATE policy so users cannot modify balances directly
DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;

-- 2. Drop the direct INSERT policy on payouts
DROP POLICY IF EXISTS "Users can create own payouts" ON payouts;

-- 3. Add CHECK constraint to prevent zero/negative payout amounts
ALTER TABLE payouts ADD CONSTRAINT payouts_amount_positive CHECK (amount > 0);
