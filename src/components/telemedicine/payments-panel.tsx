'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import type { PaymentStatus, PaymentMethod } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  CreditCard,
  Wallet,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  QrCode,
  Building2,
  Smartphone,
  Download,
  Eye,
  Stethoscope,
  Pill,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type PaymentType = 'Konsultasi' | 'Farmasi' | 'Home Care';

interface DemoPayment {
  id: string;
  invoiceNumber: string;
  type: PaymentType;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  date: string;
  description: string;
}

const demoPayments: DemoPayment[] = [
  {
    id: 'pay1',
    invoiceNumber: 'INV-2025-001',
    type: 'Konsultasi',
    amount: 200000,
    method: 'qris',
    status: 'success',
    date: '2025-01-10T10:30:00Z',
    description: 'Konsultasi Video Call - dr. Andi Pratama',
  },
  {
    id: 'pay2',
    invoiceNumber: 'INV-2025-002',
    type: 'Farmasi',
    amount: 85000,
    method: 'gopay',
    status: 'success',
    date: '2025-01-09T14:20:00Z',
    description: 'Pembelian Obat - Antasida, Omeprazole',
  },
  {
    id: 'pay3',
    invoiceNumber: 'INV-2025-003',
    type: 'Home Care',
    amount: 150000,
    method: 'bank_transfer',
    status: 'pending',
    date: '2025-01-12T09:00:00Z',
    description: 'Home Care - Perawatan Luka',
  },
  {
    id: 'pay4',
    invoiceNumber: 'INV-2025-004',
    type: 'Konsultasi',
    amount: 175000,
    method: 'qris',
    status: 'pending',
    date: '2025-01-13T11:00:00Z',
    description: 'Konsultasi Chat - dr. Siti Rahayu',
  },
  {
    id: 'pay5',
    invoiceNumber: 'INV-2024-048',
    type: 'Farmasi',
    amount: 320000,
    method: 'ovo',
    status: 'failed',
    date: '2024-12-28T16:45:00Z',
    description: 'Pembelian Obat - Metformin, Vitamin B6',
  },
  {
    id: 'pay6',
    invoiceNumber: 'INV-2024-045',
    type: 'Home Care',
    amount: 200000,
    method: 'bank_transfer',
    status: 'refunded',
    date: '2024-12-20T08:30:00Z',
    description: 'Home Care - Kunjungan Dokter (Dibatalkan)',
  },
  {
    id: 'pay7',
    invoiceNumber: 'INV-2024-042',
    type: 'Konsultasi',
    amount: 150000,
    method: 'dana',
    status: 'success',
    date: '2024-12-15T13:15:00Z',
    description: 'Konsultasi Audio - dr. Budi Santoso',
  },
];

const statusConfig: Record<PaymentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive'; className: string }> = {
  pending: { label: 'Menunggu', variant: 'secondary', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  success: { label: 'Berhasil', variant: 'default', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  failed: { label: 'Gagal', variant: 'destructive', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' },
  refunded: { label: 'Dikembalikan', variant: 'secondary', className: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400' },
};

const methodLabels: Record<PaymentMethod, { label: string; icon: React.ReactNode }> = {
  qris: { label: 'QRIS', icon: <QrCode className="w-4 h-4" /> },
  bank_transfer: { label: 'Transfer Bank', icon: <Building2 className="w-4 h-4" /> },
  va: { label: 'Virtual Account', icon: <Building2 className="w-4 h-4" /> },
  gopay: { label: 'GoPay', icon: <Smartphone className="w-4 h-4" /> },
  ovo: { label: 'OVO', icon: <Smartphone className="w-4 h-4" /> },
  dana: { label: 'DANA', icon: <Smartphone className="w-4 h-4" /> },
  shopeepay: { label: 'ShopeePay', icon: <Smartphone className="w-4 h-4" /> },
};

const typeIcons: Record<PaymentType, React.ReactNode> = {
  Konsultasi: <Stethoscope className="w-4 h-4" />,
  Farmasi: <Pill className="w-4 h-4" />,
  'Home Care': <Heart className="w-4 h-4" />,
};

function formatCurrency(amount: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type FilterKey = 'all' | PaymentStatus;

const paymentMethods = [
  { key: 'qris' as PaymentMethod, label: 'QRIS', icon: <QrCode className="w-6 h-6" /> },
  { key: 'bank_transfer' as PaymentMethod, label: 'Transfer Bank', icon: <Building2 className="w-6 h-6" /> },
  { key: 'va' as PaymentMethod, label: 'Virtual Account', icon: <Building2 className="w-6 h-6" /> },
  { key: 'gopay' as PaymentMethod, label: 'GoPay', icon: <Smartphone className="w-6 h-6" /> },
  { key: 'ovo' as PaymentMethod, label: 'OVO', icon: <Smartphone className="w-6 h-6" /> },
  { key: 'dana' as PaymentMethod, label: 'DANA', icon: <Smartphone className="w-6 h-6" /> },
  { key: 'shopeepay' as PaymentMethod, label: 'ShopeePay', icon: <Smartphone className="w-6 h-6" /> },
];

export function PaymentsPanel() {
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<DemoPayment | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('qris');

  const filteredPayments = useMemo(() => {
    if (activeFilter === 'all') return demoPayments;
    return demoPayments.filter((p) => p.status === activeFilter);
  }, [activeFilter]);

  const stats = useMemo(() => {
    const total = demoPayments.reduce((s, p) => s + p.amount, 0);
    const pending = demoPayments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
    const success = demoPayments.filter((p) => p.status === 'success').reduce((s, p) => s + p.amount, 0);
    const refunded = demoPayments.filter((p) => p.status === 'refunded').reduce((s, p) => s + p.amount, 0);
    return { total, pending, success, refunded };
  }, []);

  const handlePayNow = (payment: DemoPayment) => {
    setSelectedPayment(payment);
    setPaymentDialogOpen(true);
  };

  const handleConfirmPayment = () => {
    toast({
      title: 'Pembayaran Dikonfirmasi',
      description: 'Pembayaran Anda sedang diproses. Silakan tunggu konfirmasi.',
    });
    setPaymentDialogOpen(false);
    setSelectedPayment(null);
  };

  const handleViewDetail = (payment: DemoPayment) => {
    toast({
      title: 'Detail Pembayaran',
      description: `Invoice: ${payment.invoiceNumber} - ${formatCurrency(payment.amount)}`,
    });
  };

  const handleDownload = (payment: DemoPayment) => {
    toast({
      title: 'Bukti Pembayaran',
      description: `Bukti pembayaran ${payment.invoiceNumber} berhasil diunduh`,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Pembayaran</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(stats.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Menunggu</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(stats.pending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Berhasil</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(stats.success)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/50 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dikembalikan</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(stats.refunded)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterKey)}>
        <TabsList className="grid w-full max-w-lg grid-cols-5">
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="pending">Menunggu</TabsTrigger>
          <TabsTrigger value="success">Berhasil</TabsTrigger>
          <TabsTrigger value="failed">Gagal</TabsTrigger>
          <TabsTrigger value="refunded">Kembali</TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="mt-4 space-y-3">
          {filteredPayments.length === 0 ? (
            <Card className="border-0 bg-muted/50">
              <CardContent className="p-12 text-center">
                <CreditCard className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Tidak ada pembayaran</p>
              </CardContent>
            </Card>
          ) : (
            filteredPayments.map((payment) => {
              const sc = statusConfig[payment.status];
              const mc = methodLabels[payment.method];

              return (
                <Card key={payment.id} className="border-0 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                          payment.type === 'Konsultasi'
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                            : payment.type === 'Farmasi'
                              ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                              : 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                        )}>
                          {typeIcons[payment.type]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-mono text-xs text-muted-foreground">{payment.invoiceNumber}</p>
                            <Badge variant="outline" className="text-[10px]">{payment.type}</Badge>
                          </div>
                          <p className="font-semibold text-sm text-foreground mt-0.5">{payment.description}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              {mc.icon}
                              {mc.label}
                            </span>
                            <span className="text-xs text-muted-foreground">{formatDate(payment.date)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                        <p className="text-base font-bold text-foreground">{formatCurrency(payment.amount)}</p>
                        <Badge className={cn('text-[10px] border-0', sc.className)}>{sc.label}</Badge>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      {payment.status === 'pending' && (
                        <Button size="sm" onClick={() => handlePayNow(payment)}>
                          <Wallet className="w-3.5 h-3.5 mr-1" />
                          Bayar
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleViewDetail(payment)}>
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Lihat Detail
                      </Button>
                      {payment.status === 'success' && (
                        <Button variant="outline" size="sm" onClick={() => handleDownload(payment)}>
                          <Download className="w-3.5 h-3.5 mr-1" />
                          Unduh Bukti
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pembayaran</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Pembayaran</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(selectedPayment.amount)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{selectedPayment.description}</p>
              </div>

              <div className="space-y-2">
                <Label>Pilih Metode Pembayaran</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {paymentMethods.map((pm) => (
                    <Button
                      key={pm.key}
                      variant={selectedMethod === pm.key ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-auto py-2 flex flex-col items-center gap-1',
                        selectedMethod === pm.key && 'ring-2 ring-primary'
                      )}
                      onClick={() => setSelectedMethod(pm.key)}
                    >
                      {pm.icon}
                      <span className="text-[10px]">{pm.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* QR Code placeholder */}
              {selectedMethod === 'qris' && (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
                  <QrCode className="w-32 h-32 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-muted-foreground">Scan QR Code untuk membayar</p>
                </div>
              )}

              {/* Bank Transfer details */}
              {(selectedMethod === 'bank_transfer' || selectedMethod === 'va') && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium">Detail Transfer Bank</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank</span>
                      <span className="font-medium">BCA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">No. Rekening</span>
                      <span className="font-mono font-medium">8720-3456-7890</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Atas Nama</span>
                      <span className="font-medium">PT MedikaLink Indonesia</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Jumlah</span>
                      <span className="font-bold text-primary">{formatCurrency(selectedPayment.amount)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* E-Wallet info */}
              {(selectedMethod === 'gopay' || selectedMethod === 'ovo' || selectedMethod === 'dana' || selectedMethod === 'shopeepay') && (
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <Smartphone className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Anda akan diarahkan ke aplikasi {methodLabels[selectedMethod].label}
                  </p>
                </div>
              )}

              <Button className="w-full" size="lg" onClick={handleConfirmPayment}>
                Konfirmasi Pembayaran
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
