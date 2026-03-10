import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ReturnItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Return {
  id: string;
  receivable_id: string;
  store_id: string;
  order_id: string | null;
  amount: number;
  reason: string | null;
  items: ReturnItem[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  store?: { id: string; name: string };
  receivable?: { id: string; invoice_number: string };
}

export const useReturns = () => {
  return useQuery({
    queryKey: ['returns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('returns')
        .select('*, store:stores(id, name), receivable:receivables(id, invoice_number)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Return[];
    },
  });
};

export const useCreateReturn = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      receivable_id: string;
      store_id: string;
      order_id?: string;
      amount: number;
      reason?: string;
      items?: ReturnItem[];
    }) => {
      const { data: result, error } = await supabase.from('returns').insert([{
        receivable_id: data.receivable_id,
        store_id: data.store_id,
        order_id: data.order_id || null,
        amount: data.amount,
        reason: data.reason || null,
        items: data.items ? JSON.parse(JSON.stringify(data.items)) : null,
        created_by: user?.id || null,
      }]).select().single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      toast({ title: 'Retur berhasil dicatat', description: 'Piutang telah otomatis dikurangi' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal mencatat retur', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteReturn = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (returnId: string) => {
      const { error } = await supabase.from('returns').delete().eq('id', returnId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      toast({ title: 'Retur berhasil dihapus', description: 'Piutang telah dikembalikan' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal menghapus retur', description: error.message, variant: 'destructive' });
    },
  });
};
