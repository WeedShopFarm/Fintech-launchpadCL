import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

const Signup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', businessName: '', country: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.country) {
      toast.error('Please select a country');
      return;
    }
    setLoading(true);
    try {
      await signup(form.email, form.password, form.businessName, form.country);
      toast.success('Account created!', { description: 'Welcome to AutoCollect.' });
      navigate('/dashboard');
    } catch (err: any) {
      toast.error('Signup failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold text-foreground">AutoCollect</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Create your account</h1>
          <p className="text-muted-foreground text-sm">Start collecting payments in minutes</p>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input id="businessName" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} placeholder="Acme Corp" required className="bg-muted border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v }))}>
                <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {['France', 'Germany', 'Spain', 'Italy', 'Netherlands', 'Belgium', 'Portugal', 'Ireland'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@business.com" required className="bg-muted border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required minLength={6} className="bg-muted border-border" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
