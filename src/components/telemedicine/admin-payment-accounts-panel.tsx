'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  QrCode,
  Plus,
  Edit,
  Trash2,
  Loader2,
  CreditCard,
} from 'lucide-react';

type PaymentAccountMethod = 'bank_transfer' | 'va' | 'qris';

interface PaymentAccount {
  id: string;
  method: PaymentAccountMethod;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  qrisImageUrl?: string;
  isActive: boolean;
  displayOrder: number;
}

const methodLabel: Record<PaymentAccountMethod, string> = {
  bank_transfer: 'Transfer Bank',
  va: 'Virtual Account',
  qris: 'QRIS',
};

const emptyForm = {
  method: 'bank_transfer' as PaymentAccountMethod,
  bankName: '',
  accountNumber: '',
  accountHolder: '',
  qrisImageUrl: '',
};

export function AdminPaymentAccountsPanel() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PaymentAccount | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payment-accounts');
      const data = await res.json();
      if (res.ok && Array.isArray(data?.accounts)) {
        setAccounts(data.accounts);
      } else {
        toast({ title: 'Gagal memuat rekening', description: data?.details || 'Terjadi kesalahan.', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Gagal memuat rekening', description: 'Periksa koneksi Anda.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const openAddDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (acc: PaymentAccount) => {
    setEditingId(acc.id);
    setForm({
      method: acc.method,
      bankName: acc.bankName || '',
      accountNumber: acc.accountNumber || '',
      accountHolder: acc.accountHolder || '',
      qrisImageUrl: acc.qrisImageUrl || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (form.method === 'qris' && !form.qrisImageUrl.trim()) {
      toast({ title: 'URL Gambar QRIS wajib diisi', variant: 'destructive' });
      return;
    }
    if (form.method !== 'qris' && (!form.bankName.trim() || !form.accountNumber.trim() || !form.accountHolder.trim())) {
      toast({ title: 'Nama bank, nomor rekening, dan nama pemilik wajib diisi', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        method: form.method,
        bankName: form.method !== 'qris' ? form.bankName.trim() : undefined,
        accountNumber: form.method !== 'qris' ? form.accountNumber.trim() : undefined,
        accountHolder: form.method !== 'qris' ? form.accountHolder.trim() : undefined,
        qrisImageUrl: form.method === 'qris' ? form.qrisImageUrl.trim() : undefined,
      };

      const res = editingId
        ? await fetch('/api/admin/payment-accounts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingId, ...payload }),
          })
        : await fetch('/api/admin/payment-accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.details || data?.error || 'Gagal menyimpan rekening');

      toast({ title: editingId ? 'Rekening Diperbarui' : 'Rekening Ditambahkan' });
      setDialogOpen(false);
      loadAccounts();
    } catch (err) {
      toast({
        title: 'Gagal Menyimpan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (acc: PaymentAccount) => {
    try {
      const res = await fetch('/api/admin/payment-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: acc.id, isActive: !acc.isActive }),
      });
      if (!res.ok) throw new Error('Gagal memperbarui status');
      setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, isActive: !a.isActive } : a)));
    } catch (err) {
      toast({ title: 'Gagal memperbarui status', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/payment-accounts?id=${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus rekening');
      setAccounts((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast({ title: 'Rekening Dihapus' });
      setDeleteTarget(null);
    } catch (err) {
      toast({ title: 'Gagal Menghapus', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Kelola Rekening Pembayaran
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Rekening bank/QRIS di sini akan tampil ke pasien saat memilih metode pembayaran.
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Rekening
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Memuat rekening...
        </div>
      ) : accounts.length === 0 ? (
        <Card className="border-0 bg-muted/50">
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Belum ada rekening pembayaran</p>
            <p className="text-muted-foreground text-sm mt-1">
              Pasien akan melihat pesan "rekening belum tersedia" sampai Anda menambahkan satu.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <Card key={acc.id} className={!acc.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {acc.method === 'qris' ? <QrCode className="w-4.5 h-4.5 text-primary" /> : <Building2 className="w-4.5 h-4.5 text-primary" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{methodLabel[acc.method]}</p>
                      <Badge variant="outline" className={acc.isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-300'}>
                        {acc.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    {acc.method === 'qris' ? (
                      <p className="text-xs text-muted-foreground mt-1 break-all max-w-md">{acc.qrisImageUrl}</p>
                    ) : (
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <p>{acc.bankName} — <span className="font-mono">{acc.accountNumber}</span></p>
                        <p>a.n. {acc.accountHolder}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={acc.isActive} onCheckedChange={() => handleToggleActive(acc)} />
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(acc)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(acc)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Rekening' : 'Tambah Rekening'}</DialogTitle>
            <DialogDescription>Detail ini akan tampil ke pasien saat memilih metode pembayaran.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Metode</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v as PaymentAccountMethod })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Transfer Bank</SelectItem>
                  <SelectItem value="va">Virtual Account</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.method === 'qris' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">URL Gambar QRIS</Label>
                <Input
                  value={form.qrisImageUrl}
                  onChange={(e) => setForm({ ...form, qrisImageUrl: e.target.value })}
                  placeholder="https://..."
                />
                <p className="text-[11px] text-muted-foreground">
                  Unggah gambar QR code Anda ke layanan hosting gambar, lalu tempel URL-nya di sini.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Nama Bank</Label>
                  <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="Contoh: BCA" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Nomor Rekening / VA</Label>
                  <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="Contoh: 8720345678" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Atas Nama</Label>
                  <Input value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} placeholder="Contoh: PT CareLivia Indonesia" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Rekening?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.method === 'qris' ? 'QRIS' : `${deleteTarget?.bankName} — ${deleteTarget?.accountNumber}`} akan dihapus permanen dan tidak lagi tampil ke pasien.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
