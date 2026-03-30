import { useWallet, useLedgerEntries } from '@/hooks/useBusinessData';
import { Badge } from '@/components/ui/badge';
import { Wallet as WalletIcon, Clock, Lock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const WalletPage = () => {
  const { data: wallet, isLoading: wLoading } = useWallet();
  const { data: ledger, isLoading: lLoading } = useLedgerEntries();

  if (wLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
        <p className="text-sm text-muted-foreground mt-1">Your internal ledger balances</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Available', value: wallet?.available_balance ?? 0, icon: WalletIcon, cls: 'text-success' },
          { label: 'Pending', value: wallet?.pending_balance ?? 0, icon: Clock, cls: 'text-warning' },
          { label: 'Reserved', value: wallet?.reserved_balance ?? 0, icon: Lock, cls: 'text-muted-foreground' },
        ].map(b => (
          <motion.div key={b.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <b.icon className={`w-4 h-4 ${b.cls}`} />
              <span className="text-xs text-muted-foreground">{b.label}</span>
            </div>
            <p className={`text-2xl font-bold font-mono ${b.cls}`}>€{Number(b.value).toLocaleString()}</p>
          </motion.div>
        ))}
      </div>

      <div className="glass-card rounded-xl p-4 md:p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Ledger History</h2>
        {lLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (ledger ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No ledger entries yet.</p>
        ) : (
          <div className="space-y-2">
            {(ledger ?? []).map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${entry.type === 'credit' ? 'bg-success' : 'bg-warning'}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{entry.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{entry.source}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-sm font-mono font-medium shrink-0 ml-3 ${entry.type === 'credit' ? 'text-success' : 'text-foreground'}`}>
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

export default WalletPage;
