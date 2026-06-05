'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import type { HomeCareService, HomeCareBooking } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Bandage,
  Droplets,
  Syringe,
  Heart,
  Stethoscope,
  Baby,
  FlaskConical,
  Activity,
  CalendarIcon,
  Clock,
  MapPin,
  Navigation,
  User,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Truck,
  Timer,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const categoryIcons: Record<string, React.ReactNode> = {
  perawatan_luka: <Bandage className="w-6 h-6" />,
  infus: <Droplets className="w-6 h-6" />,
  injeksi: <Syringe className="w-6 h-6" />,
  pemeriksaan_lansia: <Heart className="w-6 h-6" />,
  kunjungan_dokter: <Stethoscope className="w-6 h-6" />,
  kunjungan_bidan: <Baby className="w-6 h-6" />,
  lab_sample: <FlaskConical className="w-6 h-6" />,
  fisioterapi: <Activity className="w-6 h-6" />,
};

const categoryLabels: Record<string, string> = {
  perawatan_luka: 'Perawatan Luka',
  infus: 'Infus',
  injeksi: 'Injeksi',
  pemeriksaan_lansia: 'Pemeriksaan Lansia',
  kunjungan_dokter: 'Kunjungan Dokter',
  kunjungan_bidan: 'Kunjungan Bidan',
  lab_sample: 'Pengambilan Sampel Lab',
  fisioterapi: 'Fisioterapi',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

function getStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Menunggu', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    confirmed: { label: 'Dikonfirmasi', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    in_progress: { label: 'Berlangsung', className: 'bg-purple-100 text-purple-800 border-purple-200' },
    on_the_way: { label: 'Dalam Perjalanan', className: 'bg-orange-100 text-orange-800 border-orange-200' },
    completed: { label: 'Selesai', className: 'bg-green-100 text-green-800 border-green-200' },
    cancelled: { label: 'Dibatalkan', className: 'bg-red-100 text-red-800 border-red-200' },
  };
  const c = config[status] || { label: status, className: '' };
  return (
    <Badge variant="outline" className={cn('font-medium text-xs', c.className)}>
      {c.label}
    </Badge>
  );
}

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
];

export function HomeCarePanel() {
  const { homeCareServices, homeCareBookings, setHomeCareBookings, setHomeCareServices, currentUser } = useStore();
  const [activeTab, setActiveTab] = useState('layanan');
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<HomeCareService | null>(null);
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [bookingTime, setBookingTime] = useState('');
  const [bookingAddress, setBookingAddress] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [servicesRes, bookingsRes] = await Promise.all([
          fetch('/api/homecare'),
          fetch('/api/homecare?type=bookings'),
        ]);
        const servicesData = await servicesRes.json();
        const bookingsData = await bookingsRes.json();
        if (servicesData.services) setHomeCareServices(servicesData.services);
        if (bookingsData.bookings) setHomeCareBookings(bookingsData.bookings);
      } catch (error) {
        console.error('Failed to load home care data:', error);
      }
    };
    loadData();
  }, [setHomeCareServices, setHomeCareBookings]);

  const handleBookService = (service: HomeCareService) => {
    setSelectedService(service);
    setBookingDate(undefined);
    setBookingTime('');
    setBookingAddress(currentUser?.address || '');
    setBookingNotes('');
    setBookingDialogOpen(true);
  };

  const handleSubmitBooking = async () => {
    if (!selectedService || !bookingDate || !bookingTime || !bookingAddress || !currentUser) return;

    setIsSubmitting(true);
    try {
      const scheduledAt = new Date(bookingDate);
      const [hours, minutes] = bookingTime.split(':');
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0);

      const res = await fetch('/api/homecare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: currentUser.id,
          serviceId: selectedService.id,
          scheduledAt: scheduledAt.toISOString(),
          address: bookingAddress,
          notes: bookingNotes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setHomeCareBookings([data.booking, ...homeCareBookings]);
        setBookingDialogOpen(false);
        setActiveTab('pesanan');
      }
    } catch (error) {
      console.error('Failed to create booking:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="layanan">Layanan</TabsTrigger>
          <TabsTrigger value="pesanan">
            Pesanan Saya
            {homeCareBookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled').length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                {homeCareBookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Layanan */}
        <TabsContent value="layanan" className="space-y-6 mt-4">
          {/* Hero Section */}
          <div className="medika-gradient rounded-xl p-6 md:p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold">Layanan Kesehatan ke Rumah Anda</h2>
              <p className="mt-2 text-white/80 text-sm md:text-base max-w-lg">
                Dapatkan layanan kesehatan profesional langsung di rumah Anda. Tenaga medis berpengalaman siap melayani.
              </p>
              <div className="flex items-center gap-4 mt-4 text-sm text-white/70">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Terintegrasi BPJS
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Tenaga Medis Bersertifikat
                </span>
              </div>
            </div>
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full" />
            <div className="absolute right-12 top-4 w-20 h-20 bg-white/5 rounded-full" />
          </div>

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {homeCareServices.map((service) => (
              <Card key={service.id} className="group hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4 space-y-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    {categoryIcons[service.category] || <Heart className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">{service.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {service.description || categoryLabels[service.category] || 'Layanan kesehatan profesional'}
                    </p>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-primary">Rp {formatCurrency(service.price)}</p>
                      {service.duration && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {service.duration} menit
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleBookService(service)}
                    className="w-full text-xs"
                    size="sm"
                  >
                    Pesan Sekarang
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {homeCareServices.length === 0 && (
            <div className="text-center py-12">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Belum ada layanan tersedia</p>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Pesanan Saya */}
        <TabsContent value="pesanan" className="space-y-4 mt-4">
          {homeCareBookings.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Belum ada pesanan</p>
              <Button variant="outline" className="mt-4" onClick={() => setActiveTab('layanan')}>
                Pesan Layanan
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto custom-scrollbar">
              {homeCareBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pesan Layanan Home Care</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Service Name (Read-only) */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Layanan</Label>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {selectedService ? (categoryIcons[selectedService.category] || <Heart className="w-5 h-5" />) : <Heart className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-semibold">{selectedService?.name}</p>
                  <p className="text-xs text-primary font-bold">Rp {selectedService ? formatCurrency(selectedService.price) : 0}</p>
                </div>
              </div>
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Tanggal</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal text-sm',
                      !bookingDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {bookingDate ? format(bookingDate, 'dd MMMM yyyy', { locale: localeId }) : 'Pilih tanggal'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={bookingDate}
                    onSelect={(date) => {
                      setBookingDate(date);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Waktu</Label>
              <Select value={bookingTime} onValueChange={setBookingTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih waktu" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time} WIB
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Address Input */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Alamat Lengkap</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={bookingAddress}
                  onChange={(e) => setBookingAddress(e.target.value)}
                  placeholder="Masukkan alamat lengkap"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            {/* Notes Textarea */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Catatan (Opsional)</Label>
              <Textarea
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="Informasi tambahan untuk tenaga medis..."
                className="text-sm resize-none"
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmitBooking}
              className="w-full"
              disabled={!bookingDate || !bookingTime || !bookingAddress || isSubmitting}
            >
              {isSubmitting ? 'Memproses...' : 'Konfirmasi Pemesanan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BookingCard({ booking }: { booking: HomeCareBooking }) {
  const [showTracking, setShowTracking] = useState(false);

  const serviceName = booking.service?.name || 'Layanan Home Care';
  const scheduledDate = booking.scheduledAt
    ? new Date(booking.scheduledAt).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '-';
  const scheduledTime = booking.scheduledAt
    ? new Date(booking.scheduledAt).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

  const staffName = booking.staff
    ? 'staff' in booking.staff
      ? (booking.staff as { user?: { name: string } }).user?.name || 'Petugas'
      : (booking.staff as { name?: string }).name || 'Petugas'
    : null;

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{serviceName}</h3>
              {getStatusBadge(booking.status)}
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                {scheduledDate}, {scheduledTime}
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{booking.address}</span>
              </p>
              {staffName && (
                <p className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  {staffName}
                </p>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            {booking.service && (
              <p className="text-sm font-bold text-primary">
                Rp {formatCurrency(booking.service.price)}
              </p>
            )}
          </div>
        </div>

        {/* Tracking info for on_the_way status */}
        {booking.status === 'on_the_way' && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => setShowTracking(!showTracking)}
            >
              <Navigation className="w-3.5 h-3.5 mr-1.5" />
              {showTracking ? 'Sembunyikan Pelacakan' : 'Lacak Petugas'}
            </Button>
            {showTracking && (
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-orange-800">
                  <Truck className="w-4 h-4" />
                  Petugas dalam perjalanan
                </div>
                {booking.eta && (
                  <p className="text-xs text-orange-700 flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5" />
                    Estimasi tiba: {booking.eta}
                  </p>
                )}
                <div className="h-32 bg-orange-100 rounded-md flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                    <p className="text-[10px] text-orange-600">Peta Lokasi Petugas</p>
                    {booking.staffLat && booking.staffLng && (
                      <p className="text-[10px] text-orange-500 mt-0.5">
                        {booking.staffLat.toFixed(4)}, {booking.staffLng.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-3 flex gap-2">
          {(booking.status === 'pending' || booking.status === 'confirmed') && (
            <Button variant="outline" size="sm" className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
              Batalkan
            </Button>
          )}
          {booking.status === 'completed' && (
            <Button variant="outline" size="sm" className="text-xs">
              Beri Rating
            </Button>
          )}
        </div>

        {booking.notes && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              {booking.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
