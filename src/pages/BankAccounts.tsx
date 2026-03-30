import { useState } from 'react';
import { useBankAccounts, useAddBankAccount, useDeleteBankAccount } from '@/hooks/useBusinessData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Building2, Star, Shield, Trash2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const BankAccountsPage = () => {
  const { data: accounts, isLoading } = useBankAccounts();
  const addAccount = useAddBankAccount();
  const deleteAccount = useDeleteBankAccount();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ bank_name: '', iban: '' });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAccount.mutateAsync(form);
      toast.success('IBAN added', { description: 'Micro-deposit verification will begin shortly.' });
      setOpen(false);
      setForm({ bank_name: '', iban: '' });
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAccount.mutateAsync(id);
      toast.success('IBAN removed');
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage primary & secondary IBANs</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add IBAN</Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border">
            <DialogHeader><DialogTitle>Add External IBAN</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={handleAdd}>
              <div className="space-y-2"><Label>Bank Name</Label><Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="Wise, Revolut, N26..." required className="bg-muted border-border" /></div>
              <div className="space-y-2"><Label>IBAN</Label><Input value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} placeholder="DE89 3704 0044 ..." required className="bg-muted border-border font-mono text-sm" /></div>
              <p className="text-xs text-muted-foreground">Secondary IBANs are used for payouts only. SEPA collections always go through your primary Qonto IBAN.</p>
              <Button className="w-full" disabled={addAccount.isPending}>
                {addAccount.isPending ? 'Adding...' : 'Add & Verify IBAN'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(accounts ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No bank accounts yet. Add your primary Qonto IBAN to get started.</p>
      ) : (
        <div className="space-y-3">
          {(accounts ?? []).map((account: any, i: number) => (
            <motion.div key={account.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-4 md:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{account.bank_name}</span>
                      {account.is_primary && <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]"><Star className="w-3 h-3 mr-1" />Primary</Badge>}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">{account.iban}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Shield className={`w-3 h-3 ${account.is_verified ? 'text-success' : 'text-warning'}`} />
                      <span className={`text-xs ${account.is_verified ? 'text-success' : 'text-warning'}`}>
                        {account.is_verified ? 'Verified' : 'Pending verification'}
                      </span>
                    </div>
                  </div>
                </div>
                {!account.is_primary && (
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(account.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BankAccountsPage;
