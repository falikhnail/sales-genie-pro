import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Visit {
  id: string;
  store_id: string;
  user_id: string;
  visit_date: string;
  check_in_time: string;
  check_out_time: string | null;
  notes: string | null;
  visit_type: string;
  created_at: string;
  updated_at: string;
  stores?: { name: string };
  profiles?: { full_name: string };
}

export const useVisits = (storeId?: string) => {
  return useQuery({
    queryKey: ['visits', storeId],
    queryFn: async () => {
      let query = supabase
        .from('visits')
        .select('*, stores(name)')
        .order('visit_date', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Visit[];
    },
  });
};

export const useCheckIn = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      store_id: string;
      notes?: string;
      visit_type?: string;
    }) => {
      const { data, error } = await supabase
        .from('visits')
        .insert({
          store_id: params.store_id,
          user_id: user?.id || '',
          notes: params.notes || null,
          visit_type: params.visit_type || 'regular',
          visit_date: new Date().toISOString(),
          check_in_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast({ title: 'Check-in berhasil!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal check-in', description: error.message, variant: 'destructive' });
    },
  });
};

export const useCheckOut = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { id: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('visits')
        .update({
          check_out_time: new Date().toISOString(),
          notes: params.notes,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast({ title: 'Check-out berhasil!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal check-out', description: error.message, variant: 'destructive' });
    },
  });
};
