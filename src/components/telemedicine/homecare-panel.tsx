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
import { useToast } from '@/hooks/use-toast';
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

function getStatusBadge(status: string, adminValidated?: boolean) {
  // A 'pending' booking that hasn't been validated by an admin yet gets a
  // distinct label from a 'pending' booking that HAS been validated (rare —
  // validation usually also moves it to 'confirmed' when staff is
  // available), so the patient always knows what they're waiting on.
  if (status === 'pending' && !adminValidated) {
    return (
      <Badge variant="outline" className="font-medium text-xs bg-yellow-100 text-yellow-800 border-yellow-200">
        Menunggu Validasi Admin
      </Badge>
    );
  }
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
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('layanan');
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<HomeCareService | null>(null);
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [bookingTime, setBookingTime] = useState('');
  const [bookingAddress, setBookingAddress] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // GPS coordinates captured via "Gunakan Lokasi GPS Saat Ini" — sent along
  // with the booking so staff/admin can open the exact pin in Google Maps
  // instead of relying only on the free-text address.
  const [bookingLat, setBookingLat] = useState<number | null>(null);
  const [bookingLng, setBookingLng] = useState<number | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);
  // Maps bookingId → latest payment {id, status} for THIS patient, loaded
  // alongside bookings so each card can show real payment state.
  const [bookingPayments, setBookingPayments] = useState<Record<string, { id: string; status: string }>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [servicesRes, bookingsRes] = await Promise.all([
          fetch('/api/homecare'),
          // Filtered to the logged-in patient's own bookings — without
          // patientId this endpoint returns EVERY patient's bookings, so
          // "Pesanan Saya" was showing other people's Home Care orders too.
          currentUser?.id
            ? fetch(`/api/homecare?type=bookings&patientId=${encodeURIComponent(currentUser.id)}`)
            : Promise.resolve(null),
        ]);
        const servicesData = await servicesRes.json();
        if (servicesData.services) setHomeCareServices(servicesData.services);
        if (bookingsRes) {
          const bookingsData = await bookingsRes.json();
          if (bookingsData.bookings) setHomeCareBookings(bookingsData.bookings);
        }

        // Load this patient's payments too, so each booking card can show
        // its REAL payment state (paid / awaiting payment) instead of
        // guessing from the booking status alone — a booking can stay
        // 'pending' momentarily even after payment succeeds.
        if (currentUser?.id) {
          const paymentsRes = await fetch(`/api/payments?userId=${encodeURIComponent(currentUser.id)}`);
          const paymentsData = await paymentsRes.json();
          if (Array.isArray(paymentsData?.payments)) {
            const map: Record<string, { id: string; status: string }> = {};
            for (const p of paymentsData.payments) {
              // getForUser() already orders by created_at DESC, so the
              // first payment we see per booking is the most recent one —
              // skip any earlier/duplicate rows for the same booking.
              if (p.referenceType === 'homecare_booking' && !map[p.referenceId]) {
                map[p.referenceId] = { id: p.id, status: p.status };
              }
            }
            setBookingPayments(map);
          }
        }
      } catch (error) {
        console.error('Failed to load home care data:', error);
      }
    };
    loadData();
  }, [setHomeCareServices, setHomeCareBookings, currentUser?.id]);

  const handleBookService = (service: HomeCareService) => {
    setSelectedService(service);
    setBookingDate(undefined);
    setBookingTime('');
    setBookingAddress(currentUser?.address || '');
    setBookingNotes('');
    setBookingLat(null);
    setBookingLng(null);
    setBookingDialogOpen(true);
  };

  // Captures the patient's real GPS coordinates from the browser and
  // reverse-geocodes them into a readable address via OpenStreetMap's free
  // Nominatim API (no API key required). The coordinates are what actually
  // get sent to staff/admin for "Buka di Google Maps" — the text address
  // stays editable in case the reverse-geocoded text isn't quite right.
  const handleUseGpsLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'GPS Tidak Tersedia', description: 'Perangkat/browser Anda tidak mendukung lokasi GPS.', variant: 'destructive' });
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setBookingLat(latitude);
        setBookingLng(longitude);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: 'application/json' } }
          );
          const data = await res.json();
          if (data?.display_name) {
            setBookingAddress(data.display_name);
          }
          toast({ title: 'Lokasi Ditemukan', description: 'Alamat telah diisi otomatis dari lokasi GPS Anda. Periksa kembali sebelum memesan.' });
        } catch (err) {
          console.warn('[homecare-panel] reverse geocoding failed:', err);
          toast({ title: 'Lokasi GPS Didapat', description: 'Koordinat tersimpan, namun gagal mengambil nama alamat. Silakan isi alamat secara manual.' });
        } finally {
          setLocatingGps(false);
        }
      },
      (err) => {
        setLocatingGps(false);
        toast({
          title: 'Gagal Mengambil Lokasi',
          description: err.code === err.PERMISSION_DENIED
            ? 'Izin lokasi ditolak. Aktifkan izin lokasi untuk browser ini.'
            : 'Terjadi kesalahan saat mengambil lokasi GPS.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
          latitude: bookingLat ?? undefined,
          longitude: bookingLng ?? undefined,
          notes: bookingNotes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setHomeCareBookings([data.booking, ...homeCareBookings]);
        setBookingDialogOpen(false);
        setActiveTab('pesanan');
        toast({
          title: 'Booking Dibuat',
          description: 'Booking Anda sedang menunggu validasi admin. Pembayaran dapat dilakukan setelah divalidasi.',
        });
      } else {
        const data = await res.json().catch(() => null);
        toast({
          title: 'Gagal Membuat Booking',
          description: data?.details || data?.error || 'Terjadi kesalahan. Silakan coba lagi.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to create booking:', error);
      toast({ title: 'Gagal Membuat Booking', description: 'Periksa koneksi Anda.', variant: 'destructive' });
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
          <div className="carelivia-gradient rounded-xl p-6 md:p-8 text-white relative overflow-hidden">
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
                <BookingCard key={booking.id} booking={booking} payment={bookingPayments[booking.id]} />
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
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">Alamat Lengkap</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] px-2 gap-1 text-primary hover:text-primary"
                  onClick={handleUseGpsLocation}
                  disabled={locatingGps}
                >
                  <Navigation className="w-3 h-3" />
                  {locatingGps ? 'Mencari lokasi...' : 'Gunakan Lokasi GPS'}
                </Button>
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={bookingAddress}
                  onChange={(e) => setBookingAddress(e.target.value)}
                  placeholder="Masukkan alamat lengkap"
                  className="pl-9 text-sm"
                />
              </div>
              {bookingLat != null && bookingLng != null && (
                <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Koordinat GPS tersimpan ({bookingLat.toFixed(5)}, {bookingLng.toFixed(5)}) — memudahkan petugas melacak lokasi Anda.
                </p>
              )}
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

function BookingCard({ booking, payment }: { booking: HomeCareBooking; payment?: { id: string; status: string } }) {
  const { currentUser, setActivePanel, setPendingPaymentFocusId, homeCareBookings, setHomeCareBookings } = useStore();
  const { toast } = useToast();
  const [showTracking, setShowTracking] = useState(false);
  const [findingPayment, setFindingPayment] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const isPaid = payment?.status === 'success';
  const hasPendingPayment = payment?.status === 'pending';

  // "Bayar Sekarang" only becomes available once an admin has validated the
  // booking — that's the step that actually creates the pending payment
  // (see homecareService.validateBooking). Jump straight to the payment
  // method screen, same pattern as the Apotek Online checkout.
  const handlePayNow = async () => {
    if (!currentUser?.id) return;
    setFindingPayment(true);
    try {
      if (payment?.id) {
        setPendingPaymentFocusId(payment.id);
      }
      setActivePanel('payments');
    } finally {
      setFindingPayment(false);
    }
  };

  // "Batalkan" used to have no onClick at all — the button just sat there
  // doing nothing. This actually cancels the booking (status → 'cancelled')
  // via the same endpoint staff/admin use, and voids any pending payment
  // for it server-side so it stops showing up in Pembayaran.
  const handleCancelBooking = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch('/api/homecare', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, status: 'cancelled' }),
      });
      const data = await res.json();
      if (!res.ok || !data?.booking) {
        throw new Error(data?.details || data?.error || 'Gagal membatalkan booking');
      }
      setHomeCareBookings(
        homeCareBookings.map((b) => (b.id === booking.id ? { ...b, status: 'cancelled' } : b))
      );
      toast({ title: 'Booking Dibatalkan', description: `${serviceName} berhasil dibatalkan.` });
      setShowCancelConfirm(false);
    } catch (err) {
      toast({
        title: 'Gagal Membatalkan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

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
              {getStatusBadge(booking.status, booking.adminValidated)}
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
              {booking.latitude != null && booking.longitude != null && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${booking.latitude},${booking.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  Buka di Google Maps
                </a>
              )}
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

        {/* Not yet validated: explain what the patient is waiting on */}
        {booking.status !== 'cancelled' && !booking.adminValidated && (
          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-[11px] text-amber-700">
              Booking Anda sedang menunggu validasi admin. Pembayaran dapat dilakukan setelah booking divalidasi.
            </p>
          </div>
        )}

        {/* Already paid — confirm it instead of showing stale pay buttons */}
        {isPaid && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-[11px] text-emerald-700">Pembayaran untuk booking ini telah berhasil.</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-3 flex gap-2">
          {booking.adminValidated && hasPendingPayment && (
            <Button size="sm" className="text-xs" onClick={handlePayNow} disabled={findingPayment}>
              {findingPayment ? 'Memuat...' : 'Bayar Sekarang'}
            </Button>
          )}
          {!isPaid && (booking.status === 'pending' || booking.status === 'confirmed') && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setShowCancelConfirm(true)}
            >
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

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Booking <strong>{serviceName}</strong> pada {scheduledDate} akan dibatalkan. Tindakan ini tidak dapat diurungkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Tidak, Kembali</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleCancelBooking(); }}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCancelling ? 'Membatalkan...' : 'Ya, Batalkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
