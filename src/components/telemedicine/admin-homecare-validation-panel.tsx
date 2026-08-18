'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarIcon,
  MapPin,
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  StickyNote,
} from 'lucide-react';

interface PendingBooking {
  id: string;
  patientId: string;
  serviceId: string;
  status: string;
  scheduledAt: string;
  address: string;
  notes?: string;
  createdAt: string;
  patient?: { id: string; name: string; phone?: string };
  service?: { id: string; name: string; price: number };
}

function formatCurrency(amount: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
}

export function AdminHomecareValidationPanel() {
  const { toast } = useToast();
  const { currentUser } = useStore();
  const [bookings, setBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingBooking | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/homecare-bookings');
      const data = await res.json();
      if (res.ok && Array.isArray(data?.bookings)) {
        setBookings(data.bookings);
      } else {
        toast({ title: 'Gagal memuat data', description: data?.details || 'Terjadi kesalahan.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('[admin-homecare-validation] loadBookings failed:', err);
      toast({ title: 'Gagal memuat data', description: 'Periksa koneksi Anda.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleValidate = async (booking: PendingBooking) => {
    setProcessingId(booking.id);
    try {
      const res = await fetch('/api/admin/homecare-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, action: 'validate', adminId: currentUser?.id }),
      });
      const data = await res.json();
      if (!res.ok || !data?.booking) {
        throw new Error(data?.details || data?.error || 'Gagal memvalidasi booking');
      }
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
      toast({
        title: 'Booking Divalidasi',
        description: data.payment
          ? `Pasien kini dapat membayar invoice ${data.payment.invoiceNumber}.`
          : 'Booking telah divalidasi.',
      });
    } catch (err) {
      toast({
        title: 'Gagal Memvalidasi',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setProcessingId(rejectTarget.id);
    try {
      const res = await fetch('/api/admin/homecare-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: rejectTarget.id, action: 'reject', reason: rejectReason || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data?.booking) {
        throw new Error(data?.details || data?.error || 'Gagal menolak booking');
      }
      setBookings((prev) => prev.filter((b) => b.id !== rejectTarget.id));
      toast({ title: 'Booking Ditolak', description: `Booking ${rejectTarget.service?.name ?? ''} telah ditolak.` });
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      toast({
        title: 'Gagal Menolak',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          Validasi Home Care
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Booking harus divalidasi di sini sebelum pasien dapat melakukan pembayaran.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Memuat booking...
        </div>
      ) : bookings.length === 0 ? (
        <Card className="border-0 bg-muted/50">
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Tidak ada booking menunggu validasi</p>
            <p className="text-muted-foreground text-sm mt-1">Semua booking Home Care sudah divalidasi.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const isProcessing = processingId === booking.id;
            return (
              <Card key={booking.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{booking.service?.name ?? 'Layanan Home Care'}</h3>
                        <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
                          Menunggu Validasi
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        {booking.patient?.name ?? 'Pasien'}
                        {booking.patient?.phone ? ` · ${booking.patient.phone}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                        {new Date(booking.scheduledAt).toLocaleString('id-ID', {
                          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{booking.address}</span>
                      </p>
                      {booking.notes && (
                        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{booking.notes}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {booking.service && (
                        <p className="text-base font-bold text-primary">{formatCurrency(booking.service.price)}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <Button size="sm" onClick={() => handleValidate(booking)} disabled={isProcessing}>
                      {isProcessing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                      Validasi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={isProcessing}
                      onClick={() => { setRejectTarget(booking); setRejectReason(''); }}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Tolak
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tolak Booking Home Care</DialogTitle>
            <DialogDescription>
              Booking {rejectTarget?.service?.name ?? ''} untuk {rejectTarget?.patient?.name ?? 'pasien'} akan dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Alasan (opsional)</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: jadwal tidak tersedia, alamat di luar jangkauan..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processingId === rejectTarget?.id}
            >
              {processingId === rejectTarget?.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
              Tolak Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
