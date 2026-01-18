import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { History, Eye, MessageCircle, Search, Copy, MoreHorizontal, Trash2, CheckCircle, Clock, XCircle, PackageCheck, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, formatPhone } from '@/lib/formatters';

const Orders = () => {
  const navigate = useNavigate();
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Order</TableHead>
                  <TableHead>Toko</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.store?.name}</TableCell>
                    <TableCell>{formatCurrency(Number(order.total_amount))}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.whatsapp_sent ? 'default' : 'outline'}>
                        {order.whatsapp_sent ? 'Terkirim' : 'Belum'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Lihat Detail</TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditOrder(order.id)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Order
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRepeatOrder(order.id)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Repeat Order
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'pending')}>
                              <Clock className="w-4 h-4 mr-2" />
                              Set Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'sent')}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Set Terkirim
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'completed')}>
                              <PackageCheck className="w-4 h-4 mr-2" />
                              Set Selesai
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'cancelled')}>
                              <XCircle className="w-4 h-4 mr-2" />
                              Set Dibatalkan
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setOrderToDelete(order.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Hapus Order
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Order {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Toko</p>
                  <p className="font-medium">{selectedOrder.store?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal</p>
                  <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium">{formatCurrency(Number(selectedOrder.total_amount))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp</p>
                  <Badge variant={selectedOrder.whatsapp_sent ? 'default' : 'outline'}>
                    {selectedOrder.whatsapp_sent ? 'Terkirim' : 'Belum Terkirim'}
                  </Badge>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Catatan</p>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Item Pesanan</h4>
                {itemsLoading ? (
                  <Skeleton className="h-32" />
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
