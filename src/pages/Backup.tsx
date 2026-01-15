import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackupSummary, useExportBackup, BackupData } from '@/hooks/useBackupData';
import { exportBackupToJSON, exportBackupToExcel, parseBackupFile } from '@/lib/backup-export';
import { formatDistanceToNow, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Store,
  Package,
  ShoppingCart,
  FileText,
  DollarSign,
  Users,
  Target,
  Activity,
  FileJson,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

const Backup = () => {
  const queryClient = useQueryClient();
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useBackupSummary();
  const { exportAllData } = useExportBackup();
  
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importPreview, setImportPreview] = useState<BackupData | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const summaryItems = [
    { label: 'Toko', value: summary?.stores || 0, icon: Store, color: 'text-blue-500' },
    { label: 'Produk', value: summary?.products || 0, icon: Package, color: 'text-green-500' },
    { label: 'Order', value: summary?.orders || 0, icon: ShoppingCart, color: 'text-purple-500' },
    { label: 'Item Order', value: summary?.orderItems || 0, icon: FileText, color: 'text-orange-500' },
    { label: 'Harga Khusus', value: summary?.storePrices || 0, icon: DollarSign, color: 'text-yellow-500' },
    { label: 'Profil', value: summary?.profiles || 0, icon: Users, color: 'text-pink-500' },
    { label: 'Target', value: summary?.salesTargets || 0, icon: Target, color: 'text-indigo-500' },
    { label: 'Log Aktivitas', value: summary?.activityLogs || 0, icon: Activity, color: 'text-red-500' },
  ];

  const totalRecords = summaryItems.reduce((acc, item) => acc + item.value, 0);

  const handleExport = async (format: 'json' | 'excel') => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      
      if (format === 'json') {
        exportBackupToJSON(data);
      } else {
        exportBackupToExcel(data);
      }
      
      toast.success(`Backup berhasil diexport ke ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal mengexport backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseBackupFile(file);
      setImportPreview(data);
      setShowImportDialog(true);
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Gagal membaca file backup. Pastikan format file benar.');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!importPreview) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      const steps = 6;
      let currentStep = 0;

      // Import stores
      if (importPreview.stores.length > 0) {
        for (const store of importPreview.stores) {
          await supabase.from('stores').upsert(store, { onConflict: 'id' });
        }
      }
      currentStep++;
      setImportProgress((currentStep / steps) * 100);

      // Import products
      if (importPreview.products.length > 0) {
        for (const product of importPreview.products) {
          await supabase.from('products').upsert(product, { onConflict: 'id' });
        }
      }
      currentStep++;
      setImportProgress((currentStep / steps) * 100);

      // Import orders
      if (importPreview.orders.length > 0) {
        for (const order of importPreview.orders) {
          await supabase.from('orders').upsert(order, { onConflict: 'id' });
        }
      }
      currentStep++;
      setImportProgress((currentStep / steps) * 100);

      // Import order items
      if (importPreview.order_items.length > 0) {
        for (const item of importPreview.order_items) {
          await supabase.from('order_items').upsert(item, { onConflict: 'id' });
        }
      }
      currentStep++;
      setImportProgress((currentStep / steps) * 100);

      // Import store prices
      if (importPreview.store_prices.length > 0) {
        for (const price of importPreview.store_prices) {
          await supabase.from('store_prices').upsert(price, { onConflict: 'id' });
        }
      }
      currentStep++;
      setImportProgress((currentStep / steps) * 100);

      // Import sales targets
      if (importPreview.sales_targets.length > 0) {
        for (const target of importPreview.sales_targets) {
          await supabase.from('sales_targets').upsert(target, { onConflict: 'id' });
        }
      }
      currentStep++;
      setImportProgress((currentStep / steps) * 100);

      // Refresh all queries
      await queryClient.invalidateQueries();
      await refetchSummary();

      toast.success('Data berhasil diimport');
      setShowImportDialog(false);
      setImportPreview(null);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Gagal mengimport data. Pastikan Anda memiliki izin yang cukup.');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Invalidate all queries to fetch fresh data from cloud
      await queryClient.invalidateQueries();
      await refetchSummary();
      
      setLastSyncTime(new Date());
      toast.success('Data berhasil disinkronisasi dengan cloud');
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Gagal menyinkronisasi data');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="w-6 h-6" />
            Backup Database
          </h1>
          <p className="text-muted-foreground">
            Export, import, dan sinkronisasi data
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lastSyncTime && (
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              Sync: {formatDistanceToNow(lastSyncTime, { addSuffix: true, locale: idLocale })}
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ringkasan Data</CardTitle>
          <CardDescription>
            Total {totalRecords.toLocaleString()} record dalam database
            {summary?.lastUpdated && (
              <span className="ml-2">
                • Update terakhir: {formatDistanceToNow(new Date(summary.lastUpdated), { addSuffix: true, locale: idLocale })}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {summaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className={`p-2 rounded-lg bg-background ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{item.value.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-500" />
              Export Backup
            </CardTitle>
            <CardDescription>
              Download semua data sebagai file backup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button className="w-full" disabled={isExporting}>
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mengexport...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="center">
                <div className="flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => handleExport('json')}
                  >
                    <FileJson className="w-4 h-4 mr-2" />
                    Format JSON
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => handleExport('excel')}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Format Excel
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground text-center">
              Pilih format JSON untuk backup lengkap atau Excel untuk spreadsheet
            </p>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-500" />
              Import Backup
            </CardTitle>
            <CardDescription>
              Restore data dari file backup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Pilih File
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Mendukung file .json dan .xlsx
            </p>
          </CardContent>
        </Card>

        {/* Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Cloud className="w-5 h-5 text-purple-500" />
              Sync Cloud
            </CardTitle>
            <CardDescription>
              Sinkronisasi manual dengan cloud
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyinkronisasi...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Sekarang
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Refresh data dari cloud database
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Storage Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informasi Penyimpanan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Cloud Storage</span>
                <span className="font-medium text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Terhubung
                </span>
              </div>
              <Progress value={25} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Penyimpanan: ~{(totalRecords * 0.5).toFixed(1)} KB (estimasi)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Preview Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Konfirmasi Import
            </DialogTitle>
            <DialogDescription>
              Data berikut akan diimport ke database. Data yang sudah ada akan diperbarui.
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">{importPreview.stores.length}</p>
                  <p className="text-xs text-muted-foreground">Toko</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">{importPreview.products.length}</p>
                  <p className="text-xs text-muted-foreground">Produk</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">{importPreview.orders.length}</p>
                  <p className="text-xs text-muted-foreground">Order</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">{importPreview.order_items.length}</p>
                  <p className="text-xs text-muted-foreground">Item Order</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">{importPreview.store_prices.length}</p>
                  <p className="text-xs text-muted-foreground">Harga Khusus</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">{importPreview.sales_targets.length}</p>
                  <p className="text-xs text-muted-foreground">Target</p>
                </div>
              </div>

              <Separator />

              <div className="text-xs text-muted-foreground">
                <p>Waktu export: {format(new Date(importPreview.exported_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}</p>
                <p>Versi: {importPreview.version}</p>
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <Progress value={importProgress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    Mengimport data... {Math.round(importProgress)}%
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportPreview(null);
              }}
              disabled={isImporting}
            >
              Batal
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengimport...
                </>
              ) : (
                'Import Data'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Backup;
