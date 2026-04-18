import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePayments, useCustomers, useMandates, useCreatePayment } from '@/hooks/useBusinessData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { StripePaymentConfirmDialog } from '@/components/stripe/StripeUsBankDialogs';

const statusColors: Record<string, string> = {
  confirmed: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
  processing: 'bg-primary/10 text-primary border-primary/20',
};

const PaymentsPage = () => {
  const qc = useQueryClient();
  const { data: payments, isLoading } = usePayments();
  const { data: customers } = useCustomers();
  const { data: mandates } = useMandates();
  const createPayment = useCreatePayment();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [mandateId, setMandateId] = useState('');
  const [amount, setAmount] = useState('');
  const [scheme, setScheme] = useState('sepa');
  const [stripeSecret, setStripeSecret] = useState<string | null>(null);
  const [stripeOpen, setStripeOpen] = useState(false);

  const customerMandates = (mandates ?? []).filter(
    (m: any) =>
      m.customer_id === customerId &&
      m.gocardless_id &&
      !['cancelled', 'failed', 'expired'].includes(String(m.status)),
  );

  const resetForm = () => {
    setCustomerId('');
    setMandateId('');
    setAmount('');
    setScheme('sepa');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !amount) {
      toast.error('Select a customer and enter an amount');
      return;
    }
    if (scheme === 'ach' && !mandateId) {
      toast.error('ACH requires a mandate', { description: 'Create an ACH mandate for this customer, then select it here.' });
      return;
    }
    const cust = (customers ?? []).find((c: any) => c.id === customerId);
    if (scheme === 'ach_stripe' && !cust?.stripe_us_bank_payment_method_id) {
      toast.error('Stripe ACH requires a linked US bank account', { description: 'Use Customers → Link Stripe bank for this customer first.' });
      return;
    }
    try {
      const result = await createPayment.mutateAsync({
        customer_id: customerId,
        amount: parseFloat(amount),
        scheme,
        mandate_id: mandateId || undefined,
      });
      if (result.stripe_client_secret) {
        setStripeSecret(result.stripe_client_secret);
        setStripeOpen(true);
        setOpen(false);
        toast.message('Authorize the debit', { description: 'Complete the Stripe step to submit this ACH payment.' });
        resetForm();
      } else {
        toast.success('Payment created');
        setOpen(false);
        resetForm();
      }
    } catch (err: any) {
      toast.error('Failed to create payment', { description: err.message });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <StripePaymentConfirmDialog
        open={stripeOpen}
        onOpenChange={(v) => {
          setStripeOpen(v);
          if (!v) setStripeSecret(null);
        }}
        clientSecret={stripeSecret}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ['payments'] });
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">SEPA, GoCardless ACH, or Stripe ACH (Financial Connections)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Create Payment</Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border">
            <DialogHeader><DialogTitle>Create Payment</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setMandateId(''); }}>
                  <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {(customers ?? []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} – {c.email}
                        {c.stripe_us_bank_payment_method_id ? ' · Stripe' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {customerId && scheme !== 'ach_stripe' && (
                <div className="space-y-2">
                  <Label>{scheme === 'ach' ? 'Mandate (required for ACH)' : 'Mandate (optional for SEPA)'}</Label>
                  {customerMandates.length === 0 ? (
                    <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/40 px-3 py-2">
                      No GoCardless-linked mandates for this customer yet. Create a mandate on the Mandates page (use ACH + US bank details for USD).
                    </p>
                  ) : (
                    <Select value={mandateId} onValueChange={setMandateId}>
                      <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Select mandate" /></SelectTrigger>
                      <SelectContent>
                        {customerMandates.map((m: any) => (
                          <SelectItem key={m.id} value={m.id}>{m.gocardless_id || m.id.slice(0, 8)} ({m.status})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Scheme</Label>
                <Select value={scheme} onValueChange={setScheme}>
                  <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sepa">SEPA (EUR)</SelectItem>
                    <SelectItem value="ach">ACH — GoCardless (USD)</SelectItem>
                    <SelectItem value="ach_stripe">ACH — Stripe Financial Connections (USD)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {scheme === 'sepa' && 'Collect EUR via SEPA Direct Debit.'}
                  {scheme === 'ach' && 'Collect USD via GoCardless ACH using an active mandate.'}
                  {scheme === 'ach_stripe' && 'Collect USD via Stripe using a customer who has completed “Link Stripe bank”.'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Amount ({scheme === 'sepa' ? 'EUR' : 'USD'})</Label>
                <Input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100.00" required className="bg-muted border-border font-mono" />
              </div>
              <Button className="w-full" disabled={createPayment.isPending}>
                {createPayment.isPending ? 'Creating...' : 'Create Payment'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(payments ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No payments yet. Create one by selecting a customer with an active mandate.</p>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Currency</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).map((payment: any, i: number) => {
                  const customerName = payment.payment_plans?.customers?.name ?? '—';
                  return (
                    <motion.tr key={payment.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-foreground">{customerName}</td>
                      <td className="px-4 py-3 font-mono text-foreground">{payment.currency === 'USD' ? '$' : '€'}{Number(payment.amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{payment.currency}</td>
                      <td className="px-4 py-3"><Badge className={statusColors[payment.status] ?? ''}>{payment.status}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(payment.created_at).toLocaleDateString()}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;
