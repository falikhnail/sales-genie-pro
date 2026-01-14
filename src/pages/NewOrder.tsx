import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStores } from '@/hooks/useStores';
import { useActiveProducts } from '@/hooks/useProducts';
import { useStorePrices } from '@/hooks/useStorePrices';
import { useCreateOrder, useUpdateOrderWhatsappStatus } from '@/hooks/useOrders';
import { useActivityLog } from '@/hooks/useActivityLog';
import { CartItem, Store, Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShoppingCart, Plus, Minus, Trash2, Send, MessageCircle, Copy } from 'lucide-react';
import { formatCurrency, formatPhone } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/searchable-select';

const NewOrder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const repeatOrderId = searchParams.get('repeat');
  
  const { toast } = useToast();
  const { data: stores } = useStores();
  const { data: products } = useActiveProducts();
  const { logActivity } = useActivityLog();
  
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const { data: storePrices } = useStorePrices(selectedStoreId);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isRepeatLoading, setIsRepeatLoading] = useState(false);
  const [repeatOrderNumber, setRepeatOrderNumber] = useState<string | null>(null);

  const createOrder = useCreateOrder();
  const updateWhatsappStatus = useUpdateOrderWhatsappStatus();

  // Fetch order data when repeat param is present
  const { data: repeatOrderData } = useQuery({
    queryKey: ['repeat_order', repeatOrderId],
    queryFn: async () => {
      if (!repeatOrderId) return null;
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, store:stores (*)')
        .eq('id', repeatOrderId)
        .single();
      
      if (orderError) throw orderError;
      
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*, product:products (*)')
        .eq('order_id', repeatOrderId);
      
      if (itemsError) throw itemsError;
      
      return { order, items };
    },
    enabled: !!repeatOrderId,
  });

  // Load repeat order data into form
  useEffect(() => {
    if (repeatOrderData && products && !isRepeatLoading) {
      setIsRepeatLoading(true);
      const { order, items } = repeatOrderData;
      
      setSelectedStoreId(order.store_id);
      setRepeatOrderNumber(order.order_number);
      
      // We need to wait for store prices to load, so we'll set cart in another effect
    }
  }, [repeatOrderData, products]);

  // Set cart after store prices are loaded (for repeat order)
  useEffect(() => {
    if (isRepeatLoading && repeatOrderData && products && storePrices !== undefined) {
      const { items } = repeatOrderData;
      
      const cartItems: CartItem[] = items
        .filter((item: any) => item.product && item.product.is_active)
        .map((item: any) => {
          const product = products.find(p => p.id === item.product_id) || item.product;
          const customPrice = storePrices?.find(sp => sp.product_id === item.product_id);
          const unitPrice = customPrice 
            ? Number(customPrice.custom_price) 
            : Number(product.default_price);
          
          return {
            product,
            quantity: item.quantity,
            unitPrice,
          };
        });
      
      setCart(cartItems);
      setIsRepeatLoading(false);
      
      if (cartItems.length < items.length) {
        toast({
          title: 'Perhatian',
          description: 'Beberapa produk dari order sebelumnya sudah tidak aktif',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Order Dimuat',
          description: `Order ${repeatOrderData.order.order_number} berhasil dimuat. Anda bisa mengedit sebelum submit.`,
        });
      }
    }
  }, [isRepeatLoading, storePrices, repeatOrderData, products, toast]);

  const selectedStore = stores?.find(s => s.id === selectedStoreId);

  const getProductPrice = (productId: string, defaultPrice: number) => {
    const customPrice = storePrices?.find(sp => sp.product_id === productId);
    return customPrice ? Number(customPrice.custom_price) : defaultPrice;
  };

  const handleAddToCart = () => {
    if (!selectedProductId) return;
    
    const product = products?.find(p => p.id === selectedProductId);
    if (!product) return;

    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const unitPrice = getProductPrice(product.id, Number(product.default_price));
      setCart([...cart, { product, quantity: 1, unitPrice }]);
    }
    setSelectedProductId('');
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleRemoveItem = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const handleStoreChange = (value: string) => {
    if (value !== selectedStoreId) {
      setSelectedStoreId(value);
      setCart([]); // Reset cart when store changes
      setRepeatOrderNumber(null);
    }
  };

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [cart]);

  const generateWhatsAppMessage = (orderNumber: string, store: Store) => {
    let message = `*Order Baru: ${orderNumber}*\n\n`;
    message += `Toko: ${store.name}\n`;
    if (store.address) message += `Alamat: ${store.address}\n`;
    message += `\n*Detail Pesanan:*\n`;
    message += `───────────────\n`;

    cart.forEach((item, index) => {
      message += `${index + 1}. ${item.product.name}\n`;
      message += `   ${item.quantity} ${item.product.unit} x ${formatCurrency(item.unitPrice)}\n`;
      message += `   = ${formatCurrency(item.quantity * item.unitPrice)}\n`;
    });

    message += `───────────────\n`;
    message += `*TOTAL: ${formatCurrency(total)}*\n`;

    if (notes) {
      message += `\nCatatan: ${notes}`;
    }

    return encodeURIComponent(message);
  };

  const handleSubmitOrder = async (sendToWhatsApp: boolean) => {
    if (!selectedStoreId || cart.length === 0) {
      toast({ title: 'Error', description: 'Pilih toko dan tambahkan produk', variant: 'destructive' });
      return;
    }

    try {
      const order = await createOrder.mutateAsync({
        storeId: selectedStoreId,
        items: cart,
        notes: notes || undefined,
      });

      logActivity({
        action: 'create',
        entityType: 'order',
        entityId: order.id,
        entityName: order.order_number,
        details: {
          store: selectedStore?.name,
          total: total,
          itemCount: cart.length,
        },
      });

      if (sendToWhatsApp && selectedStore?.whatsapp) {
        const message = generateWhatsAppMessage(order.order_number, selectedStore);
        const phone = formatPhone(selectedStore.whatsapp);
        const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
        window.open(whatsappUrl, '_blank');
        await updateWhatsappStatus.mutateAsync(order.id);
      }

      toast({ title: 'Berhasil', description: `Order ${order.order_number} berhasil dibuat` });
      navigate('/orders');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const availableProducts = products?.filter(
    p => !cart.some(item => item.product.id === p.id)
  );

  const isLoadingRepeat = repeatOrderId && isRepeatLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {repeatOrderNumber ? 'Repeat Order' : 'Buat Order Baru'}
        </h1>
        <p className="text-muted-foreground">
          {repeatOrderNumber 
            ? `Berdasarkan order ${repeatOrderNumber}` 
            : 'Input pesanan pelanggan'}
        </p>
      </div>

      {repeatOrderNumber && (
        <Alert>
          <Copy className="h-4 w-4" />
          <AlertDescription>
            Order ini dibuat berdasarkan <strong>{repeatOrderNumber}</strong>. 
            Anda dapat mengedit item atau quantity sebelum menyimpan.
          </AlertDescription>
        </Alert>
      )}

      {isLoadingRepeat ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-60" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pilih Toko</CardTitle>
              </CardHeader>
              <CardContent>
                <SearchableSelect
                  options={stores?.map((store) => ({
                    value: store.id,
                    label: store.name + (store.contact_person ? ` - ${store.contact_person}` : ''),
                    description: store.address || undefined,
                  })) || []}
                  value={selectedStoreId}
                  onValueChange={handleStoreChange}
                  placeholder="Pilih toko..."
                  searchPlaceholder="Cari toko..."
                  emptyText="Toko tidak ditemukan."
                />
                {selectedStore && (
                  <div className="mt-3 p-3 bg-muted/30 rounded-lg text-sm">
                    {selectedStore.address && <p>{selectedStore.address}</p>}
                    {selectedStore.whatsapp && (
                      <p className="text-muted-foreground">WhatsApp: {selectedStore.whatsapp}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedStoreId && (
              <Card>
                <CardHeader>
                  <CardTitle>Tambah Produk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <SearchableSelect
                      options={availableProducts?.map((product) => ({
                        value: product.id,
                        label: product.name,
                        description: formatCurrency(getProductPrice(product.id, Number(product.default_price))),
                      })) || []}
                      value={selectedProductId}
                      onValueChange={setSelectedProductId}
                      placeholder="Pilih produk..."
                      searchPlaceholder="Cari produk..."
                      emptyText="Produk tidak ditemukan."
                      className="flex-1"
                    />
                    <Button onClick={handleAddToCart} disabled={!selectedProductId}>
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {cart.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Keranjang ({cart.length} item)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead>Harga</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Subtotal</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item) => (
                        <TableRow key={item.product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.product.name}</p>
                              <p className="text-sm text-muted-foreground">{item.product.unit}</p>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleUpdateQuantity(item.product.id, -1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleUpdateQuantity(item.product.id, 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveItem(item.product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ringkasan Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan (opsional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan untuk order ini..."
                    rows={3}
                  />
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => handleSubmitOrder(true)}
                    disabled={!selectedStoreId || cart.length === 0 || createOrder.isPending || !selectedStore?.whatsapp}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Buat Order & Kirim WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSubmitOrder(false)}
                    disabled={!selectedStoreId || cart.length === 0 || createOrder.isPending}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Buat Order Saja
                  </Button>
                </div>

                {selectedStore && !selectedStore.whatsapp && (
                  <p className="text-sm text-muted-foreground text-center">
                    Toko ini belum memiliki nomor WhatsApp
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewOrder;
