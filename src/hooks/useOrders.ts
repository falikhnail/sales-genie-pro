import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderItem, CartItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores (*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (Order & { store: any })[];
    },
  });
};

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores (*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Order & { store: any };
    },
    enabled: !!id,
  });
};

export const useOrderItems = (orderId: string) => {
  return useQuery({
    queryKey: ['order_items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products (*)
        `)
        .eq('order_id', orderId);
      
      if (error) throw error;
      return data as (OrderItem & { product: any })[];
    },
    enabled: !!orderId,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ storeId, items, notes }: { storeId: string; items: CartItem[]; notes?: string }) => {
      // Generate order number
      const { data: orderNumber } = await supabase.rpc('generate_order_number');
      
      const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          store_id: storeId,
          sales_user_id: user?.id,
          total_amount: totalAmount,
          notes,
        })
        .select()
        .single();
      
      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.quantity * item.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Berhasil', description: 'Order berhasil dibuat' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateOrderWhatsappStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders')
        .update({ whatsapp_sent: true })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Berhasil', description: 'Status order berhasil diubah' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderId: string) => {
      // Delete order items first
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);
      
      if (itemsError) throw itemsError;

      // Then delete the order
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Berhasil', description: 'Order berhasil dihapus' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ orderId, items, notes }: { orderId: string; items: CartItem[]; notes?: string }) => {
      const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      // Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          total_amount: totalAmount,
          notes,
        })
        .eq('id', orderId);
      
      if (orderError) throw orderError;

      // Delete existing order items
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);
      
      if (deleteError) throw deleteError;

      // Insert new order items
      const orderItems = items.map(item => ({
        order_id: orderId,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.quantity * item.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order_items'] });
      toast({ title: 'Berhasil', description: 'Order berhasil diperbarui' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};
