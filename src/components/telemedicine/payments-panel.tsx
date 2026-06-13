'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import type { PaymentStatus, PaymentMethod, Payment, Prescription } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Receipt,
  ClipboardList,
  CheckCheck,
  ArrowRight,
  Hash,
  ShoppingCart,
  Calendar,
  Stamp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PaymentType = 'Konsultasi' | 'Farmasi' | 'Home Care' | 'E-Resep';

interface MergedPayment {
  id: string;
  invoiceNumber: string;
  type: PaymentType;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  date: string;
  description: string;
  referenceId?: string;
  paidAt?: string;
  // For prescription-linked payments
  prescriptionId?: string;
  prescriptionItems?: { name: string; dosage: string; quantity: number; price?: number }[];
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const demoPayments: MergedPayment[] = [
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
  'E-Resep': <ClipboardList className="w-4 h-4" />,
};

const typeColors: Record<PaymentType, string> = {
  Konsultasi: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
  Farmasi: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
  'Home Care': 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400',
  'E-Resep': 'bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400',
};

const paymentMethods = [
  { key: 'qris' as PaymentMethod, label: 'QRIS', icon: <QrCode className="w-6 h-6" /> },
  { key: 'bank_transfer' as PaymentMethod, label: 'Transfer Bank', icon: <Building2 className="w-6 h-6" /> },
  { key: 'va' as PaymentMethod, label: 'Virtual Account', icon: <Building2 className="w-6 h-6" /> },
  { key: 'gopay' as PaymentMethod, label: 'GoPay', icon: <Smartphone className="w-6 h-6" /> },
  { key: 'ovo' as PaymentMethod, label: 'OVO', icon: <Smartphone className="w-6 h-6" /> },
  { key: 'dana' as PaymentMethod, label: 'DANA', icon: <Smartphone className="w-6 h-6" /> },
  { key: 'shopeepay' as PaymentMethod, label: 'ShopeePay', icon: <Smartphone className="w-6 h-6" /> },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function generateInvoiceNumber(): string {
  return `INV-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Build merged payments from demo + store
// ---------------------------------------------------------------------------

function buildMergedPayments(storePayments: Payment[]): MergedPayment[] {
  const payMap = new Map<string, MergedPayment>();

  // Add demo payments
  for (const dp of demoPayments) {
    payMap.set(dp.id, dp);
  }

  // Add store payments
  for (const sp of storePayments) {
    const typeLabel = sp.type === 'prescription' ? 'E-Resep' : sp.type === 'consultation' ? 'Konsultasi' : sp.type === 'pharmacy' ? 'Farmasi' : sp.type === 'homecare' ? 'Home Care' : 'Konsultasi';
    payMap.set(sp.id, {
      id: sp.id,
      invoiceNumber: sp.invoiceNumber || `INV-${sp.id}`,
      type: typeLabel as PaymentType,
      amount: sp.amount,
      method: sp.method,
      status: sp.status,
      date: sp.paidAt || sp.createdAt,
      description: sp.type === 'prescription' ? `Pembayaran E-Resep - INV-${sp.id.slice(-6)}` : `Pembayaran ${typeLabel}`,
      referenceId: sp.referenceId,
      paidAt: sp.paidAt,
    });
  }

  return Array.from(payMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

// ---------------------------------------------------------------------------
// PaymentsPanel
// ---------------------------------------------------------------------------

export function PaymentsPanel() {
  const { toast } = useToast();
  const { payments, setPayments, updatePrescriptionStatus, prescriptions } = useStore();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<MergedPayment | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('qris');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Payment proof dialog
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [proofPayment, setProofPayment] = useState<MergedPayment | null>(null);

  // Prescription checkout dialog (launched from Bayar Sekarang)
  const [prescriptionCheckoutOpen, setPrescriptionCheckoutOpen] = useState(false);
  const [checkoutPrescription, setCheckoutPrescription] = useState<Prescription | null>(null);
  const [checkoutMethod, setCheckoutMethod] = useState<PaymentMethod>('qris');

  // Listen for prescription checkout from store
  const pendingCheckout = useStore((s) => s.pendingPrescriptionCheckout);
  const clearPendingCheckout = useStore((s) => s.setPendingPrescriptionCheckout);
  const lastProcessedId = useRef<string>('');

  // Use a callback ref pattern to avoid setState in useEffect
  const handlePendingCheckout = useCallback(() => {
    if (pendingCheckout && pendingCheckout.id !== lastProcessedId.current) {
      lastProcessedId.current = pendingCheckout.id;
      setCheckoutPrescription(pendingCheckout);
      setPrescriptionCheckoutOpen(true);
      clearPendingCheckout(null);
    }
  }, [pendingCheckout, clearPendingCheckout]);

  // Subscribe to store changes outside of render
  useEffect(() => {
    if (pendingCheckout && pendingCheckout.id !== lastProcessedId.current) {
      // Use requestAnimationFrame to defer setState outside of the effect's synchronous phase
      requestAnimationFrame(() => handlePendingCheckout());
    }
  }, [pendingCheckout, handlePendingCheckout]);

  // Build merged payments
  const allPayments = useMemo(
    () => buildMergedPayments(payments),
    [payments],
  );

  const filteredPayments = useMemo(() => {
    if (activeFilter === 'all') return allPayments;
    return allPayments.filter((p) => p.status === activeFilter);
  }, [allPayments, activeFilter]);

  const stats = useMemo(() => {
    const total = allPayments.reduce((s, p) => s + p.amount, 0);
    const pending = allPayments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
    const success = allPayments.filter((p) => p.status === 'success').reduce((s, p) => s + p.amount, 0);
    const refunded = allPayments.filter((p) => p.status === 'refunded').reduce((s, p) => s + p.amount, 0);
    return { total, pending, success, refunded };
  }, [allPayments]);

  // ── Handle pay from prescription checkout ────────────────────────────
  const handlePrescriptionCheckout = useCallback(() => {
    console.log('[DEBUG] handlePrescriptionCheckout called, checkoutPrescription:', checkoutPrescription?.id);
    if (!checkoutPrescription) {
      console.log('[DEBUG] checkoutPrescription is null, returning early');
      return;
    }

    setProcessingPayment(true);
    const rx = checkoutPrescription;
    const totalAmount = (rx.items || []).reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    console.log('[DEBUG] Processing payment, totalAmount:', totalAmount, 'rx.id:', rx.id);

    // Simulate processing delay
    setTimeout(() => {
      const paymentId = `pay-rx-${Date.now()}`;
      const newPayment: Payment = {
        id: paymentId,
        userId: rx.patientId,
        amount: totalAmount,
        method: checkoutMethod,
        status: 'success',
        type: 'prescription',
        referenceId: rx.id,
        invoiceNumber: generateInvoiceNumber(),
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setPayments([newPayment, ...useStore.getState().payments]);
      updatePrescriptionStatus(rx.id, 'paid');

      setProcessingPayment(false);
      setPrescriptionCheckoutOpen(false);
      setCheckoutPrescription(null);

      toast({
        title: 'Pembayaran Berhasil! ✅',
        description: `Pembayaran E-Resep ${formatCurrency(totalAmount)} via ${methodLabels[checkoutMethod].label} berhasil.`,
      });
    }, 1500);
  }, [checkoutPrescription, checkoutMethod, setPayments, updatePrescriptionStatus, toast]);

  // ── Handle pay from existing pending payment ─────────────────────────
  const handlePayNow = (payment: MergedPayment) => {
    setSelectedPayment(payment);
    setPaymentDialogOpen(true);
  };

  const handleConfirmPayment = useCallback(() => {
    if (!selectedPayment) return;

    setProcessingPayment(true);

    // Simulate processing
    setTimeout(() => {
      // Update the store payment status
      const updatedPayments = useStore.getState().payments.map((p) =>
        p.id === selectedPayment.id ? { ...p, status: 'success' as const, paidAt: new Date().toISOString() } : p,
      );
      setPayments(updatedPayments);

      // If linked to prescription, update that too
      if (selectedPayment.referenceId) {
        updatePrescriptionStatus(selectedPayment.referenceId, 'paid');
      }

      setProcessingPayment(false);
      setPaymentDialogOpen(false);
      setSelectedPayment(null);

      toast({
        title: 'Pembayaran Berhasil! ✅',
        description: `Pembayaran ${selectedPayment.description} ${formatCurrency(selectedPayment.amount)} berhasil.`,
      });
    }, 1500);
  }, [selectedPayment, setPayments, updatePrescriptionStatus, toast]);

  const handleViewDetail = (payment: MergedPayment) => {
    if (payment.status === 'success') {
      setProofPayment(payment);
      setProofDialogOpen(true);
    } else {
      toast({
        title: 'Detail Pembayaran',
        description: `Invoice: ${payment.invoiceNumber} - ${formatCurrency(payment.amount)}`,
      });
    }
  };

  const handleDownload = (payment: MergedPayment) => {
    if (payment.status === 'success') {
      // Open the payment proof API endpoint in a new tab for download
      const items = payment.prescriptionItems || [];
      const params = new URLSearchParams({
        invoiceNumber: payment.invoiceNumber,
        amount: String(payment.amount),
        method: payment.method,
        paidAt: payment.paidAt || payment.date,
        patientName: '',
        doctorName: '',
        prescriptionId: payment.prescriptionId || '',
        items: JSON.stringify(items.map((item) => ({
          name: item.name,
          dosage: item.dosage,
          quantity: item.quantity,
          price: item.price || 0,
        }))),
      });
      window.open(`/api/payment-proof?${params.toString()}`, '_blank');
    } else {
      toast({
        title: 'Bukti Pembayaran',
        description: `Bukti pembayaran hanya tersedia untuk pembayaran yang berhasil`,
        variant: 'destructive',
      });
    }
  };

  // ── Render Prescription Checkout Dialog ──────────────────────────────
  const renderPrescriptionCheckout = () => {
    if (!checkoutPrescription) return null;

    const rx = checkoutPrescription;
    const items = rx.items || [];
    const totalAmount = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

    return (
      <Dialog open={prescriptionCheckoutOpen} onOpenChange={(open) => {
        if (!processingPayment) {
          setPrescriptionCheckoutOpen(open);
          if (!open) setCheckoutPrescription(null);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Pembayaran E-Resep
            </DialogTitle>
            <DialogDescription className="sr-only">
              Dialog pembayaran e-resep dokter
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
            {/* Prescription Summary */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-primary/10 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm text-primary">Detail E-Resep</span>
                </div>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-0 text-[10px]">
                  Menunggu Pembayaran
                </Badge>
              </div>

              <div className="px-4 py-3">
                {/* Medicine Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 text-muted-foreground font-medium">Obat</th>
                        <th className="text-center py-1.5 text-muted-foreground font-medium">Qty</th>
                        <th className="text-right py-1.5 text-muted-foreground font-medium">Harga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b border-border/50 last:border-0">
                          <td className="py-1.5">
                            <p className="font-medium text-foreground">{item.medicineName}</p>
                            <p className="text-muted-foreground">{item.dosage}</p>
                          </td>
                          <td className="py-1.5 text-center text-foreground">{item.quantity}</td>
                          <td className="py-1.5 text-right text-foreground">{formatCurrency(item.price || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                  <span className="font-semibold text-sm">Total Pembayaran</span>
                  <span className="font-bold text-lg text-primary">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pilih Metode Pembayaran</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {paymentMethods.map((pm) => (
                  <Button
                    key={pm.key}
                    variant={checkoutMethod === pm.key ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-auto py-2.5 flex flex-col items-center gap-1',
                      checkoutMethod === pm.key && 'ring-2 ring-primary',
                    )}
                    onClick={() => setCheckoutMethod(pm.key)}
                    disabled={processingPayment}
                  >
                    {pm.icon}
                    <span className="text-[10px]">{pm.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* QR Code */}
            {checkoutMethod === 'qris' && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 text-center">
                <QrCode className="w-28 h-28 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-muted-foreground">Scan QR Code untuk membayar</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Batas waktu pembayaran 15 menit
                </p>
              </div>
            )}

            {/* Bank Transfer */}
            {(checkoutMethod === 'bank_transfer' || checkoutMethod === 'va') && (
              <div className="bg-muted/50 rounded-xl p-4 space-y-2.5">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Detail Transfer
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank</span>
                    <span className="font-medium">BCA</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">No. Rekening</span>
                    <span className="font-mono font-bold">8720-3456-7890</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Atas Nama</span>
                    <span className="font-medium">PT CareLivia Indonesia</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jumlah</span>
                    <span className="font-bold text-primary">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* E-Wallet */}
            {(checkoutMethod === 'gopay' || checkoutMethod === 'ovo' || checkoutMethod === 'dana' || checkoutMethod === 'shopeepay') && (
              <div className="bg-muted/50 rounded-xl p-6 text-center">
                <Smartphone className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Anda akan diarahkan ke aplikasi {methodLabels[checkoutMethod].label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pastikan aplikasi {methodLabels[checkoutMethod].label} sudah terinstall
                </p>
              </div>
            )}

            {/* Confirm Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handlePrescriptionCheckout}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Memproses Pembayaran...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Bayar {formatCurrency(totalAmount)}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ── Render Payment Detail Dialog ─────────────────────────────────────
  const renderPaymentDialog = () => (
    <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
      if (!processingPayment) {
        setPaymentDialogOpen(open);
        if (!open) setSelectedPayment(null);
      }
    }}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Pembayaran</DialogTitle>
          <DialogDescription className="sr-only">
            Dialog pembayaran transaksi
          </DialogDescription>
        </DialogHeader>
        {selectedPayment && (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
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
                      selectedMethod === pm.key && 'ring-2 ring-primary',
                    )}
                    onClick={() => setSelectedMethod(pm.key)}
                    disabled={processingPayment}
                  >
                    {pm.icon}
                    <span className="text-[10px]">{pm.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {selectedMethod === 'qris' && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
                <QrCode className="w-32 h-32 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-muted-foreground">Scan QR Code untuk membayar</p>
              </div>
            )}

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
                    <span className="font-medium">PT CareLivia Indonesia</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jumlah</span>
                    <span className="font-bold text-primary">{formatCurrency(selectedPayment.amount)}</span>
                  </div>
                </div>
              </div>
            )}

            {(selectedMethod === 'gopay' || selectedMethod === 'ovo' || selectedMethod === 'dana' || selectedMethod === 'shopeepay') && (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Smartphone className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Anda akan diarahkan ke aplikasi {methodLabels[selectedMethod].label}
                </p>
              </div>
            )}

            <Button className="w-full" size="lg" onClick={handleConfirmPayment} disabled={processingPayment}>
              {processingPayment ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Memproses...
                </>
              ) : (
                'Konfirmasi Pembayaran'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  type FilterKey = 'all' | PaymentStatus;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Pembayaran</h2>
          <p className="text-sm text-muted-foreground">Kelola pembayaran dan riwayat transaksi</p>
        </div>
        <Badge className="bg-primary/10 text-primary border-0">
          <Receipt className="w-3.5 h-3.5 mr-1" />
          {allPayments.length} Transaksi
        </Badge>
      </div>

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

        <TabsContent value={activeFilter} className="mt-4 space-y-3 overflow-y-auto custom-scrollbar">
          {filteredPayments.length === 0 ? (
            <Card className="border-0 bg-muted/50">
              <CardContent className="p-12 text-center">
                <CreditCard className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Tidak ada pembayaran</p>
              </CardContent>
            </Card>
          ) : (
            <div className="max-h-[calc(100vh-360px)] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {filteredPayments.map((payment) => {
                const sc = statusConfig[payment.status];
                const mc = methodLabels[payment.method];
                const pType = payment.type;

                return (
                  <Card key={payment.id} className="border-0 hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                            typeColors[pType] || 'bg-gray-100 text-gray-600',
                          )}>
                            {typeIcons[pType] || <CreditCard className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-mono text-xs text-muted-foreground">{payment.invoiceNumber}</p>
                              <Badge variant="outline" className="text-[10px]">{pType}</Badge>
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
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {renderPrescriptionCheckout()}
      {renderPaymentDialog()}

      {/* Payment Proof Dialog */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Bukti Pembayaran
            </DialogTitle>
            <DialogDescription className="sr-only">
              Dialog bukti pembayaran yang telah berhasil
            </DialogDescription>
          </DialogHeader>
          {proofPayment && (
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
              {/* Status Banner */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">Pembayaran Berhasil</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">
                    {proofPayment.paidAt ? formatDate(proofPayment.paidAt) : formatDate(proofPayment.date)}
                  </p>
                </div>
              </div>

              {/* Invoice Info */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-primary/5 px-4 py-3">
                  <p className="font-semibold text-sm text-primary">Detail Pembayaran</p>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">No. Invoice</span>
                    <span className="font-mono font-semibold">{proofPayment.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tipe</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      {typeIcons[proofPayment.type]}
                      {proofPayment.type}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deskripsi</span>
                    <span className="font-medium text-right max-w-[200px]">{proofPayment.description}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Metode Bayar</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      {methodLabels[proofPayment.method].icon}
                      {methodLabels[proofPayment.method].label}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tanggal Bayar</span>
                    <span className="font-medium">
                      {proofPayment.paidAt ? formatDate(proofPayment.paidAt) : formatDate(proofPayment.date)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Prescription Items (if e-resep) */}
              {proofPayment.prescriptionItems && proofPayment.prescriptionItems.length > 0 && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-violet-50 dark:bg-violet-950/30 px-4 py-3">
                    <p className="font-semibold text-sm text-violet-700 dark:text-violet-400">Detail Obat</p>
                  </div>
                  <div className="px-4 py-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-1.5 text-muted-foreground font-medium">Obat</th>
                          <th className="text-center py-1.5 text-muted-foreground font-medium">Qty</th>
                          <th className="text-right py-1.5 text-muted-foreground font-medium">Harga</th>
                          <th className="text-right py-1.5 text-muted-foreground font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proofPayment.prescriptionItems.map((item, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="py-1.5">
                              <p className="font-medium text-foreground">{item.name}</p>
                              <p className="text-muted-foreground">{item.dosage}</p>
                            </td>
                            <td className="py-1.5 text-center text-foreground">{item.quantity}</td>
                            <td className="py-1.5 text-right text-foreground">{formatCurrency(item.price || 0)}</td>
                            <td className="py-1.5 text-right font-medium text-foreground">
                              {formatCurrency((item.price || 0) * item.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Total Amount */}
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
                <span className="font-semibold text-sm">Total Pembayaran</span>
                <span className="font-bold text-lg text-primary">{formatCurrency(proofPayment.amount)}</span>
              </div>

              {/* Stamp */}
              <div className="flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-2 border-emerald-500 flex items-center justify-center opacity-60 -rotate-12">
                  <div className="text-center">
                    <Stamp className="w-4 h-4 text-emerald-600 mx-auto" />
                    <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">Dibayar</span>
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleDownload(proofPayment)}
              >
                <Download className="w-4 h-4 mr-2" />
                Unduh Bukti Pembayaran
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
