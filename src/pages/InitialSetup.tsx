import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck } from 'lucide-react';

const InitialSetup = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [fullName, setFullName] = useState('Administrator');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if setup is needed, redirect to auth if not
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const { data, error } = await supabase.rpc('check_setup_needed');
        if (error) throw error;
        
        if (data === false) {
          // Setup already done, redirect to login
          navigate('/auth', { replace: true });
        }
      } catch (err) {
        console.error('Error checking setup status:', err);
      } finally {
        setChecking(false);
      }
    };
    
    checkSetup();
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast({ title: 'Error', description: 'Username dan password harus diisi', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'Error', description: 'Password minimal 6 karakter', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bootstrap-admin', {
        body: {
          username: username.trim(),
          password,
          fullName: fullName.trim(),
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error('Gagal membuat admin');

      toast({
        title: 'Berhasil',
        description: `Admin "${username.trim()}" berhasil dibuat. Silakan login.`,
      });

      navigate('/auth');
    } catch (err: any) {
      toast({
        title: 'Gagal Setup',
        description: err?.message || 'Terjadi kesalahan',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Setup Awal</CardTitle>
          <CardDescription>Buat admin pertama (hanya bisa sekali saat database kosong)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Administrator"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username Admin</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password Admin</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">Login tetap pakai username (tanpa email).</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Buat Admin
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default InitialSetup;
