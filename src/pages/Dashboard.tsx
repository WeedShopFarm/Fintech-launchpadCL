import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Users, FileText, ArrowUpRight, ArrowDownRight, Loader2, Link, CheckCircle } from 'lucide-react';
import { useWallet, useCustomers, useMandates, useLedgerEntries, useBusiness } from '@/hooks/useBusinessData';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const StatCard = ({ label, value, icon: Icon, trend, trendUp }: { label: string; value: string; icon: any; trend?: string; trendUp?: boolean }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4 md:p-5">
    <div className="flex items-start justify-between mb-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      {trend && (
        <span className={`flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-success' : 'text-destructive'}`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </motion.div>
);

const Dashboard = () => {
  const { data: wallet, isLoading: wLoading } = useWallet();
  const { data: customers } = useCustomers();
  const { data: mandates } = useMandates();
  const { data: ledger, isLoading: lLoading } = useLedgerEntries();
  const { data: business } = useBusiness();

  const handleConnectGoCardless = () => {
    const clientId = import.meta.env.VITE_GOCARDLESS_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_GOCARDLESS_REDIRECT_URI;
    const scope = 'read_write';

    const authUrl = `https://connect-sandbox.gocardless.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;

    window.location.href = authUrl;
  };

  const recentLedger = (ledger ?? []).slice(0, 5);

  const chartData = (() => {
    if (!ledger?.length) return [];
    const months: Record<string, { collected: number; payouts: number }> = {};
    for (const e of ledger) {
      const d = new Date(e.created_at);
      const key = d.toLocaleString('en', { month: 'short', year: '2-digit' });
      if (!months[key]) months[key] = { collected: 0, payouts: 0 };
      if (e.type === 'credit') months[key].collected += Number(e.amount);
      else months[key].payouts += Number(e.amount);
    }
    return Object.entries(months).map(([month, v]) => ({ month, ...v }));
  })();

  if (wLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your collections & payouts</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Available Balance" value={`€${(wallet?.available_balance ?? 0).toLocaleString()}`} icon={Wallet} />
        <StatCard label="Pending" value={`€${(wallet?.pending_balance ?? 0).toLocaleString()}`} icon={TrendingUp} />
        <StatCard label="Customers" value={(customers?.length ?? 0).toString()} icon={Users} />
        <StatCard label="Active Mandates" value={(mandates?.filter((m: any) => m.status === 'active').length ?? 0).toString()} icon={FileText} />
      </div>

      {/* GoCardless Connection Status */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4 md:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {business?.gocardless_access_token ? (
              <CheckCircle className="w-5 h-5 text-success" />
            ) : (
              <Link className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {business?.gocardless_access_token ? 'GoCardless Connected' : 'Connect GoCardless'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {business?.gocardless_access_token
                  ? 'Your account is connected to GoCardless for payment processing'
                  : 'Connect your GoCardless account to start processing payments'
                }
              </p>
            </div>
          </div>
          {!business?.gocardless_access_token && (
            <Button onClick={handleConnectGoCardless} size="sm">
              Connect
            </Button>
          )}
        </div>
      </motion.div>

      {chartData.length > 0 && (
        <div className="glass-card rounded-xl p-4 md:p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Revenue Overview</h2>
          <div className="h-56 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(162, 72%, 46%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(162, 72%, 46%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 16%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(215, 12%, 50%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(215, 12%, 50%)' }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 18%, 9%)', border: '1px solid hsl(220, 14%, 16%)', borderRadius: '8px', color: 'hsl(210, 20%, 92%)' }} />
                <Area type="monotone" dataKey="collected" stroke="hsl(162, 72%, 46%)" fill="url(#colorCollected)" strokeWidth={2} />
                <Area type="monotone" dataKey="payouts" stroke="hsl(215, 12%, 50%)" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="glass-card rounded-xl p-4 md:p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h2>
        {lLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : recentLedger.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No activity yet. Start by adding customers and creating mandates.</p>
        ) : (
          <div className="space-y-3">
            {recentLedger.map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${entry.type === 'credit' ? 'bg-success' : 'bg-warning'}`} />
                  <div>
                    <p className="text-sm text-foreground">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-sm font-mono font-medium ${entry.type === 'credit' ? 'text-success' : 'text-foreground'}`}>
                  {entry.type === 'credit' ? '+' : '-'}€{Number(entry.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
