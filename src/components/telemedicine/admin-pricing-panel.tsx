'use client';

import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Pencil,
  Save,
  X,
  Search,
  Filter,
  DollarSign,
  Clock,
  Star,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HomeCareServiceItem {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  isActive: boolean;
}

interface DoctorItem {
  id: string;
  name: string;
  specialization: string;
  hospital: string;
  consultationFee: number;
  rating: number;
  isOnline: boolean;
  isAvailable: boolean;
}

interface PriceChangeRecord {
  id: string;
  itemName: string;
  type: 'homecare' | 'doctor';
  oldPrice: number;
  newPrice: number;
  changedAt: string;
  changedBy: string;
}

// ─── Category Labels ─────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  perawatan_luka: 'Perawatan Luka',
  infus: 'Infus',
  injeksi: 'Injeksi',
  pemeriksaan_lansia: 'Pemeriksaan Lansia',
  kunjungan_dokter: 'Kunjungan Dokter',
  kunjungan_bidan: 'Kunjungan Bidan',
  lab_sample: 'Sampel Lab',
  fisioterapi: 'Fisioterapi',
};

// ─── Demo Data ───────────────────────────────────────────────────────────────

const INITIAL_HOME_CARE_SERVICES: HomeCareServiceItem[] = [
  { id: 'hc1', name: 'Perawatan Luka', category: 'perawatan_luka', price: 150000, duration: 45, isActive: true },
  { id: 'hc2', name: 'Pemasangan Infus', category: 'infus', price: 200000, duration: 30, isActive: true },
  { id: 'hc3', name: 'Injeksi/Injeksi IM', category: 'injeksi', price: 100000, duration: 20, isActive: true },
  { id: 'hc4', name: 'Pemeriksaan Lansia', category: 'pemeriksaan_lansia', price: 175000, duration: 60, isActive: true },
  { id: 'hc5', name: 'Kunjungan Dokter', category: 'kunjungan_dokter', price: 350000, duration: 45, isActive: true },
  { id: 'hc6', name: 'Kunjungan Bidan', category: 'kunjungan_bidan', price: 250000, duration: 45, isActive: true },
  { id: 'hc7', name: 'Pengambilan Sampel Lab', category: 'lab_sample', price: 125000, duration: 30, isActive: true },
  { id: 'hc8', name: 'Fisioterapi', category: 'fisioterapi', price: 300000, duration: 60, isActive: true },
];

const INITIAL_DOCTORS: DoctorItem[] = [
  { id: 'doc1', name: 'dr. Sarah Wijaya', specialization: 'Umum', hospital: 'RS Medika Utama', consultationFee: 75000, rating: 4.8, isOnline: true, isAvailable: true },
  { id: 'doc2', name: 'dr. Ahmad Rizki', specialization: 'Anak', hospital: 'RS Anak Harapan', consultationFee: 100000, rating: 4.9, isOnline: true, isAvailable: true },
  { id: 'doc3', name: 'dr. Lisa Permata', specialization: 'Penyakit Dalam', hospital: 'RS Penyakit Dalam Nasional', consultationFee: 125000, rating: 4.7, isOnline: false, isAvailable: true },
  { id: 'doc4', name: 'dr. Dewi Sartika', specialization: 'Kebidanan', hospital: 'RS Ibu dan Anak Sejahtera', consultationFee: 100000, rating: 4.9, isOnline: true, isAvailable: true },
  { id: 'doc5', name: 'drg. Budi Santoso', specialization: 'Gigi', hospital: 'Klinik Gigi Sehat Medika', consultationFee: 85000, rating: 4.6, isOnline: true, isAvailable: true },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdminPricingPanel() {
  const { currentUser } = useStore();

  // Data state
  const [homeCareServices, setHomeCareServices] = useState<HomeCareServiceItem[]>(INITIAL_HOME_CARE_SERVICES);
  const [doctors, setDoctors] = useState<DoctorItem[]>(INITIAL_DOCTORS);
  const [priceHistory, setPriceHistory] = useState<PriceChangeRecord[]>([]);

  // Filter state
  const [hcSearch, setHcSearch] = useState('');
  const [hcCategoryFilter, setHcCategoryFilter] = useState<string>('all');
  const [docSearch, setDocSearch] = useState('');
  const [docSpecFilter, setDocSpecFilter] = useState<string>('all');

  // Dialog state
  const [hcEditOpen, setHcEditOpen] = useState(false);
  const [docEditOpen, setDocEditOpen] = useState(false);
  const [editingService, setEditingService] = useState<HomeCareServiceItem | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<DoctorItem | null>(null);

  // Form state
  const [editPrice, setEditPrice] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editConsultationFee, setEditConsultationFee] = useState('');
  const [editIsAvailable, setEditIsAvailable] = useState(true);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ─── Filtered data ───────────────────────────────────────────────────────

  const filteredServices = useMemo(() => {
    return homeCareServices.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(hcSearch.toLowerCase());
      const matchesCategory = hcCategoryFilter === 'all' || s.category === hcCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [homeCareServices, hcSearch, hcCategoryFilter]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(docSearch.toLowerCase()) ||
        d.hospital.toLowerCase().includes(docSearch.toLowerCase());
      const matchesSpec = docSpecFilter === 'all' || d.specialization === docSpecFilter;
      return matchesSearch && matchesSpec;
    });
  }, [doctors, docSearch, docSpecFilter]);

  // ─── Summary stats ───────────────────────────────────────────────────────

  const hcSummary = useMemo(() => {
    const active = homeCareServices.filter((s) => s.isActive).length;
    const avgPrice =
      homeCareServices.length > 0
        ? Math.round(homeCareServices.reduce((sum, s) => sum + s.price, 0) / homeCareServices.length)
        : 0;
    const minPrice = homeCareServices.length > 0 ? Math.min(...homeCareServices.map((s) => s.price)) : 0;
    const maxPrice = homeCareServices.length > 0 ? Math.max(...homeCareServices.map((s) => s.price)) : 0;
    return { total: homeCareServices.length, active, avgPrice, minPrice, maxPrice };
  }, [homeCareServices]);

  const docSummary = useMemo(() => {
    const online = doctors.filter((d) => d.isOnline).length;
    const available = doctors.filter((d) => d.isAvailable).length;
    const avgFee =
      doctors.length > 0
        ? Math.round(doctors.reduce((sum, d) => sum + d.consultationFee, 0) / doctors.length)
        : 0;
    const avgRating =
      doctors.length > 0
        ? (doctors.reduce((sum, d) => sum + d.rating, 0) / doctors.length).toFixed(1)
        : '0.0';
    return { total: doctors.length, online, available, avgFee, avgRating };
  }, [doctors]);

  // ─── Unique specs for filter ─────────────────────────────────────────────

  const uniqueSpecs = useMemo(() => {
    const specs = new Set(doctors.map((d) => d.specialization));
    return Array.from(specs).sort();
  }, [doctors]);

  // ─── Edit handlers ───────────────────────────────────────────────────────

  const handleEditService = useCallback((service: HomeCareServiceItem) => {
    setEditingService(service);
    setEditPrice(service.price.toString());
    setEditDuration(service.duration.toString());
    setEditIsActive(service.isActive);
    setFormError('');
    setHcEditOpen(true);
  }, []);

  const handleEditDoctor = useCallback((doctor: DoctorItem) => {
    setEditingDoctor(doctor);
    setEditConsultationFee(doctor.consultationFee.toString());
    setEditIsAvailable(doctor.isAvailable);
    setFormError('');
    setDocEditOpen(true);
  }, []);

  const handleSaveService = useCallback(async () => {
    if (!editingService) return;

    const newPrice = Number(editPrice);
    const newDuration = Number(editDuration);

    if (!editPrice || isNaN(newPrice) || newPrice <= 0) {
      setFormError('Harga harus lebih dari 0');
      return;
    }
    if (!editDuration || isNaN(newDuration) || newDuration <= 0) {
      setFormError('Durasi harus lebih dari 0 menit');
      return;
    }

    setIsSaving(true);

    // Update local state immediately
    setHomeCareServices((prev) =>
      prev.map((s) =>
        s.id === editingService.id
          ? { ...s, price: newPrice, duration: newDuration, isActive: editIsActive }
          : s
      )
    );

    // Log price change if price changed
    if (newPrice !== editingService.price) {
      const changeRecord: PriceChangeRecord = {
        id: `ch-${Date.now()}`,
        itemName: editingService.name,
        type: 'homecare',
        oldPrice: editingService.price,
        newPrice,
        changedAt: new Date().toISOString(),
        changedBy: currentUser?.name || 'Admin',
      };
      setPriceHistory((prev) => [changeRecord, ...prev]);
    }

    // Try to save to API
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'homecare',
          id: editingService.id,
          price: newPrice,
          duration: newDuration,
          isActive: editIsActive,
        }),
      });
      if (!res.ok) throw new Error('API error');
      toast.success('Harga layanan berhasil diperbarui', {
        description: `${editingService.name}: ${formatCurrency(newPrice)}`,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });
    } catch {
      toast.success('Harga layanan berhasil diperbarui (lokal)', {
        description: `${editingService.name}: ${formatCurrency(newPrice)} — perubahan disimpan secara lokal`,
        icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
      });
    } finally {
      setIsSaving(false);
      setHcEditOpen(false);
      setEditingService(null);
    }
  }, [editingService, editPrice, editDuration, editIsActive, currentUser]);

  const handleSaveDoctor = useCallback(async () => {
    if (!editingDoctor) return;

    const newFee = Number(editConsultationFee);

    if (!editConsultationFee || isNaN(newFee) || newFee <= 0) {
      setFormError('Tarif konsultasi harus lebih dari 0');
      return;
    }

    setIsSaving(true);

    // Update local state immediately
    setDoctors((prev) =>
      prev.map((d) =>
        d.id === editingDoctor.id
          ? { ...d, consultationFee: newFee, isAvailable: editIsAvailable }
          : d
      )
    );

    // Log price change if fee changed
    if (newFee !== editingDoctor.consultationFee) {
      const changeRecord: PriceChangeRecord = {
        id: `ch-${Date.now()}`,
        itemName: editingDoctor.name,
        type: 'doctor',
        oldPrice: editingDoctor.consultationFee,
        newPrice: newFee,
        changedAt: new Date().toISOString(),
        changedBy: currentUser?.name || 'Admin',
      };
      setPriceHistory((prev) => [changeRecord, ...prev]);
    }

    // Try to save to API
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'doctor',
          id: editingDoctor.id,
          consultationFee: newFee,
          isAvailable: editIsAvailable,
        }),
      });
      if (!res.ok) throw new Error('API error');
      toast.success('Tarif dokter berhasil diperbarui', {
        description: `${editingDoctor.name}: ${formatCurrency(newFee)}`,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });
    } catch {
      toast.success('Tarif dokter berhasil diperbarui (lokal)', {
        description: `${editingDoctor.name}: ${formatCurrency(newFee)} — perubahan disimpan secara lokal`,
        icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
      });
    } finally {
      setIsSaving(false);
      setDocEditOpen(false);
      setEditingDoctor(null);
    }
  }, [editingDoctor, editConsultationFee, editIsAvailable, currentUser]);

  // ─── Category badge color ────────────────────────────────────────────────

  const getCategoryBadgeVariant = (category: string): 'default' | 'secondary' | 'outline' => {
    const map: Record<string, 'default' | 'secondary' | 'outline'> = {
      perawatan_luka: 'default',
      infus: 'secondary',
      injeksi: 'outline',
      pemeriksaan_lansia: 'default',
      kunjungan_dokter: 'secondary',
      kunjungan_bidan: 'outline',
      lab_sample: 'default',
      fisioterapi: 'secondary',
    };
    return map[category] || 'outline';
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-teal-600" />
              Manajemen Harga & Tarif
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola harga layanan home care dan tarif konsultasi dokter
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-xs">
            <Activity className="w-3 h-3 mr-1" />
            Admin Panel
          </Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-teal-50 text-teal-600">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">Total Layanan</span>
              </div>
              <p className="text-lg font-bold text-foreground">{hcSummary.total}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">Aktif</span>
              </div>
              <p className="text-lg font-bold text-foreground">{hcSummary.active}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-teal-50 text-teal-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">Rata-rata HC</span>
              </div>
              <p className="text-lg font-bold text-foreground">{formatCurrency(hcSummary.avgPrice)}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-teal-50 text-teal-600">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">Rata-rata Dokter</span>
              </div>
              <p className="text-lg font-bold text-foreground">{formatCurrency(docSummary.avgFee)}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
                  <Star className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">Rating Rata-rata</span>
              </div>
              <p className="text-lg font-bold text-foreground">{docSummary.avgRating}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-teal-50 text-teal-600">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">Perubahan Harga</span>
              </div>
              <p className="text-lg font-bold text-foreground">{priceHistory.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="homecare" className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="homecare" className="flex-1 sm:flex-none">
              <DollarSign className="w-4 h-4 mr-1.5" />
              Harga Home Care
            </TabsTrigger>
            <TabsTrigger value="doctors" className="flex-1 sm:flex-none">
              <Star className="w-4 h-4 mr-1.5" />
              Tarif Dokter
            </TabsTrigger>
          </TabsList>

          {/* ─── Tab 1: Harga Home Care ──────────────────────────────────── */}
          <TabsContent value="homecare" className="mt-4 space-y-4">
            {/* Search / Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari layanan home care..."
                  value={hcSearch}
                  onChange={(e) => setHcSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={hcCategoryFilter} onValueChange={setHcCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filter kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Layanan</TableHead>
                        <TableHead className="text-xs font-semibold">Kategori</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Harga</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Durasi</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredServices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                            Tidak ada layanan ditemukan
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredServices.map((service) => (
                          <TableRow key={service.id} className="hover:bg-accent/50 transition-colors">
                            <TableCell className="font-medium text-sm">{service.name}</TableCell>
                            <TableCell>
                              <Badge variant={getCategoryBadgeVariant(service.category)} className="text-[10px]">
                                {CATEGORY_LABELS[service.category] || service.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-sm text-teal-700 dark:text-teal-400">
                              {formatCurrency(service.price)}
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              <div className="flex items-center justify-center gap-1">
                                <Clock className="w-3 h-3" />
                                {service.duration} mnt
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Switch
                                        checked={service.isActive}
                                        disabled
                                        className="data-[state=checked]:bg-teal-600"
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {service.isActive ? 'Layanan aktif' : 'Layanan nonaktif'}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditService(service)}
                                    className="h-8 gap-1.5 text-xs"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Edit
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit harga layanan</TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Price range info */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>Harga terendah: <strong className="text-foreground">{formatCurrency(hcSummary.minPrice)}</strong></span>
              <Separator orientation="vertical" className="h-4" />
              <span>Harga tertinggi: <strong className="text-foreground">{formatCurrency(hcSummary.maxPrice)}</strong></span>
              <Separator orientation="vertical" className="h-4" />
              <span>Menampilkan: <strong className="text-foreground">{filteredServices.length}</strong> dari {homeCareServices.length} layanan</span>
            </div>
          </TabsContent>

          {/* ─── Tab 2: Tarif Dokter ─────────────────────────────────────── */}
          <TabsContent value="doctors" className="mt-4 space-y-4">
            {/* Search / Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari dokter atau rumah sakit..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={docSpecFilter} onValueChange={setDocSpecFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filter spesialisasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Spesialisasi</SelectItem>
                  {uniqueSpecs.map((spec) => (
                    <SelectItem key={spec} value={spec}>
                      {spec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Dokter</TableHead>
                        <TableHead className="text-xs font-semibold">Spesialisasi</TableHead>
                        <TableHead className="text-xs font-semibold">Rumah Sakit</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Tarif Konsultasi</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Rating</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDoctors.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                            Tidak ada dokter ditemukan
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDoctors.map((doctor) => (
                          <TableRow key={doctor.id} className="hover:bg-accent/50 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-700 dark:text-teal-300 font-semibold text-sm shrink-0">
                                  {doctor.name.charAt(0)}
                                </div>
                                <span className="font-medium text-sm">{doctor.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px]">
                                {doctor.specialization}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {doctor.hospital}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-sm text-teal-700 dark:text-teal-400">
                              {formatCurrency(doctor.consultationFee)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                <span className="text-sm font-medium">{doctor.rating.toFixed(1)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Badge
                                  variant={doctor.isOnline ? 'default' : 'outline'}
                                  className={`text-[10px] ${doctor.isOnline ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                                >
                                  {doctor.isOnline ? 'Online' : 'Offline'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditDoctor(doctor)}
                                    className="h-8 gap-1.5 text-xs"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Edit
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit tarif konsultasi</TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Doctor summary info */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>Dokter online: <strong className="text-foreground">{docSummary.online}</strong></span>
              <Separator orientation="vertical" className="h-4" />
              <span>Tersedia: <strong className="text-foreground">{docSummary.available}</strong></span>
              <Separator orientation="vertical" className="h-4" />
              <span>Menampilkan: <strong className="text-foreground">{filteredDoctors.length}</strong> dari {doctors.length} dokter</span>
            </div>
          </TabsContent>
        </Tabs>

        {/* ─── Price Change History ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              Riwayat Perubahan Harga
            </CardTitle>
          </CardHeader>
          <CardContent>
            {priceHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Belum ada perubahan harga</p>
                <p className="text-xs mt-1">Perubahan akan tercatat saat Anda mengedit harga</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Item</TableHead>
                      <TableHead className="text-xs font-semibold">Tipe</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Harga Lama</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Harga Baru</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Perubahan</TableHead>
                      <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                      <TableHead className="text-xs font-semibold">Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceHistory.map((record) => {
                      const diff = record.newPrice - record.oldPrice;
                      const percentChange = ((diff / record.oldPrice) * 100).toFixed(1);
                      const isIncrease = diff > 0;
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium text-sm">{record.itemName}</TableCell>
                          <TableCell>
                            <Badge variant={record.type === 'homecare' ? 'default' : 'secondary'} className="text-[10px]">
                              {record.type === 'homecare' ? 'Home Care' : 'Dokter'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatCurrency(record.oldPrice)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">
                            {formatCurrency(record.newPrice)}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                isIncrease ? 'text-red-600' : 'text-emerald-600'
                              }`}
                            >
                              <TrendingUp className={`w-3 h-3 ${!isIncrease ? 'rotate-180' : ''}`} />
                              {isIncrease ? '+' : ''}{percentChange}%
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(record.changedAt)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {record.changedBy}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Edit Homecare Dialog ──────────────────────────────────────── */}
        <Dialog open={hcEditOpen} onOpenChange={(open) => { if (!open) setHcEditOpen(false); }}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-teal-600" />
                Edit Harga Layanan
              </DialogTitle>
            </DialogHeader>

            {editingService && (
              <div className="space-y-4 py-2">
                {/* Service name (read-only) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nama Layanan</Label>
                  <Input value={editingService.name} readOnly className="bg-muted" />
                </div>

                {/* Category (read-only info) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Kategori</Label>
                  <div>
                    <Badge variant={getCategoryBadgeVariant(editingService.category)}>
                      {CATEGORY_LABELS[editingService.category] || editingService.category}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Price input */}
                <div className="space-y-2">
                  <Label htmlFor="edit-price" className="text-sm font-medium">
                    Harga (Rp)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">Rp</span>
                    <Input
                      id="edit-price"
                      type="number"
                      min="1"
                      value={editPrice}
                      onChange={(e) => {
                        setEditPrice(e.target.value);
                        if (formError) setFormError('');
                      }}
                      className="pl-10"
                      placeholder="Masukkan harga baru"
                    />
                  </div>
                  {Number(editPrice) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Format: {formatCurrency(Number(editPrice))}
                    </p>
                  )}
                </div>

                {/* Duration input */}
                <div className="space-y-2">
                  <Label htmlFor="edit-duration" className="text-sm font-medium">
                    Durasi (menit)
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="edit-duration"
                      type="number"
                      min="1"
                      value={editDuration}
                      onChange={(e) => {
                        setEditDuration(e.target.value);
                        if (formError) setFormError('');
                      }}
                      className="pl-9"
                      placeholder="Durasi dalam menit"
                    />
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Status Aktif</Label>
                    <p className="text-xs text-muted-foreground">
                      {editIsActive ? 'Layanan tersedia untuk dipesan' : 'Layanan tidak tersedia'}
                    </p>
                  </div>
                  <Switch
                    checked={editIsActive}
                    onCheckedChange={setEditIsActive}
                    className="data-[state=checked]:bg-teal-600"
                  />
                </div>

                {/* Error */}
                {formError && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{formError}</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => { setHcEditOpen(false); setEditingService(null); }}
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-1.5" />
                Batal
              </Button>
              <Button
                onClick={handleSaveService}
                disabled={isSaving}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menyimpan...
                  </div>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1.5" />
                    Simpan
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Edit Doctor Dialog ────────────────────────────────────────── */}
        <Dialog open={docEditOpen} onOpenChange={(open) => { if (!open) setDocEditOpen(false); }}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-teal-600" />
                Edit Tarif Konsultasi
              </DialogTitle>
            </DialogHeader>

            {editingDoctor && (
              <div className="space-y-4 py-2">
                {/* Doctor name (read-only) */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-700 dark:text-teal-300 font-semibold shrink-0">
                    {editingDoctor.name.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">{editingDoctor.name}</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {editingDoctor.specialization}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{editingDoctor.hospital}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Consultation fee input */}
                <div className="space-y-2">
                  <Label htmlFor="edit-fee" className="text-sm font-medium">
                    Tarif Konsultasi (Rp)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">Rp</span>
                    <Input
                      id="edit-fee"
                      type="number"
                      min="1"
                      value={editConsultationFee}
                      onChange={(e) => {
                        setEditConsultationFee(e.target.value);
                        if (formError) setFormError('');
                      }}
                      className="pl-10"
                      placeholder="Masukkan tarif baru"
                    />
                  </div>
                  {Number(editConsultationFee) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Format: {formatCurrency(Number(editConsultationFee))}
                    </p>
                  )}
                </div>

                {/* Available toggle */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Tersedia untuk Konsultasi</Label>
                    <p className="text-xs text-muted-foreground">
                      {editIsAvailable ? 'Dokter menerima pasien baru' : 'Dokter tidak menerima pasien'}
                    </p>
                  </div>
                  <Switch
                    checked={editIsAvailable}
                    onCheckedChange={setEditIsAvailable}
                    className="data-[state=checked]:bg-teal-600"
                  />
                </div>

                {/* Error */}
                {formError && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{formError}</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => { setDocEditOpen(false); setEditingDoctor(null); }}
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-1.5" />
                Batal
              </Button>
              <Button
                onClick={handleSaveDoctor}
                disabled={isSaving}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menyimpan...
                  </div>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1.5" />
                    Simpan
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
