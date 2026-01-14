import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Navigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  LogIn, 
  LogOut, 
  Eye,
  Download,
  Loader2,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  create: <Plus className="w-3 h-3" />,
  update: <Pencil className="w-3 h-3" />,
  delete: <Trash2 className="w-3 h-3" />,
  login: <LogIn className="w-3 h-3" />,
  logout: <LogOut className="w-3 h-3" />,
  view: <Eye className="w-3 h-3" />,
  export: <Download className="w-3 h-3" />,
};

const actionColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  create: 'default',
  update: 'secondary',
  delete: 'destructive',
  login: 'outline',
  logout: 'outline',
  view: 'outline',
  export: 'secondary',
};

const actionLabels: Record<string, string> = {
  create: 'Buat',
  update: 'Edit',
  delete: 'Hapus',
  login: 'Login',
  logout: 'Logout',
  view: 'Lihat',
  export: 'Export',
};

const entityLabels: Record<string, string> = {
  order: 'Order',
  store: 'Toko',
  product: 'Produk',
  user: 'User',
  price: 'Harga',
  target: 'Target',
  report: 'Laporan',
  auth: 'Auth',
};

const ActivityLogs = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: isAdmin,
  });

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_name.toLowerCase().includes(search.toLowerCase()) ||
      (log.entity_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesEntity = filterEntity === 'all' || log.entity_type === filterEntity;
    return matchesSearch && matchesAction && matchesEntity;
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="w-7 h-7" />
          Log Aktivitas
        </h1>
        <p className="text-muted-foreground">Riwayat aktivitas semua pengguna</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>Cari dan filter log aktivitas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama user atau entity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Aksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Aksi</SelectItem>
                <SelectItem value="create">Buat</SelectItem>
                <SelectItem value="update">Edit</SelectItem>
                <SelectItem value="delete">Hapus</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="export">Export</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Entity</SelectItem>
                <SelectItem value="order">Order</SelectItem>
                <SelectItem value="store">Toko</SelectItem>
                <SelectItem value="product">Produk</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="price">Harga</SelectItem>
                <SelectItem value="target">Target</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Aktivitas</CardTitle>
          <CardDescription>
            Menampilkan {filteredLogs.length} dari {logs.length} log
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada log aktivitas</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                      </TableCell>
                      <TableCell className="font-medium">{log.user_name}</TableCell>
                      <TableCell>
                        <Badge variant={actionColors[log.action] || 'outline'}>
                          {actionIcons[log.action]}
                          <span className="ml-1">{actionLabels[log.action] || log.action}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {entityLabels[log.entity_type] || log.entity_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.entity_name || '-'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogs;