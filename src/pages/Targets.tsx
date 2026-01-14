import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSalesTargets, useUpsertSalesTarget, useDeleteSalesTarget, SalesTarget } from '@/hooks/useSalesTargets';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Target, Plus, Pencil, Trash2, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const Targets = () => {
  const { isAdmin } = useAuth();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<SalesTarget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    year: currentYear,
    month: currentMonth,
    target_amount: 0,
    notes: '',
  });

  const { data: targets, isLoading: targetsLoading } = useSalesTargets(selectedYear);
  const upsertTarget = useUpsertSalesTarget();
  const deleteTarget = useDeleteSalesTarget();

  // Fetch actual sales for comparison
  const { data: monthlySales, isLoading: salesLoading } = useQuery({
    queryKey: ['monthly_sales', selectedYear],
    queryFn: async () => {
      const startDate = new Date(selectedYear, 0, 1);
      const endDate = new Date(selectedYear, 11, 31, 23, 59, 59);

      const { data, error } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Group by month
      const salesByMonth: Record<number, number> = {};
      data.forEach(order => {
        const month = new Date(order.created_at).getMonth() + 1;
        salesByMonth[month] = (salesByMonth[month] || 0) + Number(order.total_amount);
      });

      return salesByMonth;
    },
  });

  const targetData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const target = targets?.find(t => t.month === month);
      const actual = monthlySales?.[month] || 0;
      const targetAmount = target ? Number(target.target_amount) : 0;
      const percentage = targetAmount > 0 ? (actual / targetAmount) * 100 : 0;
      const isPast = selectedYear < currentYear || (selectedYear === currentYear && month < currentMonth);
      const isCurrent = selectedYear === currentYear && month === currentMonth;

      return {
        month,
        monthName: MONTHS[i],
        target,
        targetAmount,
        actual,
        percentage: Math.min(percentage, 100),
        rawPercentage: percentage,
        isPast,
        isCurrent,
        isAchieved: percentage >= 100,
      };
    });
  }, [targets, monthlySales, selectedYear, currentYear, currentMonth]);

  const yearSummary = useMemo(() => {
    const totalTarget = targetData.reduce((sum, d) => sum + d.targetAmount, 0);
    const totalActual = targetData.reduce((sum, d) => sum + d.actual, 0);
    const percentage = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
    const achievedMonths = targetData.filter(d => d.isAchieved && d.targetAmount > 0).length;

    return { totalTarget, totalActual, percentage, achievedMonths };
  }, [targetData]);

  const handleOpenDialog = (target?: SalesTarget, month?: number) => {
    if (target) {
      setEditingTarget(target);
      setFormData({
        year: target.year,
        month: target.month,
        target_amount: Number(target.target_amount),
        notes: target.notes || '',
      });
    } else {
      setEditingTarget(null);
      setFormData({
        year: selectedYear,
        month: month || currentMonth,
        target_amount: 0,
        notes: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsertTarget.mutateAsync(formData);
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTarget.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const isLoading = targetsLoading || salesLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Target Penjualan</h1>
          <p className="text-muted-foreground">Pantau progress pencapaian target bulanan</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Set Target
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTarget ? 'Edit Target' : 'Set Target Baru'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">Tahun</Label>
                      <Select
                        value={String(formData.year)}
                        onValueChange={(v) => setFormData({ ...formData, year: Number(v) })}
                      >
                        <SelectTrigger id="year">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={String(year)}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="month">Bulan</Label>
                      <Select
                        value={String(formData.month)}
                        onValueChange={(v) => setFormData({ ...formData, month: Number(v) })}
                      >
                        <SelectTrigger id="month">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((month, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_amount">Target Penjualan</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
                      <Input
                        id="target_amount"
                        type="number"
                        min="0"
                        value={formData.target_amount}
                        onChange={(e) => setFormData({ ...formData, target_amount: Number(e.target.value) })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Catatan (opsional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={upsertTarget.isPending}>
                      Simpan
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Year Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Target {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(yearSummary.totalTarget)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Penjualan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(yearSummary.totalActual)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pencapaian
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className={cn(
                "text-2xl font-bold",
                yearSummary.percentage >= 100 ? "text-chart-1" : yearSummary.percentage >= 75 ? "text-chart-2" : ""
              )}>
                {yearSummary.percentage.toFixed(1)}%
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bulan Tercapai
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-chart-1">
                {yearSummary.achievedMonths} / 12
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Progress Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          [...Array(12)].map((_, i) => <Skeleton key={i} className="h-40" />)
        ) : (
          targetData.map((data) => (
            <Card
              key={data.month}
              className={cn(
                "transition-all",
                data.isCurrent && "ring-2 ring-primary",
                data.isAchieved && data.targetAmount > 0 && "bg-chart-1/5"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {data.monthName}
                    {data.isCurrent && (
                      <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                        Sekarang
                      </span>
                    )}
                  </CardTitle>
                  {data.isAchieved && data.targetAmount > 0 && (
                    <CheckCircle className="w-4 h-4 text-chart-1" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Target</span>
                    <span className="font-medium">
                      {data.targetAmount > 0 ? formatCurrency(data.targetAmount) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Aktual</span>
                    <span className="font-medium">{formatCurrency(data.actual)}</span>
                  </div>
                </div>

                {data.targetAmount > 0 && (
                  <>
                    <Progress value={data.percentage} className="h-2" />
                    <div className="flex items-center justify-between text-sm">
                      <span className={cn(
                        "font-medium",
                        data.rawPercentage >= 100 ? "text-chart-1" : 
                        data.rawPercentage >= 75 ? "text-chart-2" : 
                        data.rawPercentage >= 50 ? "text-chart-4" : "text-destructive"
                      )}>
                        {data.rawPercentage.toFixed(1)}%
                      </span>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleOpenDialog(data.target)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(data.target?.id || null)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {data.targetAmount === 0 && isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleOpenDialog(undefined, data.month)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Set Target
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Target?</AlertDialogTitle>
            <AlertDialogDescription>
              Target penjualan ini akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Targets;
