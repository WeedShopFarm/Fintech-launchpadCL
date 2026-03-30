import { useState } from 'react';
import { usePayouts, useCreatePayout, useWallet, useBankAccounts, useCryptoWallets } from '@/hooks/useBusinessData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowUpRight, Bitcoin, Building2, CreditCard, Plus, Loader2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  completed: 'bg-success/10 text-success border-success/20',
  processing: 'bg-warning/10 text-warning border-warning/20',
  pending: 'bg-muted text-muted-foreground',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
};

const methodIcons: Record<string, any> = { crypto: Bitcoin, iban: Building2, stripe: CreditCard };

const PayoutsPage = () => {
  const { data: payouts, isLoading } = usePayouts();
  const { data: wallet } = useWallet();
  const { data: bankAccounts } = useBankAccounts();
  const { data: cryptoWallets } = useCryptoWallets();
  const createPayout = useCreatePayout();
  const [method, setMethod] = useState('crypto');
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [open, setOpen] = useState(false);

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !destination) {
      toast.error('Fill all fields');
      return;
    }
    try {
      await createPayout.mutateAsync({ amount: parseFloat(amount), method, destination });
      toast.success('Payout request submitted');
      setOpen(false);
      setAmount('');
      setDestination('');
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payouts</h1>
          <p className="text-sm text-muted-foreground mt-1">Withdraw to crypto, IBAN, or Stripe</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />New Payout</Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border">
            <DialogHeader><DialogTitle>Request Payout</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={handlePayout}>
              <div className="glass-card rounded-lg p-3 bg-muted/50">
                <p className="text-xs text-muted-foreground">Available balance</p>
                <p className="text-lg font-bold font-mono text-success">€{Number(wallet?.available_balance ?? 0).toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label>Amount (EUR)</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="1000" required className="bg-muted border-border font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Payout Method</Label>
                <Select value={method} onValueChange={v => { setMethod(v); setDestination(''); }}>
                  <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crypto">
                      <span className="flex items-center gap-2">
                        <Bitcoin className="w-3 h-3" /> Crypto Wallet
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] ml-1">Recommended</Badge>
                      </span>
                    </SelectItem>
                    <SelectItem value="iban">External IBAN</SelectItem>
                    <SelectItem value="stripe">Stripe Connect</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {method === 'crypto' && (
                <div className="space-y-2">
                  <Label>Destination Wallet</Label>
                  {(cryptoWallets ?? []).length > 0 ? (
                    <Select value={destination} onValueChange={setDestination}>
                      <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Select wallet" /></SelectTrigger>
                      <SelectContent>
                        {(cryptoWallets ?? []).map((w: any) => (
                          <SelectItem key={w.id} value={w.address}>{w.label} ({w.network})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={destination} onChange={e => setDestination(e.target.value)} placeholder="0xABC..." className="bg-muted border-border font-mono text-sm" />
                  )}
                </div>
              )}
              {method === 'iban' && (
                <div className="space-y-2">
                  <Label>Destination IBAN</Label>
                  {(bankAccounts ?? []).filter((a: any) => !a.is_primary && a.is_verified).length > 0 ? (
                    <Select value={destination} onValueChange={setDestination}>
                      <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Select IBAN" /></SelectTrigger>
                      <SelectContent>
                        {(bankAccounts ?? []).filter((a: any) => !a.is_primary && a.is_verified).map((a: any) => (
                          <SelectItem key={a.id} value={a.iban}>{a.bank_name} – {a.iban.slice(-8)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={destination} onChange={e => setDestination(e.target.value)} placeholder="DE89 3704 ..." className="bg-muted border-border font-mono text-sm" />
                  )}
                </div>
              )}
              {method === 'stripe' && (
                <div className="space-y-2">
                  <Label>Stripe Account ID</Label>
                  <Input value={destination} onChange={e => setDestination(e.target.value)} placeholder="acct_123..." className="bg-muted border-border font-mono text-sm" />
                </div>
              )}
              <Button className="w-full" disabled={createPayout.isPending}>
                {createPayout.isPending ? 'Submitting...' : 'Submit Payout Request'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(payouts ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No payouts yet.</p>
      ) : (
        <div className="space-y-2">
          {(payouts ?? []).map((payout: any, i: number) => {
            const Icon = methodIcons[payout.method] ?? ArrowUpRight;
            return (
              <motion.div key={payout.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">€{Number(payout.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">{payout.destination}</p>
                    <p className="text-xs text-muted-foreground">{new Date(payout.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Badge className={statusColors[payout.status] ?? ''}>{payout.status}</Badge>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PayoutsPage;
