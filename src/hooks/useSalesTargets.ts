import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SalesTarget {
  id: string;
  year: number;
  month: number;
  target_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useSalesTargets = (year?: number) => {
  return useQuery({
    queryKey: ['sales_targets', year],
    queryFn: async () => {
      let query = supabase
        .from('sales_targets')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (year) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SalesTarget[];
    },
  });
};

export const useSalesTarget = (year: number, month: number) => {
  return useQuery({
    queryKey: ['sales_targets', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_targets')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();

      if (error) throw error;
      return data as SalesTarget | null;
    },
  });
};

export const useUpsertSalesTarget = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (target: { year: number; month: number; target_amount: number; notes?: string }) => {
      const { data, error } = await supabase
        .from('sales_targets')
        .upsert(
          {
            year: target.year,
            month: target.month,
            target_amount: target.target_amount,
            notes: target.notes || null,
          },
          { onConflict: 'year,month' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_targets'] });
      toast({ title: 'Berhasil', description: 'Target penjualan berhasil disimpan' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteSalesTarget = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales_targets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_targets'] });
      toast({ title: 'Berhasil', description: 'Target penjualan berhasil dihapus' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};
