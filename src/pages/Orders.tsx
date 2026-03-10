import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useOrders, useOrderItems, useUpdateOrderWhatsappStatus, useUpdateOrderStatus, useDeleteOrder } from '@/hooks/useOrders';
import { useStores } from '@/hooks/useStores';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { History, Eye, MessageCircle, Search, Copy, MoreHorizontal, Trash2, CheckCircle, Clock, XCircle, PackageCheck, Pencil, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, formatDateTime, formatPhone } from '@/lib/formatters';

const Orders = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: orders, isLoading } = useOrders();
  const { data: stores } = useStores();
  const updateWhatsappStatus = useUpdateOrderWhatsappStatus();
  const updateOrderStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<(Order & { store: any }) | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const { data: orderItems, isLoading: itemsLoading } = useOrderItems(selectedOrder?.id || '');

  const filteredOrders = orders?.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.store?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStore = selectedStoreId === 'all' || order.store_id === selectedStoreId;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStore && matchesStatus;
  });

  const generateWhatsAppMessage = (order: Order & { store: any }, items: any[]) => {
    let message = `*Order: ${order.order_number}*\n\n`;
    message += `Toko: ${order.store?.name}\n`;
    if (order.store?.address) message += `Alamat: ${order.store.address}\n`;
    message += `\n*Detail Pesanan:*\n`;
    message += `───────────────\n`;

    items.forEach((item, index) => {
      message += `${index + 1}. ${item.product?.name}\n`;
      message += `   ${item.quantity} ${item.product?.unit} x ${formatCurrency(Number(item.unit_price))}\n`;
      message += `   = ${formatCurrency(Number(item.subtotal))}\n`;
    });

    message += `───────────────\n`;
    message += `*TOTAL: ${formatCurrency(Number(order.total_amount))}*\n`;

    if (order.notes) {
      message += `\nCatatan: ${order.notes}`;
    }

    return encodeURIComponent(message);
  };

  const handleSendWhatsApp = async () => {
    if (!selectedOrder || !orderItems || !selectedOrder.store?.whatsapp) return;

    const message = generateWhatsAppMessage(selectedOrder, orderItems);
    const phone = formatPhone(selectedOrder.store.whatsapp);
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    await updateWhatsappStatus.mutateAsync(selectedOrder.id);
  };

  const handleSendWhatsAppFromTable = async (order: Order & { store: any }) => {
    if (!order.store?.whatsapp) return;

    // Fetch order items for this order
    const { data: items, error } = await supabase
      .from('order_items')
      .select(`*, product:products (*)`)
      .eq('order_id', order.id);
    
    if (error || !items) return;

    const message = generateWhatsAppMessage(order, items);
    const phone = formatPhone(order.store.whatsapp);
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    await updateWhatsappStatus.mutateAsync(order.id);
  };

  const handleRepeatOrder = (orderId: string) => {
    navigate(`/orders/new?repeat=${orderId}`);
  };

  const handleStatusChange = (orderId: string, status: string) => {
    updateOrderStatus.mutate({ orderId, status });
  };

  const handleDeleteOrder = () => {
    if (orderToDelete) {
      deleteOrder.mutate(orderToDelete);
      setOrderToDelete(null);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'sent': return 'Terkirim';
      case 'completed': return 'Selesai';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary' as const;
      case 'sent': return 'default' as const;
      case 'completed': return 'default' as const;
      case 'cancelled': return 'destructive' as const;
      default: return 'secondary' as const;
    }
  };

  const handleEditOrder = (orderId: string) => {
    navigate(`/orders/edit/${orderId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Riwayat Order</h1>
        <p className="text-muted-foreground">Lihat semua transaksi yang telah dibuat</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter toko" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Toko</SelectItem>
                {stores?.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Terkirim</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredOrders?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <History className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada riwayat order</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-3">
              {filteredOrders?.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">{order.store?.name}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={getStatusVariant(order.status)} className="text-xs">
                          {getStatusLabel(order.status)}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                              <Eye className="w-4 h-4 mr-2" /> Lihat Detail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditOrder(order.id)}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit Order
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRepeatOrder(order.id)}>
                              <Copy className="w-4 h-4 mr-2" /> Repeat Order
                            </DropdownMenuItem>
                            {order.store?.whatsapp && (
                              <DropdownMenuItem onClick={() => handleSendWhatsAppFromTable(order)}>
                                <Send className="w-4 h-4 mr-2" />
                                {order.whatsapp_sent ? 'Kirim Ulang WA' : 'Kirim WhatsApp'}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setOrderToDelete(order.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-foreground">{formatCurrency(Number(order.total_amount))}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Harga</TableHead>
                        <TableHead>Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product?.name}</TableCell>
                          <TableCell>{item.quantity} {item.product?.unit}</TableCell>
                          <TableCell>{formatCurrency(Number(item.unit_price))}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(Number(item.subtotal))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedOrder(null);
                    handleRepeatOrder(selectedOrder.id);
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Repeat Order
                </Button>
                {selectedOrder.store?.whatsapp && (
                  <Button
                    className="flex-1"
                    variant={selectedOrder.whatsapp_sent ? "outline" : "default"}
                    onClick={handleSendWhatsApp}
                    disabled={updateWhatsappStatus.isPending}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    {selectedOrder.whatsapp_sent ? 'Kirim Ulang ke WhatsApp' : 'Kirim ke WhatsApp'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus order ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Orders;
