import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Users as UsersIcon, Shield, User, Plus, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  role: 'admin' | 'sales';
}

const Users = () => {
  const { user: currentUser, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    username: '',
    role: 'sales' as 'admin' | 'sales',
  });
  const [creating, setCreating] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users_with_roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      return profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || 'sales',
        };
      }) as UserWithRole[];
    },
    enabled: isAdmin,
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'sales' }) => {
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users_with_roles'] });
      toast({ title: 'Berhasil', description: 'Role pengguna berhasil diubah' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.fullName || !newUser.username) {
      toast({ title: 'Error', description: 'Semua field harus diisi', variant: 'destructive' });
      return;
    }

    if (newUser.password.length < 6) {
      toast({ title: 'Error', description: 'Password minimal 6 karakter', variant: 'destructive' });
      return;
    }

    // Check if username already exists
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', newUser.username.toLowerCase())
      .maybeSingle();

    if (existingUsername) {
      toast({ title: 'Error', description: 'Username sudah digunakan', variant: 'destructive' });
      return;
    }

    setCreating(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: { full_name: newUser.fullName },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Update username in profile
        await supabase
          .from('profiles')
          .update({ username: newUser.username.toLowerCase() })
          .eq('user_id', data.user.id);

        // If admin role, update role
        if (newUser.role === 'admin') {
          await supabase
            .from('user_roles')
            .update({ role: 'admin' })
            .eq('user_id', data.user.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['users_with_roles'] });
      toast({ title: 'Berhasil', description: 'User baru berhasil dibuat' });
      setIsCreateOpen(false);
      setNewUser({ email: '', password: '', fullName: '', username: '', role: 'sales' });
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Gagal membuat user', 
        variant: 'destructive' 
      });
    } finally {
      setCreating(false);
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Pegawai</h1>
          <p className="text-muted-foreground">Kelola akses dan role pengguna</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Tambah User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah User Baru</DialogTitle>
              <DialogDescription>
                Buat akun user baru untuk sistem
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nama Lengkap</Label>
                <Input
                  id="fullName"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  placeholder="Nama lengkap"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="Username untuk login"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Minimal 6 karakter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: 'admin' | 'sales') => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleCreateUser} disabled={creating}>
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5" />
            Daftar Pegawai
          </CardTitle>
          <CardDescription>Semua user yang terdaftar dalam sistem</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : users?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <UsersIcon className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada pegawai terdaftar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Terdaftar</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.username || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' ? (
                          <Shield className="w-3 h-3 mr-1" />
                        ) : (
                          <User className="w-3 h-3 mr-1" />
                        )}
                        {user.role === 'admin' ? 'Admin' : 'Sales'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell>
                      {user.user_id !== currentUser?.id && (
                        <Select
                          value={user.role}
                          onValueChange={(value: 'admin' | 'sales') => 
                            updateRole.mutate({ userId: user.user_id, role: value })
                          }
                          disabled={updateRole.isPending}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Info Role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary"><User className="w-3 h-3 mr-1" />Sales</Badge>
            </div>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Dapat melihat dan menambah toko</li>
              <li>Dapat membuat order baru</li>
              <li>Dapat melihat riwayat order</li>
              <li>Dapat mengatur harga khusus per toko</li>
            </ul>
          </div>
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Badge><Shield className="w-3 h-3 mr-1" />Admin</Badge>
            </div>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Semua akses Sales</li>
              <li>Dapat mengelola produk (tambah, edit, hapus)</li>
              <li>Dapat mengelola pegawai dan role</li>
              <li>Melihat statistik dan laporan lengkap</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
