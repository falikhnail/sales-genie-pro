import * as XLSX from 'xlsx';
import { Order, OrderItem } from '@/types';
import { formatCurrency, formatDate } from './formatters';

interface ExportOrderData {
  order: Order & { store?: any };
  items: (OrderItem & { product?: any })[];
}

export const exportOrdersToExcel = (
  orders: (Order & { store?: any })[],
  filename: string = 'laporan-penjualan'
) => {
  const data = orders.map(order => ({
    'No. Order': order.order_number,
    'Toko': order.store?.name || '-',
    'Alamat': order.store?.address || '-',
    'Total': Number(order.total_amount),
    'Status': order.status,
    'WhatsApp Terkirim': order.whatsapp_sent ? 'Ya' : 'Tidak',
    'Catatan': order.notes || '-',
    'Tanggal': formatDate(order.created_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Penjualan');

  // Auto-size columns
  const maxWidth = 50;
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.min(maxWidth, Math.max(key.length, ...data.map(row => String(row[key as keyof typeof row]).length)))
  }));
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportDetailedReportToExcel = (
  ordersWithItems: ExportOrderData[],
  filename: string = 'laporan-detail'
) => {
  // Summary sheet
  const summaryData = ordersWithItems.map(({ order }) => ({
    'No. Order': order.order_number,
    'Toko': order.store?.name || '-',
    'Total': Number(order.total_amount),
    'Status': order.status,
    'Tanggal': formatDate(order.created_at),
  }));

  // Detail sheet
  const detailData: any[] = [];
  ordersWithItems.forEach(({ order, items }) => {
    items.forEach(item => {
      detailData.push({
        'No. Order': order.order_number,
        'Toko': order.store?.name || '-',
        'Produk': item.product?.name || '-',
        'SKU': item.product?.sku || '-',
        'Qty': item.quantity,
        'Satuan': item.product?.unit || '-',
        'Harga Satuan': Number(item.unit_price),
        'Subtotal': Number(item.subtotal),
        'Tanggal': formatDate(order.created_at),
      });
    });
  });

  const workbook = XLSX.utils.book_new();
  
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');
  
  const detailSheet = XLSX.utils.json_to_sheet(detailData);
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detail Produk');

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportProductSalesToExcel = (
  productSales: { name: string; sku: string; quantity: number; revenue: number }[],
  filename: string = 'laporan-produk'
) => {
  const data = productSales.map(p => ({
    'Nama Produk': p.name,
    'SKU': p.sku || '-',
    'Total Qty Terjual': p.quantity,
    'Total Pendapatan': p.revenue,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Penjualan per Produk');

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};
