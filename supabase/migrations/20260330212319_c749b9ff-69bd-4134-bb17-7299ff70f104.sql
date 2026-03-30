
-- webhook_events is accessed only by service role in edge functions, but add a restrictive policy to satisfy linter
CREATE POLICY "No direct access to webhook events" ON public.webhook_events FOR SELECT TO authenticated USING (false);
