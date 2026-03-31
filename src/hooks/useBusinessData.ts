import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useBusiness() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, country, owner_id, stripe_account_id, created_at, updated_at')
        .eq('owner_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useBankAccounts() {
  const { data: business } = useBusiness();
  return useQuery({
    queryKey: ['bank_accounts', business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('business_id', business.id)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!business,
  });
}

export function useAddBankAccount() {
  const qc = useQueryClient();
  const { data: business } = useBusiness();
  return useMutation({
    mutationFn: async (input: { iban: string; bank_name: string; is_primary?: boolean }) => {
      if (!business) {
        throw new Error('Business not found. Please contact support.');
      }
      const { data, error } = await supabase.from('bank_accounts').insert({
        business_id: business.id,
        iban: input.iban,
        bank_name: input.bank_name,
        is_primary: input.is_primary ?? false,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank_accounts'] }),
  });
}

export function useDeleteBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank_accounts'] }),
  });
}

export function useCustomers() {
  const { data: business } = useBusiness();
  return useQuery({
    queryKey: ['customers', business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!business,
  });
}

export function useAddCustomer() {
  const qc = useQueryClient();
  const { data: business } = useBusiness();
  return useMutation({
    mutationFn: async (input: { name: string; email: string; iban: string }) => {
      if (!business) {
        throw new Error('Business not found. Please contact support.');
      }
      const { data, error } = await supabase.from('customers').insert({
        business_id: business.id,
        ...input,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useMandates() {
  const { data: business } = useBusiness();
  return useQuery({
    queryKey: ['mandates', business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mandates')
        .select('*, customers(name, email)')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!business,
  });
}

export function useCreateMandate() {
  const qc = useQueryClient();
  const { data: business } = useBusiness();
  return useMutation({
    mutationFn: async (input: { customer_id: string }) => {
      if (!business) {
        throw new Error('Business not found. Please contact support.');
      }
      const { data, error } = await supabase.from('mandates').insert({
        business_id: business.id,
        customer_id: input.customer_id,
        status: 'pending',
        gocardless_id: `MD_MOCK_${Date.now()}`,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mandates'] }),
  });
}

export function useDeleteMandate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mandates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mandates'] }),
  });
}

export function usePayments() {
  const { data: business } = useBusiness();
  return useQuery({
    queryKey: ['payments', business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, payment_plans(customer_id, customers(name))')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!business,
  });
}

export function usePaymentPlans() {
  const { data: business } = useBusiness();
  return useQuery({
    queryKey: ['payment_plans', business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_plans')
        .select('*, customers(name)')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!business,
  });
}

export function useWallet() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useLedgerEntries() {
  const { data: wallet } = useWallet();
  return useQuery({
    queryKey: ['ledger', wallet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('wallet_id', wallet!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wallet,
  });
}

export function usePayouts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['payouts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useCreatePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { amount: number; method: string; destination: string }) => {
      const { data, error } = await supabase.functions.invoke('process-payout', {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.payout;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payouts'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useCryptoWallets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['crypto_wallets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crypto_wallets')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useAddCryptoWallet() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { address: string; network: string; label: string }) => {
      const { data, error } = await supabase.from('crypto_wallets').insert({
        user_id: user!.id,
        ...input,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crypto_wallets'] }),
  });
}

export function useDeleteCryptoWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crypto_wallets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crypto_wallets'] }),
  });
}
