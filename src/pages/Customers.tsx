import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCustomers, useAddCustomer, useMandates, useDeleteCustomer } from '@/hooks/useBusinessData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Loader2, Trash2, Landmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { StripeUsBankLinkDialog } from '@/components/stripe/StripeUsBankDialogs';

const emptyForm = { name: '', email: '', iban: '', us_account_number: '', us_routing_number: '' };

const CustomersPage = () => {
  const qc = useQueryClient();
  const { data: customers, isLoading } = useCustomers();
  const { data: mandates } = useMandates();
  const addCustomer = useAddCustomer();
  const deleteCustomer = useDeleteCustomer();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [accountKind, setAccountKind] = useState<'sepa' | 'us' | 'stripe'>('sepa');
  const [form, setForm] = useState(emptyForm);
  const [stripeLinkId, setStripeLinkId] = useState<string | null>(null);

  const filtered = (customers ?? []).filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  );

  const resetAddDialog = () => {
    setAccountKind('sepa');
    setForm(emptyForm);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (accountKind === 'sepa') {
        await addCustomer.mutateAsync({
          name: form.name,
          email: form.email,
          iban: form.iban,
        });
      } else if (accountKind === 'us') {
        await addCustomer.mutateAsync({
          name: form.name,
          email: form.email,
          iban: '',
          us_account_number: form.us_account_number,
          us_routing_number: form.us_routing_number,
        });
      } else {
        await addCustomer.mutateAsync({
          name: form.name,
          email: form.email,
          iban: '',
          use_stripe_us_bank: true,
        });
      }
      toast.success('Customer created');
      setOpen(false);
      resetAddDialog();
    } catch (err: any) {
      toast.error('Failed to create customer', { description: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer.mutateAsync(id);
      toast.success('Customer removed');
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <StripeUsBankLinkDialog
        open={!!stripeLinkId}
        onOpenChange={(v) => {
          if (!v) setStripeLinkId(null);
        }}
        customerId={stripeLinkId}
        onLinked={() => {
          qc.invalidateQueries({ queryKey: ['customers'] });
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">SEPA, GoCardless US ACH, or Stripe Financial Connections</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetAddDialog(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Customer</Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border">
            <DialogHeader><DialogTitle>Add New Customer</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2"><Label>Full Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Marie Dupont" required className="bg-muted border-border" /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="marie@example.com" required className="bg-muted border-border" /></div>

              <Tabs value={accountKind} onValueChange={(v) => setAccountKind(v as 'sepa' | 'us' | 'stripe')}>
                <TabsList className="grid w-full grid-cols-3 h-auto gap-1">
                  <TabsTrigger value="sepa" className="text-xs sm:text-sm">SEPA</TabsTrigger>
                  <TabsTrigger value="us" className="text-xs sm:text-sm">US (GC)</TabsTrigger>
                  <TabsTrigger value="stripe" className="text-xs sm:text-sm">US (Stripe)</TabsTrigger>
                </TabsList>
                <TabsContent value="sepa" className="space-y-2 pt-2">
                  <Label>IBAN</Label>
                  <Input value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} placeholder="FR76 1234 5678 ..." required={accountKind === 'sepa'} className="bg-muted border-border font-mono text-sm" />
                </TabsContent>
                <TabsContent value="us" className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <Label>Account number</Label>
                    <Input value={form.us_account_number} onChange={e => setForm(f => ({ ...f, us_account_number: e.target.value }))} placeholder="Checking account number" required={accountKind === 'us'} className="bg-muted border-border font-mono text-sm" autoComplete="off" />
                  </div>
                  <div className="space-y-2">
                    <Label>Routing (ABA)</Label>
                    <Input value={form.us_routing_number} onChange={e => setForm(f => ({ ...f, us_routing_number: e.target.value.replace(/\D/g, '').slice(0, 9) }))} placeholder="9-digit routing number" required={accountKind === 'us'} maxLength={9} className="bg-muted border-border font-mono text-sm" inputMode="numeric" autoComplete="off" />
                  </div>
                  <p className="text-xs text-muted-foreground">GoCardless ACH mandates. Use sandbox test bank details from your GoCardless dashboard.</p>
                </TabsContent>
                <TabsContent value="stripe" className="space-y-2 pt-2">
                  <p className="text-xs text-muted-foreground">
                    After creating this customer, use &quot;Link Stripe bank&quot; to collect their account with Financial Connections + ACH (no routing/account typing here).
                  </p>
                </TabsContent>
              </Tabs>

              <Button className="w-full" disabled={addCustomer.isPending}>
                {addCustomer.isPending ? 'Creating...' : 'Create Customer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="pl-10 bg-muted border-border" />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No customers yet. Add your first customer to get started.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((customer: any, i: number) => {
            const mandate = (mandates ?? []).find((m: any) => m.customer_id === customer.id);
            const usHint = customer.us_routing_number
              ? `US ACH ····${String(customer.us_account_number ?? '').slice(-4)}`
              : null;
            const stripeLinked = !!customer.stripe_us_bank_payment_method_id;
            return (
              <motion.div key={customer.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.email}</p>
                  {customer.iban && <p className="text-xs text-muted-foreground font-mono mt-1">{customer.iban}</p>}
                  {usHint && <p className="text-xs text-muted-foreground font-mono mt-1">{usHint}</p>}
                  {stripeLinked && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Landmark className="w-3 h-3" /> Stripe US bank linked
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  {!stripeLinked && (
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setStripeLinkId(customer.id)}>
                      Link Stripe bank
                    </Button>
                  )}
                  {mandate && (
                    <Badge variant={mandate.status === 'active' ? 'default' : 'secondary'} className={mandate.status === 'active' ? 'bg-success/10 text-success border-success/20' : ''}>
                      {mandate.status}
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(customer.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
