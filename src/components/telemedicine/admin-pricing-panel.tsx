'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
  Plus,
  Trash2,
  Eye,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowUpDown,
  XCircle,
} from 'lucide-react';
import { serviceCatalogService, supabase, type ServiceItem, type ServiceInput, type ServiceStatus } from '@/services/supabase';
import { SERVICE_CATEGORIES } from '@/services/supabase/serviceCatalogService';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HomeCareServiceItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  duration: number;
  isActive: boolean;
  displayOrder: number;
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
// NOTE: `INITIAL_HOME_CARE_SERVICES` (the old hardcoded 8-item array) has been
// removed. It never touched the database — editing/adding "worked" visually
// but nothing reached Supabase, which is why the patient Home Care page
// always showed "Belum ada layanan tersedia". Real services now load from
// GET /api/admin/homecare-services (see loadHomeCareServices below), which
// reads the same `homecare_services` table the patient page reads from.

// NOTE: `INITIAL_DOCTORS` (5 fake doctors — "dr. Sarah Wijaya", "dr. Ahmad
// Rizki", etc.) has been removed for the same reason as the home care list
// above: it never touched the database, and the "Tarif Dokter" save button
// POSTed to a dead Prisma/SQLite route, so every edit silently fell back to
// a local-only toast. Real doctors now load from GET /api/doctors (already
// Supabase-backed) via loadDoctors() below.

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

function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdminPricingPanel() {
  const { currentUser } = useStore();

  // Data state
  const [homeCareServices, setHomeCareServices] = useState<HomeCareServiceItem[]>([]);
  const [hcLoading, setHcLoading] = useState(true);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [docLoading, setDocLoading] = useState(true);
  const [priceHistory, setPriceHistory] = useState<PriceChangeRecord[]>([]);

  // Filter state
  const [hcSearch, setHcSearch] = useState('');
  const [hcCategoryFilter, setHcCategoryFilter] = useState<string>('all');
  const [docSearch, setDocSearch] = useState('');
  const [docSpecFilter, setDocSpecFilter] = useState<string>('all');

  // Dialog state
  const [hcEditOpen, setHcEditOpen] = useState(false);
  const [hcAddOpen, setHcAddOpen] = useState(false);
  const [hcDeleteConfirmId, setHcDeleteConfirmId] = useState<string | null>(null);
  const [hcDeleting, setHcDeleting] = useState(false);
  const [docEditOpen, setDocEditOpen] = useState(false);
  const [editingService, setEditingService] = useState<HomeCareServiceItem | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<DoctorItem | null>(null);

  // Add-service form state (separate from edit form to avoid cross-talk)
  const [newSvcName, setNewSvcName] = useState('');
  const [newSvcCategory, setNewSvcCategory] = useState('');
  const [newSvcPrice, setNewSvcPrice] = useState('');
  const [newSvcDuration, setNewSvcDuration] = useState('');
  const [newSvcDescription, setNewSvcDescription] = useState('');
  const [newSvcError, setNewSvcError] = useState('');
  const [newSvcSaving, setNewSvcSaving] = useState(false);

  // Form state
  const [editPrice, setEditPrice] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editConsultationFee, setEditConsultationFee] = useState('');
  const [editIsAvailable, setEditIsAvailable] = useState(true);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ─── Layanan (Service Catalog) state ─────────────────────────────────────
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [showAddServiceDialog, setShowAddServiceDialog] = useState(false);
  const [editingServiceItem, setEditingServiceItem] = useState<ServiceItem | null>(null);
  const [viewingService, setViewingService] = useState<ServiceItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Layanan form fields
  const [svcNamaLayanan, setSvcNamaLayanan] = useState('');
  const [svcKategori, setSvcKategori] = useState<string>('');
  const [svcHarga, setSvcHarga] = useState('');
  const [svcDurasi, setSvcDurasi] = useState('');
  const [svcStatus, setSvcStatus] = useState<ServiceStatus>('Aktif');
  const [svcDeskripsi, setSvcDeskripsi] = useState('');
  const [svcFormError, setSvcFormError] = useState('');
  const [svcSaving, setSvcSaving] = useState(false);
  const [svcDeleting, setSvcDeleting] = useState(false);

  // Layanan filters & pagination
  const [svcSearch, setSvcSearch] = useState('');
  const [svcKategoriFilter, setSvcKategoriFilter] = useState<string>('all');
  const [svcStatusFilter, setSvcStatusFilter] = useState<string>('all');
  const [svcSortHarga, setSvcSortHarga] = useState<'asc' | 'desc' | 'none'>('none');
  const [svcCurrentPage, setSvcCurrentPage] = useState(1);
  const svcItemsPerPage = 10;

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

  // ─── Load real home care services from Supabase (via admin API) ─────────
  // This is what fixes "Belum ada layanan tersedia" on the patient side —
  // both admin and patient now read/write the same `homecare_services`
  // table instead of admin editing a local-only array.
  const loadHomeCareServices = useCallback(async () => {
    setHcLoading(true);
    try {
      const res = await fetch('/api/admin/homecare-services');
      const data = await res.json();
      if (res.ok && Array.isArray(data?.services)) {
        setHomeCareServices(
          data.services.map((s: any) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            description: s.description,
            price: Number(s.price ?? 0),
            duration: Number(s.durationMinutes ?? 0),
            isActive: !!s.isActive,
            displayOrder: Number(s.displayOrder ?? 0),
          }))
        );
      } else {
        toast.error('Gagal memuat layanan home care', {
          description: data?.details || 'Terjadi kesalahan saat memuat data dari server.',
        });
      }
    } catch (err) {
      console.error('[admin-pricing-panel] loadHomeCareServices failed:', err);
      toast.error('Gagal memuat layanan home care', {
        description: 'Periksa koneksi Anda dan coba lagi.',
      });
    } finally {
      setHcLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomeCareServices();
  }, [loadHomeCareServices]);

  // ─── Load real doctors from Supabase (via /api/doctors) ─────────────────
  // Replaces the 5 hardcoded fake doctors ("dr. Sarah Wijaya" etc.) that
  // never reflected who's actually registered on the platform.
  const loadDoctors = useCallback(async () => {
    setDocLoading(true);
    try {
      const res = await fetch('/api/doctors');
      const data = await res.json();
      if (res.ok && Array.isArray(data?.doctors)) {
        setDoctors(
          data.doctors.map((d: any) => ({
            id: d.doctorProfile?.id ?? d.id,
            name: d.name,
            specialization: d.doctorProfile?.specialization ?? 'umum',
            hospital: d.doctorProfile?.hospital ?? '-',
            consultationFee: Number(d.doctorProfile?.consultationFee ?? 0),
            rating: Number(d.doctorProfile?.rating ?? 0),
            isOnline: !!d.doctorProfile?.isOnline,
            isAvailable: !!d.doctorProfile?.isAvailable,
          }))
        );
      } else {
        toast.error('Gagal memuat daftar dokter', {
          description: data?.details || 'Terjadi kesalahan saat memuat data dari server.',
        });
      }
    } catch (err) {
      console.error('[admin-pricing-panel] loadDoctors failed:', err);
      toast.error('Gagal memuat daftar dokter', {
        description: 'Periksa koneksi Anda dan coba lagi.',
      });
    } finally {
      setDocLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

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

    if (!editPrice || isNaN(newPrice) || newPrice < 0) {
      setFormError('Harga harus berupa angka >= 0');
      return;
    }
    if (!editDuration || isNaN(newDuration) || newDuration <= 0) {
      setFormError('Durasi harus lebih dari 0 menit');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/homecare-services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingService.id,
          price: newPrice,
          durationMinutes: newDuration,
          isActive: editIsActive,
          updatedBy: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.service) {
        throw new Error(data?.details || data?.error || 'Gagal menyimpan perubahan');
      }

      // Reflect the confirmed DB row locally (not an optimistic guess).
      setHomeCareServices((prev) =>
        prev.map((s) =>
          s.id === editingService.id
            ? { ...s, price: Number(data.service.price), duration: Number(data.service.durationMinutes ?? 0), isActive: !!data.service.isActive }
            : s
        )
      );

      if (newPrice !== editingService.price) {
        setPriceHistory((prev) => [
          {
            id: `ch-${Date.now()}`,
            itemName: editingService.name,
            type: 'homecare',
            oldPrice: editingService.price,
            newPrice,
            changedAt: new Date().toISOString(),
            changedBy: currentUser?.name || 'Admin',
          },
          ...prev,
        ]);
      }

      toast.success('Harga layanan berhasil diperbarui', {
        description: `${editingService.name}: ${formatCurrency(newPrice)} — perubahan langsung terlihat oleh pasien.`,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });
      setHcEditOpen(false);
      setEditingService(null);
    } catch (err) {
      // No more silent "(lokal)" fallback — a failed save must be visible,
      // otherwise the admin thinks it worked while the patient never sees it.
      toast.error('Gagal menyimpan perubahan', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.',
        icon: <AlertCircle className="w-4 h-4" />,
      });
    } finally {
      setIsSaving(false);
    }
  }, [editingService, editPrice, editDuration, editIsActive, currentUser]);

  const handleAddService = useCallback(async () => {
    if (!newSvcName.trim()) {
      setNewSvcError('Nama layanan wajib diisi');
      return;
    }
    if (!newSvcCategory.trim()) {
      setNewSvcError('Kategori wajib diisi');
      return;
    }
    const price = Number(newSvcPrice);
    if (!newSvcPrice || isNaN(price) || price < 0) {
      setNewSvcError('Harga harus berupa angka >= 0');
      return;
    }
    const duration = Number(newSvcDuration);
    if (!newSvcDuration || isNaN(duration) || duration <= 0) {
      setNewSvcError('Durasi harus lebih dari 0 menit');
      return;
    }

    setNewSvcSaving(true);
    setNewSvcError('');
    try {
      const res = await fetch('/api/admin/homecare-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSvcName.trim(),
          category: newSvcCategory.trim(),
          description: newSvcDescription.trim() || undefined,
          price,
          durationMinutes: duration,
          isActive: true,
          displayOrder: homeCareServices.length,
          updatedBy: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.service) {
        throw new Error(data?.details || data?.error || 'Gagal menambah layanan');
      }
      await loadHomeCareServices();
      toast.success('Layanan berhasil ditambahkan', {
        description: `${data.service.name} kini tersedia untuk dipesan pasien.`,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });
      setHcAddOpen(false);
      setNewSvcName('');
      setNewSvcCategory('');
      setNewSvcPrice('');
      setNewSvcDuration('');
      setNewSvcDescription('');
    } catch (err) {
      setNewSvcError(err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setNewSvcSaving(false);
    }
  }, [newSvcName, newSvcCategory, newSvcPrice, newSvcDuration, newSvcDescription, homeCareServices.length, currentUser, loadHomeCareServices]);

  const handleToggleServiceActive = useCallback(async (service: HomeCareServiceItem) => {
    try {
      const res = await fetch('/api/admin/homecare-services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: service.id, isActive: !service.isActive, updatedBy: currentUser?.id }),
      });
      const data = await res.json();
      if (!res.ok || !data?.service) throw new Error(data?.details || data?.error || 'Gagal mengubah status');
      setHomeCareServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, isActive: !!data.service.isActive } : s)));
      toast.success(data.service.isActive ? 'Layanan diaktifkan' : 'Layanan dinonaktifkan', {
        description: `${service.name} ${data.service.isActive ? 'kini terlihat' : 'tidak lagi terlihat'} di katalog pasien.`,
      });
    } catch (err) {
      toast.error('Gagal mengubah status layanan', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.',
      });
    }
  }, [currentUser]);

  const handleDeleteService = useCallback(async (id: string) => {
    setHcDeleting(true);
    try {
      const res = await fetch(`/api/admin/homecare-services?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.details || data?.error || 'Gagal menghapus layanan');
      await loadHomeCareServices();
      toast.success(data.hardDeleted ? 'Layanan dihapus' : 'Layanan dinonaktifkan', {
        description: data.message,
      });
    } catch (err) {
      toast.error('Gagal menghapus layanan', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.',
      });
    } finally {
      setHcDeleting(false);
      setHcDeleteConfirmId(null);
    }
  }, [loadHomeCareServices]);

  const handleSaveDoctor = useCallback(async () => {
    if (!editingDoctor) return;

    const newFee = Number(editConsultationFee);

    if (!editConsultationFee || isNaN(newFee) || newFee < 0) {
      setFormError('Tarif konsultasi harus berupa angka >= 0');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/doctors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDoctor.id,
          consultationFee: newFee,
          isAvailable: editIsAvailable,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.doctor) {
        throw new Error(data?.details || data?.error || 'Gagal menyimpan perubahan');
      }

      setDoctors((prev) =>
        prev.map((d) =>
          d.id === editingDoctor.id
            ? { ...d, consultationFee: Number(data.doctor.doctorProfile.consultationFee), isAvailable: !!data.doctor.doctorProfile.isAvailable }
            : d
        )
      );

      if (newFee !== editingDoctor.consultationFee) {
        setPriceHistory((prev) => [
          {
            id: `ch-${Date.now()}`,
            itemName: editingDoctor.name,
            type: 'doctor',
            oldPrice: editingDoctor.consultationFee,
            newPrice: newFee,
            changedAt: new Date().toISOString(),
            changedBy: currentUser?.name || 'Admin',
          },
          ...prev,
        ]);
      }

      toast.success('Tarif dokter berhasil diperbarui', {
        description: `${editingDoctor.name}: ${formatCurrency(newFee)} — perubahan langsung terlihat oleh pasien.`,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });
      setDocEditOpen(false);
      setEditingDoctor(null);
    } catch (err) {
      // No more silent "(lokal)" fallback — a failed save must be visible.
      toast.error('Gagal menyimpan tarif dokter', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.',
        icon: <AlertCircle className="w-4 h-4" />,
      });
    } finally {
      setIsSaving(false);
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

  // ─── Layanan (Service Catalog) ───────────────────────────────────────────

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    try {
      const list = await serviceCatalogService.getAll();
      setServices(list);
    } catch (err) {
      console.error('Failed to load services', err);
    } finally {
      setServicesLoading(false);
    }
  }, []);

  // On mount: load + subscribe to realtime changes
  useEffect(() => {
    loadServices();
    const channel = supabase
      .channel('service-catalog-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: 'user_id=eq.__service_catalog__' },
        () => { serviceCatalogService.getAll().then(setServices).catch(console.error); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadServices]);

  // Reset to page 1 whenever filters/sort change
  useEffect(() => {
    setSvcCurrentPage(1);
  }, [svcSearch, svcKategoriFilter, svcStatusFilter, svcSortHarga]);

  const filteredSvcList = useMemo(() => {
    let list = services.filter((s) => {
      const matchesSearch = s.namaLayanan.toLowerCase().includes(svcSearch.toLowerCase());
      const matchesKategori = svcKategoriFilter === 'all' || s.kategori === svcKategoriFilter;
      const matchesStatus = svcStatusFilter === 'all' || s.status === svcStatusFilter;
      return matchesSearch && matchesKategori && matchesStatus;
    });
    if (svcSortHarga !== 'none') {
      list = [...list].sort((a, b) =>
        svcSortHarga === 'asc' ? a.harga - b.harga : b.harga - a.harga
      );
    }
    return list;
  }, [services, svcSearch, svcKategoriFilter, svcStatusFilter, svcSortHarga]);

  const svcTotalPages = Math.max(1, Math.ceil(filteredSvcList.length / svcItemsPerPage));

  const svcPaged = useMemo(() => {
    const start = (svcCurrentPage - 1) * svcItemsPerPage;
    return filteredSvcList.slice(start, start + svcItemsPerPage);
  }, [filteredSvcList, svcCurrentPage, svcItemsPerPage]);

  const resetSvcForm = useCallback(() => {
    setSvcNamaLayanan('');
    setSvcKategori('');
    setSvcHarga('');
    setSvcDurasi('');
    setSvcStatus('Aktif');
    setSvcDeskripsi('');
    setSvcFormError('');
  }, []);

  const openAddServiceDialog = useCallback(() => {
    resetSvcForm();
    setEditingServiceItem(null);
    setShowAddServiceDialog(true);
  }, [resetSvcForm]);

  const openEditServiceDialog = useCallback((svc: ServiceItem) => {
    setEditingServiceItem(svc);
    setSvcNamaLayanan(svc.namaLayanan);
    setSvcKategori(svc.kategori);
    setSvcHarga(String(svc.harga));
    setSvcDurasi(String(svc.durasi));
    setSvcStatus(svc.status);
    setSvcDeskripsi(svc.deskripsi || '');
    setSvcFormError('');
    setShowAddServiceDialog(true);
  }, []);

  const handleSaveServiceForm = useCallback(async () => {
    const nama = svcNamaLayanan.trim();
    if (!nama) { setSvcFormError('Nama layanan wajib diisi'); return; }
    if (!svcKategori) { setSvcFormError('Kategori wajib dipilih'); return; }
    if (!(SERVICE_CATEGORIES as readonly string[]).includes(svcKategori)) {
      setSvcFormError('Kategori tidak valid'); return;
    }
    const hargaNum = Number(svcHarga);
    if (!svcHarga || isNaN(hargaNum) || hargaNum <= 0) {
      setSvcFormError('Harga harus berupa angka lebih dari 0'); return;
    }
    const durasiNum = Number(svcDurasi);
    if (!svcDurasi || isNaN(durasiNum) || durasiNum <= 0 || !Number.isInteger(durasiNum)) {
      setSvcFormError('Durasi harus berupa bilangan bulat lebih dari 0'); return;
    }
    if (svcStatus !== 'Aktif' && svcStatus !== 'Nonaktif') {
      setSvcFormError('Status tidak valid'); return;
    }

    const input: ServiceInput = {
      namaLayanan: nama,
      kategori: svcKategori,
      harga: hargaNum,
      durasi: durasiNum,
      status: svcStatus,
      deskripsi: svcDeskripsi.trim() || undefined,
      createdBy: editingServiceItem?.createdBy || currentUser?.name || 'Admin',
    };

    setSvcSaving(true);
    try {
      if (editingServiceItem) {
        await serviceCatalogService.update(editingServiceItem.id, input);
        toast.success('Layanan berhasil diperbarui', {
          description: nama,
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        });
      } else {
        await serviceCatalogService.create(input);
        toast.success('Layanan berhasil ditambahkan', {
          description: nama,
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        });
      }
      setShowAddServiceDialog(false);
      setEditingServiceItem(null);
      resetSvcForm();
      // Realtime will refresh the list
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menyimpan layanan: ' + (err?.message || 'Unknown error'));
    } finally {
      setSvcSaving(false);
    }
  }, [svcNamaLayanan, svcKategori, svcHarga, svcDurasi, svcStatus, svcDeskripsi, editingServiceItem, currentUser, resetSvcForm]);

  const handleToggleServiceStatus = useCallback(async (svc: ServiceItem) => {
    try {
      await serviceCatalogService.toggleStatus(svc.id, svc.status);
      toast.success(`Layanan ${svc.status === 'Aktif' ? 'dinonaktifkan' : 'diaktifkan'}`, {
        description: svc.namaLayanan,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengubah status: ' + (err?.message || 'Unknown error'));
    }
  }, []);

  const handleDeleteService = useCallback(async () => {
    if (!confirmDeleteId) return;
    setSvcDeleting(true);
    try {
      const ok = await serviceCatalogService.remove(confirmDeleteId);
      if (ok) {
        toast.success('Layanan berhasil dihapus', {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        });
      } else {
        toast.error('Gagal menghapus layanan');
      }
      setConfirmDeleteId(null);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menghapus layanan: ' + (err?.message || 'Unknown error'));
    } finally {
      setSvcDeleting(false);
    }
  }, [confirmDeleteId]);

  const exportSvcCSV = useCallback(() => {
    const headers = ['Nama Layanan', 'Kategori', 'Harga', 'Durasi (menit)', 'Status', 'Deskripsi'];
    const rows = filteredSvcList.map((s) => [
      s.namaLayanan,
      s.kategori,
      String(s.harga),
      String(s.durasi),
      s.status,
      s.deskripsi || '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row
        .map((cell) => {
          const c = String(cell ?? '');
          if (c.includes(',') || c.includes('"') || c.includes('\n')) {
            return `"${c.replace(/"/g, '""')}"`;
          }
          return c;
        })
        .join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'layanan.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('File CSV berhasil diunduh');
  }, [filteredSvcList]);

  const exportSvcPDF = useCallback(() => {
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Gagal membuka jendela cetak. Periksa pengaturan popup browser.');
      return;
    }
    const rowsHtml = filteredSvcList
      .map((s) => `
        <tr>
          <td>${escapeHtml(s.namaLayanan)}</td>
          <td>${escapeHtml(s.kategori)}</td>
          <td style="text-align:right">${escapeHtml(formatCurrency(s.harga))}</td>
          <td style="text-align:center">${s.durasi} mnt</td>
          <td style="text-align:center">${escapeHtml(s.status)}</td>
        </tr>`)
      .join('');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Katalog Layanan</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #1f2937; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            .meta { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
            th { background: #f9fafb; font-weight: 600; }
          </style>
        </head>
        <body>
          <h1>Katalog Layanan</h1>
          <p class="meta">Dicetak pada ${new Date().toLocaleString('id-ID')}</p>
          <table>
            <thead>
              <tr>
                <th>Nama Layanan</th>
                <th>Kategori</th>
                <th style="text-align:right">Harga</th>
                <th style="text-align:center">Durasi</th>
                <th style="text-align:center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="5" style="text-align:center;color:#9ca3af">Tidak ada data</td></tr>'}
            </tbody>
          </table>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    win.document.close();
    toast.success('Dialog cetak PDF telah dibuka');
  }, [filteredSvcList]);

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
            <TabsTrigger value="layanan" className="flex-1 sm:flex-none">
              <FileText className="w-4 h-4 mr-1.5" />
              Layanan
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
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white shrink-0"
                onClick={() => { setNewSvcError(''); setHcAddOpen(true); }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Tambah Layanan
              </Button>
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
                      {hcLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                            <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                            Memuat layanan...
                          </TableCell>
                        </TableRow>
                      ) : filteredServices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                            {homeCareServices.length === 0 ? 'Belum ada layanan. Klik "Tambah Layanan" untuk menambahkan.' : 'Tidak ada layanan ditemukan'}
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
                                        onCheckedChange={() => handleToggleServiceActive(service)}
                                        className="data-[state=checked]:bg-teal-600"
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {service.isActive ? 'Layanan aktif — klik untuk nonaktifkan' : 'Layanan nonaktif — klik untuk aktifkan'}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1.5">
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
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setHcDeleteConfirmId(service.id)}
                                      className="h-8 gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Hapus layanan</TooltipContent>
                                </Tooltip>
                              </div>
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
                      {docLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                            <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                            Memuat dokter...
                          </TableCell>
                        </TableRow>
                      ) : filteredDoctors.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                            {doctors.length === 0 ? 'Belum ada dokter terdaftar di sistem.' : 'Tidak ada dokter ditemukan'}
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

          {/* ─── Tab 3: Layanan (Service Catalog) ─────────────────────────── */}
          <TabsContent value="layanan" className="mt-4 space-y-4">
            {/* Header with Add + Export buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Katalog Layanan
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Kelola daftar layanan yang tersedia di sistem
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportSvcCSV}
                  disabled={services.length === 0}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Export Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportSvcPDF}
                  disabled={services.length === 0}
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  Export PDF
                </Button>
                <Button
                  size="sm"
                  onClick={openAddServiceDialog}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Tambah Layanan
                </Button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama layanan..."
                  value={svcSearch}
                  onChange={(e) => setSvcSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={svcKategoriFilter} onValueChange={setSvcKategoriFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filter kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {SERVICE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={svcStatusFilter} onValueChange={setSvcStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={svcSortHarga}
                onValueChange={(v) => setSvcSortHarga(v as 'asc' | 'desc' | 'none')}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Urutkan harga" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak Diurutkan</SelectItem>
                  <SelectItem value="asc">Harga Terendah</SelectItem>
                  <SelectItem value="desc">Harga Tertinggi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                {servicesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-teal-600 mr-2" />
                    <span className="text-sm text-muted-foreground">Memuat...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-semibold">Nama Layanan</TableHead>
                          <TableHead className="text-xs font-semibold">Kategori</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Harga</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Durasi</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSvcList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                              <div className="flex flex-col items-center gap-2">
                                <FileText className="w-8 h-8 opacity-30" />
                                <p>
                                  Belum ada layanan. Klik{' '}
                                  <strong className="text-foreground">"+ Tambah Layanan"</strong>{' '}
                                  untuk menambahkan.
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          svcPaged.map((svc) => (
                            <TableRow key={svc.id} className="hover:bg-accent/50 transition-colors">
                              <TableCell className="font-medium text-sm">
                                {svc.namaLayanan}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">
                                  {svc.kategori}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-sm text-teal-700 dark:text-teal-400">
                                {formatCurrency(svc.harga)}
                              </TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground">
                                <div className="flex items-center justify-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {svc.durasi} mnt
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={svc.status === 'Aktif' ? 'default' : 'outline'}
                                  className={`text-[10px] ${svc.status === 'Aktif' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                                >
                                  {svc.status === 'Aktif' ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Aktif
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Nonaktif
                                    </>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setViewingService(svc)}
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Lihat detail</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => openEditServiceDialog(svc)}
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit layanan</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => setConfirmDeleteId(svc.id)}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Hapus layanan</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center justify-center px-1">
                                        <Switch
                                          checked={svc.status === 'Aktif'}
                                          onCheckedChange={() => handleToggleServiceStatus(svc)}
                                          className="data-[state=checked]:bg-teal-600 scale-75 cursor-pointer"
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {svc.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {filteredSvcList.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Total: <strong className="text-foreground">{filteredSvcList.length}</strong> layanan{' '}
                  {services.length !== filteredSvcList.length && (
                    <span className="text-muted-foreground/70">(dari {services.length})</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSvcCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={svcCurrentPage <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    Page {svcCurrentPage} of {svcTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSvcCurrentPage((p) => Math.min(svcTotalPages, p + 1))}
                    disabled={svcCurrentPage >= svcTotalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
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

        {/* ─── Add Homecare Service Dialog ───────────────────────────────── */}
        <Dialog open={hcAddOpen} onOpenChange={(open) => { if (!open) setHcAddOpen(false); }}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-600" />
                Tambah Layanan Home Care
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="new-svc-name" className="text-sm font-medium">Nama Layanan</Label>
                <Input
                  id="new-svc-name"
                  value={newSvcName}
                  onChange={(e) => { setNewSvcName(e.target.value); if (newSvcError) setNewSvcError(''); }}
                  placeholder="mis. Perawatan Luka"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-svc-category" className="text-sm font-medium">Kategori</Label>
                <Select value={newSvcCategory} onValueChange={setNewSvcCategory}>
                  <SelectTrigger id="new-svc-category">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-svc-desc" className="text-sm font-medium">Deskripsi (opsional)</Label>
                <Input
                  id="new-svc-desc"
                  value={newSvcDescription}
                  onChange={(e) => setNewSvcDescription(e.target.value)}
                  placeholder="Penjelasan singkat layanan"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-svc-price" className="text-sm font-medium">Harga (Rp)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">Rp</span>
                  <Input
                    id="new-svc-price"
                    type="number"
                    min="0"
                    value={newSvcPrice}
                    onChange={(e) => { setNewSvcPrice(e.target.value); if (newSvcError) setNewSvcError(''); }}
                    className="pl-10"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-svc-duration" className="text-sm font-medium">Durasi (menit)</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-svc-duration"
                    type="number"
                    min="1"
                    value={newSvcDuration}
                    onChange={(e) => { setNewSvcDuration(e.target.value); if (newSvcError) setNewSvcError(''); }}
                    className="pl-9"
                    placeholder="mis. 45"
                  />
                </div>
              </div>

              {newSvcError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{newSvcError}</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setHcAddOpen(false)} disabled={newSvcSaving}>
                <X className="w-4 h-4 mr-1.5" />
                Batal
              </Button>
              <Button onClick={handleAddService} disabled={newSvcSaving} className="bg-teal-600 hover:bg-teal-700 text-white">
                {newSvcSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menyimpan...
                  </div>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1.5" />
                    Tambah Layanan
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Delete Homecare Service Confirm ───────────────────────────── */}
        <Dialog open={!!hcDeleteConfirmId} onOpenChange={(open) => { if (!open) setHcDeleteConfirmId(null); }}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-4 h-4" />
                Hapus Layanan?
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              Apakah Anda yakin ingin menghapus layanan ini? Jika layanan ini sudah pernah digunakan
              dalam transaksi, layanan tidak akan dihapus permanen — hanya dinonaktifkan agar histori
              transaksi lama tetap utuh.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setHcDeleteConfirmId(null)} disabled={hcDeleting}>
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => hcDeleteConfirmId && handleDeleteService(hcDeleteConfirmId)}
                disabled={hcDeleting}
              >
                {hcDeleting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menghapus...
                  </div>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Hapus
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

        {/* ─── Add / Edit Layanan Dialog ──────────────────────────────────── */}
        <Dialog
          open={showAddServiceDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowAddServiceDialog(false);
              setEditingServiceItem(null);
              resetSvcForm();
            }
          }}
        >
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingServiceItem ? (
                  <>
                    <Pencil className="w-4 h-4 text-teal-600" />
                    Edit Layanan
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-teal-600" />
                    Tambah Layanan
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Nama Layanan */}
              <div className="space-y-2">
                <Label htmlFor="svc-nama" className="text-sm font-medium">
                  Nama Layanan <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="svc-nama"
                  value={svcNamaLayanan}
                  onChange={(e) => {
                    setSvcNamaLayanan(e.target.value);
                    if (svcFormError) setSvcFormError('');
                  }}
                  placeholder="Contoh: Konsultasi Dokter Umum"
                />
              </div>

              {/* Kategori */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Kategori <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={svcKategori}
                  onValueChange={(v) => {
                    setSvcKategori(v);
                    if (svcFormError) setSvcFormError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Harga & Durasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="svc-harga" className="text-sm font-medium">
                    Harga (Rp) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">Rp</span>
                    <Input
                      id="svc-harga"
                      type="number"
                      min="1"
                      value={svcHarga}
                      onChange={(e) => {
                        setSvcHarga(e.target.value);
                        if (svcFormError) setSvcFormError('');
                      }}
                      className="pl-10"
                      placeholder="0"
                    />
                  </div>
                  {Number(svcHarga) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Format: {formatCurrency(Number(svcHarga))}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="svc-durasi" className="text-sm font-medium">
                    Durasi (menit) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="svc-durasi"
                      type="number"
                      min="1"
                      step="1"
                      value={svcDurasi}
                      onChange={(e) => {
                        setSvcDurasi(e.target.value);
                        if (svcFormError) setSvcFormError('');
                      }}
                      className="pl-9"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select
                  value={svcStatus}
                  onValueChange={(v) => setSvcStatus(v as ServiceStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Deskripsi */}
              <div className="space-y-2">
                <Label htmlFor="svc-deskripsi" className="text-sm font-medium">
                  Deskripsi{' '}
                  <span className="text-muted-foreground text-xs font-normal">(opsional)</span>
                </Label>
                <Textarea
                  id="svc-deskripsi"
                  value={svcDeskripsi}
                  onChange={(e) => setSvcDeskripsi(e.target.value)}
                  placeholder="Deskripsi singkat layanan..."
                  rows={3}
                />
              </div>

              {/* Error */}
              {svcFormError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{svcFormError}</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddServiceDialog(false);
                  setEditingServiceItem(null);
                  resetSvcForm();
                }}
                disabled={svcSaving}
              >
                <X className="w-4 h-4 mr-1.5" />
                Batal
              </Button>
              <Button
                onClick={handleSaveServiceForm}
                disabled={svcSaving}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {svcSaving ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
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

        {/* ─── View Service Detail Dialog ─────────────────────────────────── */}
        <Dialog
          open={!!viewingService}
          onOpenChange={(open) => { if (!open) setViewingService(null); }}
        >
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-teal-600" />
                Detail Layanan
              </DialogTitle>
            </DialogHeader>
            {viewingService && (
              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Nama Layanan</p>
                  <p className="text-sm font-medium">{viewingService.namaLayanan}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Kategori</p>
                    <Badge variant="outline" className="text-[10px]">{viewingService.kategori}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge
                      variant={viewingService.status === 'Aktif' ? 'default' : 'outline'}
                      className={`text-[10px] ${viewingService.status === 'Aktif' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                    >
                      {viewingService.status === 'Aktif' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Harga</p>
                    <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                      {formatCurrency(viewingService.harga)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Durasi</p>
                    <p className="text-sm font-medium">{viewingService.durasi} mnt</p>
                  </div>
                </div>
                {viewingService.deskripsi && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Deskripsi</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap p-3 rounded-lg bg-muted">
                      {viewingService.deskripsi}
                    </p>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
                  <div>
                    <p>Dibuat oleh</p>
                    <p className="text-foreground">{viewingService.createdBy || '-'}</p>
                  </div>
                  <div>
                    <p>Dibuat pada</p>
                    <p className="text-foreground">{formatDate(viewingService.createdAt)}</p>
                  </div>
                  <div>
                    <p>Diperbarui pada</p>
                    <p className="text-foreground">{formatDate(viewingService.updatedAt)}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingService(null)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Delete Confirmation Dialog ─────────────────────────────────── */}
        <Dialog
          open={!!confirmDeleteId}
          onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
        >
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-4 h-4" />
                Konfirmasi Hapus
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              Yakin ingin menghapus layanan ini? Tindakan tidak dapat dibatalkan.
            </p>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteId(null)}
                disabled={svcDeleting}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteService}
                disabled={svcDeleting}
              >
                {svcDeleting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menghapus...
                  </div>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Hapus
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
