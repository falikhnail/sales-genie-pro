import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StorePrice } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const useStorePrices = (storeId?: string) => {
  return useQuery({
    queryKey: ['store_prices', storeId],
    queryFn: async () => {
      let query = supabase.from('store_prices').select('*');
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as StorePrice[];
    },
    enabled: storeId !== undefined,
  });
};

export const useStorePricesWithProducts = (storeId: string) => {
  return useQuery({
    queryKey: ['store_prices_with_products', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_prices')
        .select(`
          *,
          products:product_id (*)
        `)
        .eq('store_id', storeId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });
};

export const useUpsertStorePrice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ store_id, product_id, custom_price }: Omit<StorePrice, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('store_prices')
        .upsert(
          { store_id, product_id, custom_price },
          { onConflict: 'store_id,product_id' }
        )
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store_prices'] });
      queryClient.invalidateQueries({ queryKey: ['store_prices_with_products'] });
      toast({ title: 'Berhasil', description: 'Harga khusus berhasil disimpan' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteStorePrice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('store_prices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store_prices'] });
      queryClient.invalidateQueries({ queryKey: ['store_prices_with_products'] });
      toast({ title: 'Berhasil', description: 'Harga khusus berhasil dihapus' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};
