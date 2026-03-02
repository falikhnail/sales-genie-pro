import * as XLSX from 'xlsx';
import { BackupData } from '@/hooks/useBackupData';
import { format } from 'date-fns';

export const exportBackupToJSON = (data: BackupData, filename?: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `backup-${format(new Date(), 'yyyyMMdd-HHmmss')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportBackupToExcel = (data: BackupData, filename?: string) => {
  const workbook = XLSX.utils.book_new();

  if (data.stores.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.stores), 'Toko');
  }
  if (data.products.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.products), 'Produk');
  }
  if (data.orders.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.orders), 'Order');
  }
  if (data.order_items.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.order_items), 'Item Order');
  }
  if (data.store_prices.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.store_prices), 'Harga Khusus');
  }
  if (data.sales_targets.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.sales_targets), 'Target Penjualan');
  }
  if (data.receivables.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.receivables), 'Piutang');
  }
  if (data.payments.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.payments), 'Pembayaran');
  }

  const metadataSheet = XLSX.utils.json_to_sheet([{
    'Waktu Export': data.exported_at,
    'Versi': data.version,
    'Total Toko': data.stores.length,
    'Total Produk': data.products.length,
    'Total Order': data.orders.length,
    'Total Item Order': data.order_items.length,
    'Total Harga Khusus': data.store_prices.length,
    'Total Target': data.sales_targets.length,
    'Total Piutang': data.receivables.length,
    'Total Pembayaran': data.payments.length
  }]);
  XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Info Backup');

  XLSX.writeFile(workbook, filename || `backup-${format(new Date(), 'yyyyMMdd-HHmmss')}.xlsx`);
};

export const parseBackupFile = (file: File): Promise<BackupData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content);
          if (!data.version || !data.exported_at) {
            throw new Error('Invalid backup file format');
          }
          // Ensure backward compatibility
          if (!data.receivables) data.receivables = [];
          if (!data.payments) data.payments = [];
          resolve(data);
        } else if (file.name.endsWith('.xlsx')) {
          const workbook = XLSX.read(content, { type: 'binary' });
          
          const data: BackupData = {
            stores: [],
            products: [],
            orders: [],
            order_items: [],
            store_prices: [],
            sales_targets: [],
            receivables: [],
            payments: [],
            exported_at: new Date().toISOString(),
            version: '2.0'
          };

          if (workbook.SheetNames.includes('Toko')) {
            data.stores = XLSX.utils.sheet_to_json(workbook.Sheets['Toko']);
          }
          if (workbook.SheetNames.includes('Produk')) {
            data.products = XLSX.utils.sheet_to_json(workbook.Sheets['Produk']);
          }
          if (workbook.SheetNames.includes('Order')) {
            data.orders = XLSX.utils.sheet_to_json(workbook.Sheets['Order']);
          }
          if (workbook.SheetNames.includes('Item Order')) {
            data.order_items = XLSX.utils.sheet_to_json(workbook.Sheets['Item Order']);
          }
          if (workbook.SheetNames.includes('Harga Khusus')) {
            data.store_prices = XLSX.utils.sheet_to_json(workbook.Sheets['Harga Khusus']);
          }
          if (workbook.SheetNames.includes('Target Penjualan')) {
            data.sales_targets = XLSX.utils.sheet_to_json(workbook.Sheets['Target Penjualan']);
          }
          if (workbook.SheetNames.includes('Piutang')) {
            data.receivables = XLSX.utils.sheet_to_json(workbook.Sheets['Piutang']);
          }
          if (workbook.SheetNames.includes('Pembayaran')) {
            data.payments = XLSX.utils.sheet_to_json(workbook.Sheets['Pembayaran']);
          }

          resolve(data);
        } else {
          throw new Error('Unsupported file format. Use .json or .xlsx');
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));

    if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  });
};
