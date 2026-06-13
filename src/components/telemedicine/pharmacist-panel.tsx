'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import type { MedicineCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Pill,
  Package,
  ShoppingCart,
  FileText,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  TrendingUp,
  Box,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Demo prescriptions
const demoPrescriptions = [
  {
    id: 'rx1',
    patient: 'Rina Wulandari',
    doctor: 'dr. Andi Pratama',
    date: '2025-01-10',
    items: [
      { name: 'Antasida', dosage: '3x sehari', quantity: 30 },
      { name: 'Omeprazole 20mg', dosage: '1x sehari', quantity: 14 },
    ],
    status: 'pending',
  },
  {
    id: 'rx2',
    patient: 'Ahmad Fauzi',
    doctor: 'dr. Siti Rahayu',
    date: '2025-01-09',
    items: [
      { name: 'Asam Folat 400mcg', dosage: '1x sehari', quantity: 30 },
      { name: 'Vitamin B6', dosage: '1x sehari', quantity: 30 },
    ],
    status: 'processing',
  },
  {
    id: 'rx3',
    patient: 'Dewi Sartika',
    doctor: 'dr. Budi Santoso',
    date: '2025-01-08',
    items: [
      { name: 'Paracetamol 500mg', dosage: '3x sehari', quantity: 21 },
    ],
    status: 'completed',
  },
];

// Demo orders
const demoOrders = [
  {
    id: 'ORD-001',
    patient: 'Rina Wulandari',
    items: [{ name: 'Antasida', qty: 2 }, { name: 'Omeprazole 20mg', qty: 1 }],
    total: 85000,
    status: 'pending',
    date: '2025-01-10',
  },
  {
    id: 'ORD-002',
    patient: 'Bambang S.',
    items: [{ name: 'Vitamin C 1000mg', qty: 3 }],
    total: 45000,
    status: 'confirmed',
    date: '2025-01-09',
  },
  {
    id: 'ORD-003',
    patient: 'Siti Aminah',
    items: [{ name: 'Metformin 500mg', qty: 2 }, { name: 'Paracetamol 500mg', qty: 1 }],
    total: 120000,
    status: 'shipped',
    date: '2025-01-08',
  },
  {
    id: 'ORD-004',
    patient: 'Dewi Sartika',
    items: [{ name: 'Amoxicillin 500mg', qty: 1 }],
    total: 35000,
    status: 'delivered',
    date: '2025-01-07',
  },
];

function formatCurrency(amount: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
}

const categoryLabels: Record<MedicineCategory, string> = {
  resep: 'Obat Resep',
  bebas: 'Obat Bebas',
  vitamin: 'Vitamin',
  alat_kesehatan: 'Alat Kesehatan',
};

const orderStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Menunggu', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  confirmed: { label: 'Dikonfirmasi', className: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400' },
  processing: { label: 'Diproses', className: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400' },
  shipped: { label: 'Dikirim', className: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400' },
  delivered: { label: 'Diterima', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  cancelled: { label: 'Dibatalkan', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' },
};

const rxStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Menunggu', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  processing: { label: 'Diproses', className: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400' },
  completed: { label: 'Selesai', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
};

export function PharmacistPanel() {
  const { medicines } = useStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [medDialogOpen, setMedDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<string | null>(null);

  // Medicine form state
  const [medName, setMedName] = useState('');
  const [medGenericName, setMedGenericName] = useState('');
  const [medCategory, setMedCategory] = useState<MedicineCategory>('bebas');
  const [medPrice, setMedPrice] = useState('');
  const [medStock, setMedStock] = useState('');
  const [medUnit, setMedUnit] = useState('');
  const [medManufacturer, setMedManufacturer] = useState('');

  const filteredMedicines = useMemo(() => {
    if (!searchQuery.trim()) return medicines;
    const q = searchQuery.toLowerCase();
    return medicines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.genericName && m.genericName.toLowerCase().includes(q))
    );
  }, [medicines, searchQuery]);

  const handleOpenAddMedicine = () => {
    setEditingMedicine(null);
    setMedName('');
    setMedGenericName('');
    setMedCategory('bebas');
    setMedPrice('');
    setMedStock('');
    setMedUnit('');
    setMedManufacturer('');
    setMedDialogOpen(true);
  };

  const handleOpenEditMedicine = (med: typeof medicines[number]) => {
    setEditingMedicine(med.id);
    setMedName(med.name);
    setMedGenericName(med.genericName || '');
    setMedCategory(med.category);
    setMedPrice(String(med.price));
    setMedStock(String(med.stock));
    setMedUnit(med.unit || '');
    setMedManufacturer(med.manufacturer || '');
    setMedDialogOpen(true);
  };

  const handleSaveMedicine = () => {
    toast({
      title: editingMedicine ? 'Obat Diperbarui' : 'Obat Ditambahkan',
      description: `${medName} berhasil ${editingMedicine ? 'diperbarui' : 'ditambahkan'}`,
    });
    setMedDialogOpen(false);
  };

  const handleDeleteMedicine = (name: string) => {
    toast({
      title: 'Obat Dihapus',
      description: `${name} telah dihapus dari daftar`,
      variant: 'destructive',
    });
  };

  const handleProcessPrescription = (rxId: string) => {
    toast({ title: 'Resep Diproses', description: 'Resep sedang disiapkan' });
  };

  const handleCompletePrescription = (rxId: string) => {
    toast({ title: 'Resep Selesai', description: 'Resep telah selesai disiapkan' });
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: string) => {
    toast({ title: 'Status Diperbarui', description: `Pesanan ${orderId} diubah ke ${newStatus}` });
  };

  // Stats
  const totalMedicines = medicines.length;
  const lowStockCount = medicines.filter((m) => m.stock <= 10 && m.stock > 0).length;
  const outOfStockCount = medicines.filter((m) => m.stock === 0).length;
  const pendingPrescriptions = demoPrescriptions.filter((r) => r.status === 'pending').length;
  const todayOrders = demoOrders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="stock">Stok Obat</TabsTrigger>
          <TabsTrigger value="prescriptions">Resep</TabsTrigger>
          <TabsTrigger value="orders">Pesanan</TabsTrigger>
        </TabsList>

        {/* ==================== DASHBOARD TAB ==================== */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                    <Package className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Obat</p>
                    <p className="text-lg font-bold text-foreground">{totalMedicines}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Resep Masuk</p>
                    <p className="text-lg font-bold text-foreground">{pendingPrescriptions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pesanan Hari Ini</p>
                    <p className="text-lg font-bold text-foreground">{todayOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Penjualan Bulan Ini</p>
                    <p className="text-lg font-bold text-foreground">Rp 12.5jt</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {(lowStockCount > 0 || outOfStockCount > 0) && (
            <Card className="border-0 bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold text-sm">Peringatan Stok</span>
                </div>
                <div className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-300">
                  {outOfStockCount > 0 && <p>- {outOfStockCount} obat habis</p>}
                  {lowStockCount > 0 && <p>- {lowStockCount} obat stok rendah</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== STOK OBAT TAB ==================== */}
        <TabsContent value="stock" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari obat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleOpenAddMedicine}>
              <Plus className="w-4 h-4 mr-1" />
              Tambah Obat
            </Button>
          </div>

          <Card className="border-0">
            <CardContent className="p-0">
              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead className="hidden sm:table-cell">Kategori</TableHead>
                      <TableHead>Harga</TableHead>
                      <TableHead>Stok</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMedicines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Tidak ada obat ditemukan
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMedicines.map((med) => {
                        const stockStatus =
                          med.stock === 0
                            ? { label: 'Habis', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' }
                            : med.stock <= 10
                              ? { label: 'Stok Rendah', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' }
                              : { label: 'Tersedia', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' };

                        return (
                          <TableRow key={med.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{med.name}</p>
                                {med.genericName && (
                                  <p className="text-xs text-muted-foreground">{med.genericName}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="outline" className="text-[10px]">
                                {categoryLabels[med.category]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{formatCurrency(med.price)}</TableCell>
                            <TableCell className="text-sm font-medium">{med.stock}</TableCell>
                            <TableCell>
                              <Badge className={cn('text-[10px] border-0', stockStatus.className)}>
                                {stockStatus.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditMedicine(med)}>
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteMedicine(med.name)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== RESEP MASUK TAB ==================== */}
        <TabsContent value="prescriptions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Resep Masuk</h3>
            <Badge variant="secondary">{demoPrescriptions.filter((r) => r.status === 'pending').length} menunggu</Badge>
          </div>

          {demoPrescriptions.map((rx) => {
            const sc = rxStatusConfig[rx.status] || rxStatusConfig.pending;

            return (
              <Card key={rx.id} className="border-0 hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{rx.patient}</p>
                        <p className="text-xs text-muted-foreground">{rx.doctor}</p>
                        <p className="text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(rx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn('text-[10px] border-0', sc.className)}>{sc.label}</Badge>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {rx.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-2">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.dosage} (x{item.quantity})</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    {rx.status === 'pending' && (
                      <Button size="sm" onClick={() => handleProcessPrescription(rx.id)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Proses
                      </Button>
                    )}
                    {rx.status === 'processing' && (
                      <Button size="sm" onClick={() => handleCompletePrescription(rx.id)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Selesai
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ==================== PESANAN TAB ==================== */}
        <TabsContent value="orders" className="space-y-4 mt-4">
          {demoOrders.map((order) => {
            const sc = orderStatusConfig[order.status] || orderStatusConfig.pending;

            return (
              <Card key={order.id} className="border-0 hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{order.id}</p>
                        <p className="font-semibold text-sm">{order.patient}</p>
                        <p className="text-xs text-muted-foreground">{order.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(order.total)}</p>
                      <Badge className={cn('text-[10px] border-0', sc.className)}>{sc.label}</Badge>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    {order.items.map((item, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        {item.name} x{item.qty}
                      </p>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    {order.status === 'pending' && (
                      <Button size="sm" onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}>
                        Konfirmasi
                      </Button>
                    )}
                    {order.status === 'confirmed' && (
                      <Button size="sm" onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}>
                        Kirim
                      </Button>
                    )}
                    {(order.status === 'pending' || order.status === 'confirmed') && (
                      <Button variant="outline" size="sm" onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}>
                        Batalkan
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Medicine Dialog */}
      <Dialog open={medDialogOpen} onOpenChange={setMedDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMedicine ? 'Edit Obat' : 'Tambah Obat Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Obat</Label>
              <Input value={medName} onChange={(e) => setMedName(e.target.value)} placeholder="Nama obat" />
            </div>
            <div className="space-y-2">
              <Label>Nama Generik</Label>
              <Input value={medGenericName} onChange={(e) => setMedGenericName(e.target.value)} placeholder="Nama generik (opsional)" />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={medCategory} onValueChange={(v) => setMedCategory(v as MedicineCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resep">Obat Resep</SelectItem>
                  <SelectItem value="bebas">Obat Bebas</SelectItem>
                  <SelectItem value="vitamin">Vitamin</SelectItem>
                  <SelectItem value="alat_kesehatan">Alat Kesehatan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Harga</Label>
                <Input type="number" value={medPrice} onChange={(e) => setMedPrice(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Stok</Label>
                <Input type="number" value={medStock} onChange={(e) => setMedStock(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Input value={medUnit} onChange={(e) => setMedUnit(e.target.value)} placeholder="tablet" />
              </div>
              <div className="space-y-2">
                <Label>Produsen</Label>
                <Input value={medManufacturer} onChange={(e) => setMedManufacturer(e.target.value)} placeholder="Nama produsen" />
              </div>
            </div>
            <Button className="w-full" onClick={handleSaveMedicine} disabled={!medName || !medPrice || !medStock}>
              {editingMedicine ? 'Simpan Perubahan' : 'Tambah Obat'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
