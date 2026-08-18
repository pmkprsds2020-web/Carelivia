'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Clock,
  MapPin,
  Navigation,
  CheckCircle2,
  User,
  Map,
  Truck,
  History,
  ChevronRight,
  Phone,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// NOTE: the hardcoded `demoSchedule` / `demoHistory` arrays (4 fake visits
// + 5 fake history entries, none of which existed in the database) have
// been removed. Check-in / "Tandai Tiba" / "Selesai" used to only show a
// toast and never persisted anything — a staff member's actual work status
// was never recorded. Real bookings now load from
// GET /api/homecare?type=bookings&staffId=..., and every action below
// calls PUT /api/homecare to update the booking's real status in Supabase.

interface StaffBooking {
  id: string;
  service: string;
  patient: string;
  patientPhone?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  scheduledAt: string;
  status: string;
  notes?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Menunggu', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  confirmed: { label: 'Dikonfirmasi', className: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400' },
  in_progress: { label: 'Berlangsung', className: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400' },
  on_the_way: { label: 'Dalam Perjalanan', className: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400' },
  completed: { label: 'Selesai', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  cancelled: { label: 'Dibatalkan', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' },
};

export function HomeCareStaffPanel() {
  const { toast } = useToast();
  const { currentUser } = useStore();
  const [activeVisit, setActiveVisit] = useState<string | null>(null);
  const [bookings, setBookings] = useState<StaffBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    if (!currentUser?.id) { setBookingsLoading(false); return; }
    setBookingsLoading(true);
    try {
      const res = await fetch(`/api/homecare?type=bookings&staffId=${encodeURIComponent(currentUser.id)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data?.bookings)) {
        setBookings(
          data.bookings.map((b: any) => ({
            id: b.id,
            service: b.service?.name ?? 'Home Care',
            patient: b.patient?.name ?? 'Pasien',
            patientPhone: b.patient?.phone,
            address: b.address,
            latitude: b.latitude,
            longitude: b.longitude,
            scheduledAt: b.scheduledAt,
            status: b.status,
            notes: b.notes,
          }))
        );
      } else {
        toast({ title: 'Gagal memuat jadwal', description: data?.details || 'Terjadi kesalahan.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('[homecare-staff-panel] loadBookings failed:', err);
      toast({ title: 'Gagal memuat jadwal', description: 'Periksa koneksi Anda.', variant: 'destructive' });
    } finally {
      setBookingsLoading(false);
    }
  }, [currentUser?.id, toast]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const updateStatus = async (bookingId: string, status: string, successMessage: { title: string; description: string }) => {
    setUpdatingId(bookingId);
    try {
      const res = await fetch('/api/homecare', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, status }),
      });
      const data = await res.json();
      if (!res.ok || !data?.booking) {
        throw new Error(data?.details || data?.error || 'Gagal memperbarui status');
      }
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));
      toast(successMessage);
    } catch (err) {
      toast({
        title: 'Gagal memperbarui status',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCheckIn = (bookingId: string) => {
    setActiveVisit(bookingId);
    updateStatus(bookingId, 'on_the_way', { title: 'Check-in Berhasil', description: 'Anda telah check-in di lokasi pasien' });
  };

  const handleComplete = (bookingId: string) => {
    updateStatus(bookingId, 'completed', { title: 'Kunjungan Selesai', description: 'Layanan home care telah diselesaikan' });
    setActiveVisit(null);
  };

  const handleMarkArrived = (bookingId: string) => {
    updateStatus(bookingId, 'in_progress', { title: 'Tiba di Lokasi', description: 'Anda telah menandai tiba di lokasi pasien' });
  };

  const todaySchedule = useMemo(() => {
    const today = new Date().toDateString();
    return bookings.filter((b) => new Date(b.scheduledAt).toDateString() === today && b.status !== 'completed' && b.status !== 'cancelled');
  }, [bookings]);

  const history = useMemo(() => bookings.filter((b) => b.status === 'completed'), [bookings]);

  const currentVisit = bookings.find((v) => v.id === activeVisit);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="schedule" className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Jadwal</span>
          </TabsTrigger>
          <TabsTrigger value="navigation" className="flex items-center gap-1.5">
            <Navigation className="w-4 h-4" />
            <span className="hidden sm:inline">Navigasi</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Riwayat</span>
          </TabsTrigger>
        </TabsList>

        {/* ==================== JADWAL TAB ==================== */}
        <TabsContent value="schedule" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Jadwal Hari Ini</h3>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <Badge variant="secondary">{todaySchedule.length} kunjungan</Badge>
          </div>

          {bookingsLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Memuat jadwal...
            </div>
          ) : todaySchedule.length === 0 ? (
            <Card className="border-0 bg-muted/50">
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Tidak ada jadwal hari ini</p>
              </CardContent>
            </Card>
          ) : (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {todaySchedule.map((visit, index) => {
              const sc = statusConfig[visit.status] || statusConfig.pending;
              const isArrived = visit.status === 'in_progress';
              const isUpdating = updatingId === visit.id;
              const visitTime = new Date(visit.scheduledAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

              return (
                <Card key={visit.id} className={cn('border-0 hover:shadow-sm transition-shadow', isArrived && 'opacity-60')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Timeline indicator */}
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white',
                            isArrived ? 'bg-emerald-500' : 'bg-primary'
                          )}>
                            {isArrived ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                          </div>
                          {index < todaySchedule.length - 1 && (
                            <div className="w-0.5 h-8 bg-border mt-1" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-foreground">{visit.service}</p>
                            <Badge className={cn('text-[10px] border-0', sc.className)}>{sc.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {visit.patient}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {visit.address}
                          </p>
                          {visit.latitude != null && visit.longitude != null && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${visit.latitude},${visit.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <Navigation className="w-3 h-3" />
                              Lihat di Google Maps
                            </a>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {visitTime} WIB
                          </p>
                          {visit.notes && (
                            <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded p-1.5">
                              {visit.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border ml-11">
                      {!isArrived && visit.status === 'confirmed' && (
                        <>
                          <Button size="sm" onClick={() => handleCheckIn(visit.id)} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <MapPin className="w-3.5 h-3.5 mr-1" />}
                            Check-in
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setActiveVisit(visit.id)}>
                            <Navigation className="w-3.5 h-3.5 mr-1" />
                            Navigasi
                          </Button>
                        </>
                      )}
                      {isArrived && (
                        <Button size="sm" variant="outline" onClick={() => handleComplete(visit.id)} disabled={isUpdating}>
                          {isUpdating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                          Selesai
                        </Button>
                      )}
                      {visit.status === 'pending' && (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-0 text-[10px]">
                          Menunggu konfirmasi
                        </Badge>
                      )}
                      {visit.status === 'on_the_way' && (
                        <Button size="sm" variant="outline" onClick={() => handleMarkArrived(visit.id)} disabled={isUpdating}>
                          {isUpdating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <MapPin className="w-3.5 h-3.5 mr-1" />}
                          Tandai Tiba
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          )}
        </TabsContent>

        {/* ==================== NAVIGASI TAB ==================== */}
        <TabsContent value="navigation" className="space-y-4 mt-4">
          {currentVisit ? (
            <>
              <Card className="border-0">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center shrink-0">
                      <Navigation className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{currentVisit.service}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3" />
                        {currentVisit.patient}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {currentVisit.address}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(currentVisit.scheduledAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Map / Navigation */}
              <Card className="border-0 overflow-hidden">
                {currentVisit.latitude != null && currentVisit.longitude != null ? (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Map className="w-4 h-4 text-primary" />
                      Koordinat GPS Pasien
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {currentVisit.latitude.toFixed(5)}, {currentVisit.longitude.toFixed(5)}
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${currentVisit.latitude},${currentVisit.longitude}`,
                        '_blank'
                      )}
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Rute ke Lokasi Pasien (Google Maps)
                    </Button>
                  </div>
                ) : (
                  <div className="w-full h-64 md:h-80 bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <Map className="w-12 h-12 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">Koordinat GPS tidak tersedia</p>
                      <p className="text-xs mt-1">{currentVisit.address}</p>
                    </div>
                  </div>
                )}
              </Card>

              {/* ETA */}
              <Card className="border-0 bg-orange-50 dark:bg-orange-950/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-200 dark:bg-orange-900/50 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">Perjalanan Menuju Lokasi</p>
                        <p className="text-xs text-orange-600 dark:text-orange-500">Tandai saat Anda tiba di lokasi pasien</p>
                      </div>
                    </div>
                    <Button onClick={() => handleMarkArrived(currentVisit.id)} disabled={updatingId === currentVisit.id}>
                      {updatingId === currentVisit.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MapPin className="w-4 h-4 mr-1" />}
                      Tandai Tiba
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Patient Contact */}
              <Card className="border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {currentVisit.patient.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{currentVisit.patient}</p>
                        <p className="text-xs text-muted-foreground">Pasien</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={!currentVisit.patientPhone}
                        onClick={() => currentVisit.patientPhone && window.open(`tel:${currentVisit.patientPhone}`)}
                        title={currentVisit.patientPhone || 'Nomor telepon pasien tidak tersedia'}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-0 bg-muted/50">
              <CardContent className="p-12 text-center">
                <Navigation className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Tidak ada navigasi aktif</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Pilih kunjungan dari jadwal dan check-in untuk memulai navigasi
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => {
                  const firstConfirmed = todaySchedule.find((v) => v.status === 'confirmed');
                  if (firstConfirmed) {
                    setActiveVisit(firstConfirmed.id);
                  }
                }}>
                  Pilih Kunjungan
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== RIWAYAT TAB ==================== */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <h3 className="font-semibold text-foreground">Riwayat Kunjungan</h3>

          {bookingsLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Memuat riwayat...
            </div>
          ) : history.length === 0 ? (
            <Card className="border-0 bg-muted/50">
              <CardContent className="p-12 text-center">
                <History className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Belum ada riwayat</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {history.map((item) => (
                <Card key={item.id} className="border-0 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{item.service}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {item.patient}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.scheduledAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <Badge className={cn('text-[10px] border-0', statusConfig.completed.className)}>
                          Selesai
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
