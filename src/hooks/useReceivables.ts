import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Receivable {
  id: string;
  order_id: string | null;
  store_id: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  due_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  store?: { id: string; name: string };
  order?: { id: string; order_number: string } | null;
}

export interface Payment {
  id: string;
  receivable_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export const useReceivables = () => {
  return useQuery({
    queryKey: ['receivables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivables')
        .select('*, store:stores(id, name), order:orders(id, order_number)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Receivable[];
    },
  });
};

export const useReceivablesByStore = (storeId?: string) => {
  return useQuery({
    queryKey: ['receivables', 'store', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivables')
        .select('*, store:stores(id, name), order:orders(id, order_number)')
        .eq('store_id', storeId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Receivable[];
    },
    enabled: !!storeId,
  });
};

export const usePayments = (receivableId?: string) => {
  return useQuery({
    queryKey: ['payments', receivableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('receivable_id', receivableId!)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!receivableId,
  });
};

export const useStoreSummary = () => {
  return useQuery({
    queryKey: ['receivables', 'store-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivables')
        .select('store_id, store:stores(id, name), total_amount, paid_amount, remaining_amount, status');
      if (error) throw error;

      const summaryMap = new Map<string, {
        store_id: string;
        store_name: string;
        total_receivables: number;
        total_amount: number;
        paid_amount: number;
        remaining_amount: number;
        unpaid_count: number;
      }>();

      (data as unknown as Receivable[]).forEach((r) => {
        const existing = summaryMap.get(r.store_id);
        const storeName = r.store?.name || 'Unknown';
        if (existing) {
          existing.total_receivables += 1;
          existing.total_amount += Number(r.total_amount);
          existing.paid_amount += Number(r.paid_amount);
          existing.remaining_amount += Number(r.remaining_amount);
          if (r.status !== 'paid') existing.unpaid_count += 1;
        } else {
          summaryMap.set(r.store_id, {
            store_id: r.store_id,
            store_name: storeName,
            total_receivables: 1,
            total_amount: Number(r.total_amount),
            paid_amount: Number(r.paid_amount),
            remaining_amount: Number(r.remaining_amount),
            unpaid_count: r.status !== 'paid' ? 1 : 0,
          });
        }
      });

      return Array.from(summaryMap.values()).sort((a, b) => b.remaining_amount - a.remaining_amount);
    },
  });
};

export const useCreateReceivable = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      store_id: string;
      order_id?: string;
      total_amount: number;
      due_date?: string;
      notes?: string;
    }) => {
      // Generate invoice number
      const { data: invoiceNum, error: invoiceErr } = await supabase.rpc('generate_invoice_number');
      if (invoiceErr) throw invoiceErr;

      const { data: result, error } = await supabase.from('receivables').insert([{
        store_id: data.store_id,
        order_id: data.order_id || null,
        invoice_number: invoiceNum,
        total_amount: data.total_amount,
        remaining_amount: data.total_amount,
        due_date: data.due_date || null,
        notes: data.notes || null,
        created_by: user?.id || null,
      }]).select().single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      toast({ title: 'Piutang berhasil ditambahkan' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal menambahkan piutang', description: error.message, variant: 'destructive' });
    },
  });
};

export const useAddPayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      receivable_id: string;
      amount: number;
      payment_method: string;
      payment_date?: string;
      notes?: string;
    }) => {
      const { data: result, error } = await supabase.from('payments').insert([{
        receivable_id: data.receivable_id,
        amount: data.amount,
        payment_method: data.payment_method,
        payment_date: data.payment_date || new Date().toISOString(),
        notes: data.notes || null,
        created_by: user?.id || null,
      }]).select().single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({ title: 'Pembayaran berhasil dicatat' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal mencatat pembayaran', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteReceivable = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (receivableId: string) => {
      // Delete payments first
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('receivable_id', receivableId);
      if (paymentsError) throw paymentsError;

      // Then delete receivable
      const { error } = await supabase
        .from('receivables')
        .delete()
        .eq('id', receivableId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({ title: 'Piutang berhasil dihapus' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal menghapus piutang', description: error.message, variant: 'destructive' });
    },
  });
};
