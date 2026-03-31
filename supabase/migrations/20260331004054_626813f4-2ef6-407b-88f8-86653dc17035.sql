
-- Drop the client-side INSERT policy on ledger_entries (should only be created by edge functions)
DROP POLICY IF EXISTS "Users can insert own ledger" ON ledger_entries;

-- Deny UPDATE and DELETE on ledger_entries for all authenticated users
CREATE POLICY "No updates on ledger entries" ON ledger_entries FOR UPDATE TO authenticated USING (false);
CREATE POLICY "No deletes on ledger entries" ON ledger_entries FOR DELETE TO authenticated USING (false);
