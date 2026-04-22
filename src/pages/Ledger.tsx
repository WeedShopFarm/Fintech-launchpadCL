import { useMemo, useState } from 'react';
import { useLedgerEntries, usePayments, usePayouts } from '@/hooks/useBusinessData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2, ScrollText } from 'lucide-react';
import { motion } from 'framer-motion';

type Row = {
  id: string;
  kind: 'payment' | 'payout' | 'ledger';
  date: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  source: string;
  reference?: string | null;
};

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (['confirmed', 'paid_out', 'completed', 'submitted'].includes(s)) return 'default';
  if (['failed', 'cancelled', 'expired'].includes(s)) return 'destructive';
  if (['pending', 'processing'].includes(s)) return 'secondary';
  return 'outline';
};

const LedgerPage = () => {
  const { data: payments, isLoading: pLoading } = usePayments();
  const { data: payouts, isLoading: poLoading } = usePayouts();
  const { data: ledger, isLoading: lLoading } = useLedgerEntries();
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const rows = useMemo<Row[]>(() => {
    const mapped: Row[] = [];
    (payments ?? []).forEach((p: any) => mapped.push({
      id: `pay-${p.id}`, kind: 'payment', date: p.created_at,
      description: `Payment ${p.payment_plans?.customers?.name ?? ''}`.trim(),
      amount: Number(p.amount), currency: p.currency, status: p.status,
      source: p.gocardless_payment_id ? 'gocardless' : 'stripe',
      reference: p.gocardless_payment_id ?? p.stripe_payment_intent_id,
    }));
    (payouts ?? []).forEach((p: any) => mapped.push({
      id: `out-${p.id}`, kind: 'payout', date: p.created_at,
      description: `Payout via ${p.method}`, amount: Number(p.amount),
      currency: p.currency, status: p.status, source: p.method, reference: p.destination,
    }));
    (ledger ?? []).forEach((l: any) => mapped.push({
      id: `led-${l.id}`, kind: 'ledger', date: l.created_at,
      description: l.description, amount: Number(l.amount) * (l.type === 'debit' ? -1 : 1),
      currency: 'EUR', status: l.status, source: l.source, reference: l.reference_id,
    }));
    return mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, payouts, ledger]);

  const filtered = rows.filter(r => {
    if (kindFilter !== 'all' && r.kind !== kindFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search && !`${r.description} ${r.reference ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const exportCsv = () => {
    const headers = ['date', 'kind', 'description', 'amount', 'currency', 'status', 'source', 'reference'];
    const csv = [headers.join(',')]
      .concat(filtered.map(r => [
        new Date(r.date).toISOString(), r.kind,
        `"${(r.description ?? '').replace(/"/g, '""')}"`,
        r.amount, r.currency, r.status, r.source,
        `"${(r.reference ?? '').replace(/"/g, '""')}"`,
      ].join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const isLoading = pLoading || poLoading || lLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-primary" /> Payment Ledger
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Unified timeline of payments, payouts and ledger entries</p>
        </div>
        <Button onClick={exportCsv} variant="outline" size="sm" disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4 md:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input placeholder="Search description or reference" value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="payment">Payments</SelectItem>
              <SelectItem value="payout">Payouts</SelectItem>
              <SelectItem value="ledger">Ledger entries</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No entries match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 px-2">Date</th>
                  <th className="py-2 px-2">Type</th>
                  <th className="py-2 px-2">Description</th>
                  <th className="py-2 px-2">Source</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="py-2 px-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.date).toLocaleString()}</td>
                    <td className="py-2 px-2"><Badge variant="outline" className="text-[10px] capitalize">{r.kind}</Badge></td>
                    <td className="py-2 px-2 text-foreground">{r.description}</td>
                    <td className="py-2 px-2 text-xs text-muted-foreground capitalize">{r.source}</td>
                    <td className="py-2 px-2"><Badge variant={statusVariant(r.status)} className="text-[10px] capitalize">{r.status}</Badge></td>
                    <td className={`py-2 px-2 text-right font-mono ${r.amount < 0 ? 'text-warning' : 'text-success'}`}>
                      {r.amount < 0 ? '-' : '+'}{r.currency === 'USD' ? '$' : '€'}{Math.abs(r.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default LedgerPage;
