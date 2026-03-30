import { useState } from 'react';
import { useCustomers, useAddCustomer, useMandates, useDeleteCustomer } from '@/hooks/useBusinessData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Loader2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const CustomersPage = () => {
  const { data: customers, isLoading } = useCustomers();
  const { data: mandates } = useMandates();
  const addCustomer = useAddCustomer();
  const deleteCustomer = useDeleteCustomer();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', iban: '' });

  const filtered = (customers ?? []).filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCustomer.mutateAsync(form);
      toast.success('Customer created');
      setOpen(false);
      setForm({ name: '', email: '', iban: '' });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your SEPA debit customers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Customer</Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border">
            <DialogHeader><DialogTitle>Add New Customer</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2"><Label>Full Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Marie Dupont" required className="bg-muted border-border" /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="marie@example.com" required className="bg-muted border-border" /></div>
              <div className="space-y-2"><Label>IBAN</Label><Input value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} placeholder="FR76 1234 5678 ..." className="bg-muted border-border font-mono text-sm" /></div>
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
            return (
              <motion.div key={customer.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.email}</p>
                  {customer.iban && <p className="text-xs text-muted-foreground font-mono mt-1">{customer.iban}</p>}
                </div>
                <div className="flex items-center gap-2">
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
