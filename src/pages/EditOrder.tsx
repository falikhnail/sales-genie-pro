import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrder, useOrderItems, useUpdateOrder } from '@/hooks/useOrders';
import { useActiveProducts } from '@/hooks/useProducts';
import { useStorePrices } from '@/hooks/useStorePrices';
import { useActivityLog } from '@/hooks/useActivityLog';
import { CartItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShoppingCart, Plus, Minus, Trash2, Save, Pencil } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const EditOrder = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  
  const { data: order, isLoading: orderLoading } = useOrder(id || '');
  const { data: existingItems, isLoading: itemsLoading } = useOrderItems(id || '');
  const { data: products } = useActiveProducts();
  const { data: storePrices } = useStorePrices(order?.store_id || '');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  const updateOrder = useUpdateOrder();

  // Initialize cart with existing order items
  useEffect(() => {
    if (order && existingItems && products && storePrices !== undefined && !isInitialized) {
      setNotes(order.notes || '');
      
      const cartItems: CartItem[] = existingItems
        .filter((item) => item.product && item.product.is_active)
        .map((item) => {
          const product = products.find(p => p.id === item.product_id) || item.product;
          return {
            product,
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
          };
        });
      
      setCart(cartItems);
      setIsInitialized(true);
    }
  }, [order, existingItems, products, storePrices, isInitialized]);

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

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [cart]);

  const handleSaveOrder = async () => {
    if (!id || cart.length === 0) {
      toast({ title: 'Error', description: 'Tambahkan minimal 1 produk', variant: 'destructive' });
      return;
    }

    try {
      await updateOrder.mutateAsync({
        orderId: id,
        items: cart,
        notes: notes || undefined,
      });

      logActivity({
        action: 'update',
        entityType: 'order',
        entityId: id,
        entityName: order?.order_number || '',
        details: {
          store: order?.store?.name,
          total: total,
          itemCount: cart.length,
        },
      });

      navigate('/orders');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const availableProducts = products?.filter(
    p => !cart.some(item => item.product.id === p.id)
  );

  const isLoading = orderLoading || itemsLoading || !isInitialized;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-60" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Order tidak ditemukan</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/orders')}>
          Kembali ke Riwayat Order
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Edit Order</h1>
        <p className="text-muted-foreground">
          Mengubah order {order.order_number}
        </p>
      </div>

      <Alert>
        <Pencil className="h-4 w-4" />
        <AlertDescription>
          Anda sedang mengedit order <strong>{order.order_number}</strong> untuk toko <strong>{order.store?.name}</strong>.
          Toko tidak dapat diubah.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Toko</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="font-medium">{order.store?.name}</p>
                {order.store?.address && <p className="text-sm text-muted-foreground">{order.store.address}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tambah Produk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pilih produk..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(getProductPrice(product.id, Number(product.default_price)))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddToCart} disabled={!selectedProductId}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </div>
            </CardContent>
          </Card>

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
                  onClick={handleSaveOrder}
                  disabled={cart.length === 0 || updateOrder.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Perubahan
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/orders')}
                >
                  Batal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditOrder;
