'use client';

import { useState } from 'react';
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
  Bell,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Demo schedule data
const demoSchedule = [
  {
    id: 'v1',
    service: 'Perawatan Luka',
    patient: 'Rina Wulandari',
    address: 'Jl. Merdeka No. 45, Bandung',
    time: '09:00',
    endTime: '10:00',
    status: 'confirmed',
    notes: 'Luka bakar derajat 2, perlu perawatan rutin',
  },
  {
    id: 'v2',
    service: 'Infus',
    patient: 'Ahmad Fauzi',
    address: 'Jl. Asia Afrika No. 123, Bandung',
    time: '11:00',
    endTime: '12:00',
    status: 'confirmed',
    notes: 'Infus antibiotik, 100ml/jam',
  },
  {
    id: 'v3',
    service: 'Injeksi',
    patient: 'Siti Aminah',
    address: 'Jl. Braga No. 67, Bandung',
    time: '14:00',
    endTime: '14:30',
    status: 'pending',
    notes: 'Injeksi vitamin B12',
  },
  {
    id: 'v4',
    service: 'Fisioterapi',
    patient: 'Bambang S.',
    address: 'Jl. Dago No. 88, Bandung',
    time: '16:00',
    endTime: '17:00',
    status: 'pending',
    notes: 'Fisioterapi lutut pasca operasi',
  },
];

// Demo history data
const demoHistory = [
  {
    id: 'h1',
    service: 'Perawatan Luka',
    patient: 'Dewi Sartika',
    date: '2025-01-09',
    status: 'completed',
  },
  {
    id: 'h2',
    service: 'Kunjungan Dokter',
    patient: 'Rina Wulandari',
    date: '2025-01-08',
    status: 'completed',
  },
  {
    id: 'h3',
    service: 'Infus',
    patient: 'Ahmad Fauzi',
    date: '2025-01-07',
    status: 'completed',
  },
  {
    id: 'h4',
    service: 'Lab Sample',
    patient: 'Bambang S.',
    date: '2025-01-06',
    status: 'completed',
  },
  {
    id: 'h5',
    service: 'Fisioterapi',
    patient: 'Siti Aminah',
    date: '2025-01-05',
    status: 'completed',
  },
];

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
  const [activeVisit, setActiveVisit] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState<Record<string, boolean>>({});

  const handleCheckIn = (visitId: string) => {
    setCheckedIn((prev) => ({ ...prev, [visitId]: true }));
    setActiveVisit(visitId);
    toast({ title: 'Check-in Berhasil', description: 'Anda telah check-in di lokasi pasien' });
  };

  const handleComplete = (visitId: string) => {
    toast({ title: 'Kunjungan Selesai', description: 'Layanan home care telah diselesaikan' });
    setActiveVisit(null);
  };

  const handleMarkArrived = () => {
    toast({ title: 'Tiba di Lokasi', description: 'Anda telah menandai tiba di lokasi pasien' });
  };

  const currentVisit = demoSchedule.find((v) => v.id === activeVisit);

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
            <Badge variant="secondary">{demoSchedule.length} kunjungan</Badge>
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {demoSchedule.map((visit, index) => {
              const sc = statusConfig[visit.status] || statusConfig.pending;
              const isCompleted = checkedIn[visit.id];

              return (
                <Card key={visit.id} className={cn('border-0 hover:shadow-sm transition-shadow', isCompleted && 'opacity-60')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Timeline indicator */}
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white',
                            isCompleted ? 'bg-emerald-500' : 'bg-primary'
                          )}>
                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                          </div>
                          {index < demoSchedule.length - 1 && (
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
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {visit.time} - {visit.endTime} WIB
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
                      {!isCompleted && visit.status === 'confirmed' && (
                        <>
                          <Button size="sm" onClick={() => handleCheckIn(visit.id)}>
                            <MapPin className="w-3.5 h-3.5 mr-1" />
                            Check-in
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setActiveVisit(visit.id)}>
                            <Navigation className="w-3.5 h-3.5 mr-1" />
                            Navigasi
                          </Button>
                        </>
                      )}
                      {isCompleted && (
                        <Button size="sm" variant="outline" onClick={() => handleComplete(visit.id)}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Selesai
                        </Button>
                      )}
                      {visit.status === 'pending' && (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-0 text-[10px]">
                          Menunggu konfirmasi
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
                        {currentVisit.time} - {currentVisit.endTime} WIB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Map Placeholder */}
              <Card className="border-0 overflow-hidden">
                <div className="w-full h-64 md:h-80 bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <Map className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">GPS Map - Lokasi Pasien</p>
                    <p className="text-xs mt-1">{currentVisit.address}</p>
                  </div>
                </div>
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
                        <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">Estimasi Tiba</p>
                        <p className="text-xs text-orange-600 dark:text-orange-500">15 menit (2.3 km)</p>
                      </div>
                    </div>
                    <Button onClick={handleMarkArrived}>
                      <MapPin className="w-4 h-4 mr-1" />
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
                      <Button variant="outline" size="icon">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <Bell className="w-4 h-4" />
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
                  const firstConfirmed = demoSchedule.find((v) => v.status === 'confirmed');
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

          {demoHistory.length === 0 ? (
            <Card className="border-0 bg-muted/50">
              <CardContent className="p-12 text-center">
                <History className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Belum ada riwayat</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {demoHistory.map((item) => (
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
                          {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
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
