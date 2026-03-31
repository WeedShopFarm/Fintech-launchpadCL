-- Fix 1: Explicit deny policies for wallets write operations
CREATE POLICY "No client inserts on wallets" ON public.wallets FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "No client updates on wallets" ON public.wallets FOR UPDATE TO authenticated USING (false);
CREATE POLICY "No client deletes on wallets" ON public.wallets FOR DELETE TO authenticated USING (false);

-- Fix 2: Explicit deny policies for user_roles write operations
CREATE POLICY "No client inserts on user_roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "No client updates on user_roles" ON public.user_roles FOR UPDATE TO authenticated USING (false);
CREATE POLICY "No client deletes on user_roles" ON public.user_roles FOR DELETE TO authenticated USING (false);