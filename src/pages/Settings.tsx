import { useState, useEffect } from 'react';
import { useBusiness, useUpdateBusinessMode } from '@/hooks/useBusinessData';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const SettingsPage = () => {
  const { data: business, isLoading } = useBusiness();
  const updateMode = useUpdateBusinessMode();
  const [confirmLive, setConfirmLive] = useState(false);

  useEffect(() => {
    setConfirmLive(business?.mode === 'live');
  }, [business?.mode]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const isLive = business?.mode === 'live';

  const handleToggle = async (live: boolean) => {
    if (live && !confirm('Switch to LIVE mode? Real funds will move on the next payment. Make sure your live GoCardless app is approved and live secrets are configured.')) {
      return;
    }
    try {
      await updateMode.mutateAsync(live ? 'live' : 'sandbox');
      toast.success(`Switched to ${live ? 'LIVE' : 'SANDBOX'} mode`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to switch mode');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your business and provider environment</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Environment</h3>
              <Badge variant={isLive ? 'default' : 'secondary'} className="text-[10px] uppercase">{business?.mode}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Sandbox uses test credentials and no real funds move. Live uses production credentials and real money is collected and paid out.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sandbox</span>
            <Switch checked={isLive} onCheckedChange={handleToggle} disabled={updateMode.isPending} />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>

        {isLive ? (
          <div className="border border-success/30 bg-success/5 rounded-lg p-3 flex gap-2">
            <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">Live mode active. Edge functions will use live GoCardless and Stripe credentials.</p>
          </div>
        ) : (
          <div className="border border-warning/30 bg-warning/5 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="text-xs text-foreground space-y-1">
              <p>Before switching to live, complete the Go Live checklist:</p>
              <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                <li>Register live GoCardless OAuth app and add <code className="text-foreground">GOCARDLESS_LIVE_CLIENT_ID</code>, <code className="text-foreground">GOCARDLESS_LIVE_CLIENT_SECRET</code>, <code className="text-foreground">GOCARDLESS_LIVE_REDIRECT_URI</code> as secrets</li>
                <li>Swap Stripe test keys for live <code className="text-foreground">STRIPE_SECRET_KEY</code> and <code className="text-foreground">STRIPE_WEBHOOK_SECRET</code></li>
                <li>Update GoCardless and Stripe webhook URLs in their dashboards</li>
                <li>Re-connect GoCardless from the Dashboard after switching</li>
              </ul>
            </div>
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-2">Token Storage</h3>
        <p className="text-xs text-muted-foreground">
          GoCardless access tokens are stored encrypted in Supabase Vault and only readable by edge functions running with the service role.
          {business?.gocardless_token_secret_id ? ' Your token is currently stored securely.' : ' No token is currently stored — connect from the Dashboard.'}
        </p>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
