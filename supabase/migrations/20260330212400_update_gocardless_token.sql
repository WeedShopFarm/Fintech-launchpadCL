-- Update GoCardless access token for sandbox
UPDATE public.businesses
SET gocardless_access_token = 'sandbox_gmDpWqCdix7foDRixM-tt18waksc6SGZAykQOwFn'
WHERE gocardless_access_token IS NULL OR gocardless_access_token = '';