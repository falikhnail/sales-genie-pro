import { useState } from 'react';
import { useVisits, useCheckIn, useCheckOut, Visit } from '@/hooks/useVisits';
import { useStores } from '@/hooks/useStores';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Clock, LogIn, LogOut, Search, Filter, CalendarDays } from 'lucide-react';
import { format, formatDistanceToNow, isToday, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const visitTypeLabels: Record<string, string> = {
  regular: 'Rutin',
  follow_up: 'Follow Up',
  new_store: 'Toko Baru',
  collection: 'Penagihan',
};

const Visits = () => {
  const isMobile = useIsMobile();
  const { data: visits = [], isLoading } = useVisits();
  const { data: stores = [] } = useStores();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const { user } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState('');
  const [visitType, setVisitType] = useState('regular');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [filterStore, setFilterStore] = useState('all');

  const storeOptions = stores.map(s => ({ value: s.id, label: s.name }));

  const handleCheckIn = () => {
    if (!selectedStore) return;
    checkIn.mutate(
      { store_id: selectedStore, notes, visit_type: visitType },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setSelectedStore('');
          setNotes('');
          setVisitType('regular');
        },
      }
    );
  };

  const handleCheckOut = (visit: Visit) => {
    checkOut.mutate({ id: visit.id, notes: visit.notes || undefined });
  };

  const activeVisit = visits.find(
    v => v.user_id === user?.id && !v.check_out_time && isToday(parseISO(v.check_in_time))
  );

  const filtered = visits.filter(v => {
    const matchSearch = !search || (v.stores?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchStore = filterStore === 'all' || v.store_id === filterStore;
    return matchSearch && matchStore;
  });

  // Group visits by date for timeline
  const groupedByDate = filtered.reduce<Record<string, Visit[]>>((acc, visit) => {
    const dateKey = format(parseISO(visit.visit_date), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(visit);
    return acc;
  }, {});

  const todayVisits = visits.filter(v => isToday(parseISO(v.visit_date)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kunjungan Sales</h1>
          <p className="text-sm text-muted-foreground">Check-in, catatan kunjungan & timeline</p>
        </div>
        <div className="flex gap-2">
          {activeVisit && (
            <Button
              variant="destructive"
              onClick={() => handleCheckOut(activeVisit)}
              disabled={checkOut.isPending}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Check-out
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!!activeVisit}>
                <LogIn className="w-4 h-4 mr-2" />
                Check-in
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Check-in Kunjungan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Toko</Label>
                  <SearchableSelect
                    options={storeOptions}
                    value={selectedStore}
                    onValueChange={setSelectedStore}
                    placeholder="Pilih toko..."
                  />
                </div>
                <div>
                  <Label>Tipe Kunjungan</Label>
                  <Select value={visitType} onValueChange={setVisitType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(visitTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Catatan</Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Catatan kunjungan..."
                    rows={3}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCheckIn}
                  disabled={!selectedStore || checkIn.isPending}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Check-in Sekarang
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Hari Ini</p>
            <p className="text-2xl font-bold text-foreground">{todayVisits.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Bulan Ini</p>
            <p className="text-2xl font-bold text-foreground">
              {visits.filter(v => {
                const d = parseISO(v.visit_date);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Toko Dikunjungi</p>
            <p className="text-2xl font-bold text-foreground">
              {new Set(visits.map(v => v.store_id)).size}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Aktif</p>
            <p className="text-2xl font-bold text-primary">
              {activeVisit ? 'Ya' : 'Tidak'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Visit */}
      {activeVisit && (
        <Card className="border-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <p className="font-semibold text-foreground">
                    Sedang di: {activeVisit.stores?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Check-in {formatDistanceToNow(parseISO(activeVisit.check_in_time), { addSuffix: true, locale: localeId })}
                  </p>
                </div>
              </div>
              <Badge variant="default">{visitTypeLabels[activeVisit.visit_type] || activeVisit.visit_type}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari toko..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStore} onValueChange={setFilterStore}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter toko" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Toko</SelectItem>
            {stores.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline View */}
      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Memuat data...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Belum ada data kunjungan.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([dateKey, dayVisits]) => (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">
                  {isToday(parseISO(dateKey))
                    ? 'Hari Ini'
                    : format(parseISO(dateKey), 'EEEE, d MMMM yyyy', { locale: localeId })}
                </h3>
                <Badge variant="secondary">{dayVisits.length} kunjungan</Badge>
              </div>

              <div className="relative ml-4 border-l-2 border-border pl-6 space-y-4">
                {dayVisits.map(visit => (
                  <div key={visit.id} className="relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-primary bg-background" />
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-foreground">{visit.stores?.name}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <LogIn className="w-3 h-3" />
                                {format(parseISO(visit.check_in_time), 'HH:mm')}
                              </span>
                              {visit.check_out_time && (
                                <span className="flex items-center gap-1">
                                  <LogOut className="w-3 h-3" />
                                  {format(parseISO(visit.check_out_time), 'HH:mm')}
                                </span>
                              )}
                              {visit.check_out_time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {(() => {
                                    const mins = Math.round(
                                      (new Date(visit.check_out_time).getTime() -
                                        new Date(visit.check_in_time).getTime()) /
                                        60000
                                    );
                                    return mins >= 60 ? `${Math.floor(mins / 60)}j ${mins % 60}m` : `${mins}m`;
                                  })()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {visitTypeLabels[visit.visit_type] || visit.visit_type}
                            </Badge>
                            {!visit.check_out_time && (
                              <Badge variant="default" className="bg-green-500">Aktif</Badge>
                            )}
                          </div>
                        </div>
                        {visit.notes && (
                          <p className="text-sm text-muted-foreground mt-2 border-t border-border pt-2">
                            {visit.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Visits;
