'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import type { Consultation, Prescription, PrescriptionItem } from '@/lib/types';
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
  DialogFooter,
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
  Stethoscope,
  Users,
  DollarSign,
  Star,
  CalendarIcon,
  Clock,
  MessageCircle,
  Video,
  Phone,
  FileText,
  Plus,
  Trash2,
  ChevronRight,
  Activity,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

function getConsultationStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    waiting: { label: 'Menunggu', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    active: { label: 'Aktif', className: 'bg-green-100 text-green-800 border-green-200' },
    completed: { label: 'Selesai', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    cancelled: { label: 'Dibatalkan', className: 'bg-red-100 text-red-800 border-red-200' },
  };
  const c = config[status] || { label: status, className: '' };
  return (
    <Badge variant="outline" className={cn('font-medium text-xs', c.className)}>
      {c.label}
    </Badge>
  );
}

function getPrescriptionStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    active: { label: 'Aktif', className: 'bg-green-100 text-green-800 border-green-200' },
    fulfilled: { label: 'Ditebus', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    expired: { label: 'Kadaluarsa', className: 'bg-red-100 text-red-800 border-red-200' },
  };
  const c = config[status] || { label: status, className: '' };
  return (
    <Badge variant="outline" className={cn('font-medium text-xs', c.className)}>
      {c.label}
    </Badge>
  );
}

const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

interface MedicineItem {
  medicineName: string;
  dosage: string;
  quantity: number;
  frequency: string;
  duration: string;
  instructions: string;
}

interface ScheduleSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

// Demo earnings data
const monthlyEarnings = [
  { month: 'Jan', amount: 3200000 },
  { month: 'Feb', amount: 2800000 },
  { month: 'Mar', amount: 4100000 },
  { month: 'Apr', amount: 3600000 },
  { month: 'Mei', amount: 4500000 },
  { month: 'Jun', amount: 3900000 },
];

export function DoctorPanel() {
  const {
    consultations,
    setConsultations,
    currentUser,
    doctors,
  } = useStore();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([
    {
      id: 'rx-1',
      consultationId: 'c-1',
      doctorId: 'd-1',
      patientId: 'p-1',
      status: 'active',
      notes: 'Minum setelah makan',
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-01-15T10:00:00Z',
      items: [
        { id: 'ri-1', prescriptionId: 'rx-1', medicineName: 'Amoxicillin 500mg', dosage: '500mg', quantity: 21, frequency: '3x sehari', duration: '7 hari', instructions: 'Minum setelah makan' },
        { id: 'ri-2', prescriptionId: 'rx-1', medicineName: 'Paracetamol 500mg', dosage: '500mg', quantity: 10, frequency: '3x sehari jika perlu', duration: '3 hari', instructions: 'Jika demam' },
      ],
    },
    {
      id: 'rx-2',
      consultationId: 'c-2',
      doctorId: 'd-1',
      patientId: 'p-2',
      status: 'fulfilled',
      notes: '',
      createdAt: '2025-01-10T14:00:00Z',
      updatedAt: '2025-01-10T14:00:00Z',
      items: [
        { id: 'ri-3', prescriptionId: 'rx-2', medicineName: 'Omeprazole 20mg', dosage: '20mg', quantity: 14, frequency: '1x sehari', duration: '14 hari', instructions: 'Minum sebelum sarapan' },
      ],
    },
    {
      id: 'rx-3',
      consultationId: 'c-3',
      doctorId: 'd-1',
      patientId: 'p-3',
      status: 'active',
      notes: 'Hindari makanan pedas',
      createdAt: '2025-01-18T09:00:00Z',
      updatedAt: '2025-01-18T09:00:00Z',
      items: [
        { id: 'ri-4', prescriptionId: 'rx-3', medicineName: 'Ranitidine 150mg', dosage: '150mg', quantity: 28, frequency: '2x sehari', duration: '14 hari', instructions: 'Minum sebelum makan' },
        { id: 'ri-5', prescriptionId: 'rx-3', medicineName: 'Antasida Sirup', dosage: '10ml', quantity: 2, frequency: '3x sehari', duration: '7 hari', instructions: 'Setelah makan' },
        { id: 'ri-6', prescriptionId: 'rx-3', medicineName: 'Sucralfate 1g', dosage: '1g', quantity: 21, frequency: '3x sehari', duration: '7 hari', instructions: 'Minum 1 jam sebelum makan' },
      ],
    },
  ]);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([
    { dayOfWeek: 1, startTime: '08:00', endTime: '12:00', isActive: true },
    { dayOfWeek: 1, startTime: '14:00', endTime: '17:00', isActive: true },
    { dayOfWeek: 2, startTime: '09:00', endTime: '15:00', isActive: true },
    { dayOfWeek: 3, startTime: '08:00', endTime: '12:00', isActive: true },
    { dayOfWeek: 4, startTime: '10:00', endTime: '16:00', isActive: true },
    { dayOfWeek: 5, startTime: '08:00', endTime: '13:00', isActive: true },
    { dayOfWeek: 6, startTime: '09:00', endTime: '12:00', isActive: false },
  ]);
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [medicineItems, setMedicineItems] = useState<MedicineItem[]>([
    { medicineName: '', dosage: '', quantity: 1, frequency: '', duration: '', instructions: '' },
  ]);
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [editingSchedule, setEditingSchedule] = useState<ScheduleSlot>({
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '16:00',
    isActive: true,
  });

  // Load consultations
  const loadConsultations = useCallback(async () => {
    try {
      const res = await fetch('/api/consultations');
      if (res.ok) {
        const data = await res.json();
        if (data.consultations) setConsultations(data.consultations);
      }
    } catch (error) {
      console.error('Failed to load consultations:', error);
    }
  }, [setConsultations]);

  useEffect(() => {
    loadConsultations();
  }, [loadConsultations]);

  // Computed stats
  const todayConsultations = consultations.filter(c => {
    const today = new Date().toDateString();
    return new Date(c.createdAt).toDateString() === today;
  });

  const activeConsultations = consultations.filter(c => c.status === 'active' || c.status === 'waiting');
  const completedConsultations = consultations.filter(c => c.status === 'completed');
  const totalPatients = new Set(completedConsultations.map(c => c.patientId)).size;
  const monthlyEarning = monthlyEarnings[monthlyEarnings.length - 1]?.amount || 0;
  const avgRating = doctors.length > 0
    ? (doctors.reduce((sum, d) => sum + (d.doctorProfile?.rating || 0), 0) / doctors.length).toFixed(1)
    : '4.8';

  const addMedicineItem = () => {
    setMedicineItems([...medicineItems, { medicineName: '', dosage: '', quantity: 1, frequency: '', duration: '', instructions: '' }]);
  };

  const removeMedicineItem = (index: number) => {
    if (medicineItems.length > 1) {
      setMedicineItems(medicineItems.filter((_, i) => i !== index));
    }
  };

  const updateMedicineItem = (index: number, field: keyof MedicineItem, value: string | number) => {
    const updated = [...medicineItems];
    updated[index] = { ...updated[index], [field]: value };
    setMedicineItems(updated);
  };

  const handleSavePrescription = () => {
    const newPrescription: Prescription = {
      id: `rx-${Date.now()}`,
      consultationId: `c-${Date.now()}`,
      doctorId: currentUser?.id || 'd-1',
      patientId: selectedPatientId,
      status: 'active',
      notes: prescriptionNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: medicineItems.map((item, i) => ({
        id: `ri-${Date.now()}-${i}`,
        prescriptionId: `rx-${Date.now()}`,
        medicineName: item.medicineName,
        dosage: item.dosage,
        quantity: item.quantity,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions || undefined,
      })),
    };
    setPrescriptions([newPrescription, ...prescriptions]);
    setPrescriptionDialogOpen(false);
    setMedicineItems([{ medicineName: '', dosage: '', quantity: 1, frequency: '', duration: '', instructions: '' }]);
    setPrescriptionNotes('');
    setSelectedPatientId('');
  };

  const handleSaveSchedule = () => {
    const existing = scheduleSlots.findIndex(
      s => s.dayOfWeek === editingSchedule.dayOfWeek && s.startTime === editingSchedule.startTime
    );
    if (existing >= 0) {
      const updated = [...scheduleSlots];
      updated[existing] = editingSchedule;
      setScheduleSlots(updated);
    } else {
      setScheduleSlots([...scheduleSlots, editingSchedule]);
    }
    setScheduleDialogOpen(false);
  };

  // Get unique patients from consultations for prescription patient selection
  const patientOptions = Array.from(
    new Map(
      consultations
        .filter(c => c.patient)
        .map(c => [c.patient!.id, c.patient!])
    ).values()
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
          <TabsTrigger value="konsultasi" className="text-xs">Konsultasi</TabsTrigger>
          <TabsTrigger value="chat" className="text-xs">Chat Pasien</TabsTrigger>
          <TabsTrigger value="eresep" className="text-xs">E-Resep</TabsTrigger>
          <TabsTrigger value="jadwal" className="text-xs">Jadwal</TabsTrigger>
          <TabsTrigger value="pendapatan" className="text-xs">Pendapatan</TabsTrigger>
        </TabsList>

        {/* Tab 1: Dashboard */}
        <TabsContent value="dashboard" className="space-y-6 mt-4 overflow-y-auto custom-scrollbar">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Konsultasi Hari Ini</p>
                    <p className="text-xl font-bold">{todayConsultations.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Pasien</p>
                    <p className="text-xl font-bold">{totalPatients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pendapatan Bulan Ini</p>
                    <p className="text-xl font-bold">Rp {formatCurrency(monthlyEarning)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <p className="text-xl font-bold">{avgRating}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Schedule Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Jadwal Hari Ini</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeConsultations.length > 0 ? (
                  activeConsultations.slice(0, 5).map((consultation, index) => (
                    <div key={consultation.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          'w-3 h-3 rounded-full mt-1',
                          consultation.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                        )} />
                        {index < activeConsultations.length - 1 && (
                          <div className="w-0.5 h-8 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {consultation.patient?.name || 'Pasien'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {consultation.type === 'chat' && <MessageCircle className="w-3 h-3" />}
                            {consultation.type === 'video' && <Video className="w-3 h-3" />}
                            {consultation.type === 'audio' && <Phone className="w-3 h-3" />}
                            {consultation.type.charAt(0).toUpperCase() + consultation.type.slice(1)}
                          </span>
                          <span>{new Date(consultation.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      {getConsultationStatusBadge(consultation.status)}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <CalendarIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Tidak ada konsultasi hari ini</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Patient List */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Pasien Terbaru</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {consultations.slice(0, 8).map((consultation) => (
                  <div key={consultation.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                      {consultation.patient?.name?.charAt(0) || 'P'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{consultation.patient?.name || 'Pasien'}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(consultation.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      {consultation.type === 'chat' && <MessageCircle className="w-3.5 h-3.5" />}
                      {consultation.type === 'video' && <Video className="w-3.5 h-3.5" />}
                      {consultation.type === 'audio' && <Phone className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                ))}
                {consultations.length === 0 && (
                  <div className="text-center py-6">
                    <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Belum ada pasien</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Konsultasi */}
        <TabsContent value="konsultasi" className="space-y-4 mt-4 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Daftar Konsultasi</h3>
            <Select defaultValue="all">
              <SelectTrigger className="w-32 text-xs">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="waiting">Menunggu</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
            {consultations.map((consultation) => (
              <Card key={consultation.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                      {consultation.patient?.name?.charAt(0) || 'P'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{consultation.patient?.name || 'Pasien'}</p>
                        {getConsultationStatusBadge(consultation.status)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          {consultation.type === 'chat' && <MessageCircle className="w-3 h-3" />}
                          {consultation.type === 'video' && <Video className="w-3 h-3" />}
                          {consultation.type === 'audio' && <Phone className="w-3 h-3" />}
                          {consultation.type.charAt(0).toUpperCase() + consultation.type.slice(1)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(consultation.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}{' '}
                          {new Date(consultation.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {consultation.status === 'waiting' || consultation.status === 'active' ? (
                        <Button size="sm" className="text-xs">
                          Mulai Konsultasi
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="text-xs">
                          Lihat Detail
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {consultations.length === 0 && (
              <div className="text-center py-12">
                <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Belum ada konsultasi</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Chat Pasien */}
        <TabsContent value="chat" className="mt-4">
          <ChatPasienSection consultations={consultations} />
        </TabsContent>

        {/* Tab 4: E-Resep */}
        <TabsContent value="eresep" className="space-y-4 mt-4 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Resep Elektronik</h3>
            <Button size="sm" className="text-xs" onClick={() => setPrescriptionDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Buat Resep Baru
            </Button>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
            {prescriptions.map((prescription) => (
              <Card key={prescription.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold">
                          {consultations.find(c => c.patientId === prescription.patientId)?.patient?.name || 'Pasien'}
                        </p>
                        {getPrescriptionStatusBadge(prescription.status)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {new Date(prescription.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {prescription.items?.length || 0} item
                        </span>
                      </div>
                      {prescription.notes && (
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {prescription.notes}
                        </p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="text-xs shrink-0">
                      Lihat
                    </Button>
                  </div>

                  {/* Medicine items preview */}
                  {prescription.items && prescription.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="space-y-1.5">
                        {prescription.items.map((item) => (
                          <div key={item.id} className="flex items-start gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            <div>
                              <span className="font-medium">{item.medicineName}</span>
                              <span className="text-muted-foreground ml-1">
                                - {item.dosage}, {item.quantity}x, {item.frequency}, {item.duration}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {prescriptions.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Belum ada resep</p>
              </div>
            )}
          </div>

          {/* Prescription Dialog */}
          <Dialog open={prescriptionDialogOpen} onOpenChange={setPrescriptionDialogOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader className="shrink-0">
                <DialogTitle>Buat Resep Baru</DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                {/* Patient Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Pilih Pasien</Label>
                  <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pasien" />
                    </SelectTrigger>
                    <SelectContent>
                      {patientOptions.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name}
                        </SelectItem>
                      ))}
                      {patientOptions.length === 0 && (
                        <SelectItem value="demo-patient" disabled>
                          Tidak ada pasien tersedia
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Medicine Items */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-muted-foreground">Daftar Obat</Label>
                  {medicineItems.map((item, index) => (
                    <div key={index} className="p-3 bg-muted/30 rounded-lg space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Obat #{index + 1}</span>
                        {medicineItems.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeMedicineItem(index)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Nama Obat</Label>
                          <Input
                            value={item.medicineName}
                            onChange={(e) => updateMedicineItem(index, 'medicineName', e.target.value)}
                            placeholder="Nama obat"
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Dosis</Label>
                          <Input
                            value={item.dosage}
                            onChange={(e) => updateMedicineItem(index, 'dosage', e.target.value)}
                            placeholder="Contoh: 500mg"
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Jumlah</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateMedicineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            min={1}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Frekuensi</Label>
                          <Input
                            value={item.frequency}
                            onChange={(e) => updateMedicineItem(index, 'frequency', e.target.value)}
                            placeholder="Contoh: 3x sehari"
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Durasi</Label>
                          <Input
                            value={item.duration}
                            onChange={(e) => updateMedicineItem(index, 'duration', e.target.value)}
                            placeholder="Contoh: 7 hari"
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Instruksi</Label>
                          <Input
                            value={item.instructions}
                            onChange={(e) => updateMedicineItem(index, 'instructions', e.target.value)}
                            placeholder="Instruksi tambahan"
                            className="text-xs h-8"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={addMedicineItem}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Tambah Obat
                  </Button>
                </div>

                <Separator />

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Catatan</Label>
                  <Textarea
                    value={prescriptionNotes}
                    onChange={(e) => setPrescriptionNotes(e.target.value)}
                    placeholder="Catatan tambahan untuk resep..."
                    className="text-sm resize-none"
                    rows={2}
                  />
                </div>

              </div>
              <DialogFooter className="shrink-0">
                <Button
                  onClick={handleSavePrescription}
                  className="w-full"
                  disabled={!selectedPatientId || medicineItems.some(i => !i.medicineName || !i.dosage)}
                >
                  Simpan Resep
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Tab 5: Jadwal Praktik */}
        <TabsContent value="jadwal" className="space-y-4 mt-4 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Jadwal Praktik Mingguan</h3>
            <Button size="sm" className="text-xs" onClick={() => {
              setEditingSchedule({ dayOfWeek: 1, startTime: '08:00', endTime: '16:00', isActive: true });
              setScheduleDialogOpen(true);
            }}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Tambah Jadwal
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              const daySlots = scheduleSlots
                .filter(s => s.dayOfWeek === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              return (
                <Card key={day} className={cn(!daySlots.some(s => s.isActive) && 'opacity-60')}>
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold">{dayNames[day]}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    {daySlots.length > 0 ? (
                      <div className="space-y-2">
                        {daySlots.map((slot, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'flex items-center justify-between p-2 rounded-md text-xs',
                              slot.isActive ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-muted/50 text-muted-foreground border border-border'
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              <span>{slot.startTime} - {slot.endTime}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => {
                                setEditingSchedule({ ...slot });
                                setScheduleDialogOpen(true);
                              }}
                            >
                              <ChevronRight className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground py-2">Tidak ada jadwal</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Schedule Dialog */}
          <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
            <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
              <DialogHeader className="shrink-0">
                <DialogTitle>Tambah/Edit Jadwal</DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Hari</Label>
                  <Select
                    value={String(editingSchedule.dayOfWeek)}
                    onValueChange={(val) => setEditingSchedule({ ...editingSchedule, dayOfWeek: parseInt(val) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayNames.map((name, index) => (
                        <SelectItem key={index} value={String(index)}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Jam Mulai</Label>
                    <Input
                      type="time"
                      value={editingSchedule.startTime}
                      onChange={(e) => setEditingSchedule({ ...editingSchedule, startTime: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Jam Selesai</Label>
                    <Input
                      type="time"
                      value={editingSchedule.endTime}
                      onChange={(e) => setEditingSchedule({ ...editingSchedule, endTime: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingSchedule.isActive}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, isActive: e.target.checked })}
                    className="rounded border-border"
                  />
                  <Label className="text-sm">Aktif</Label>
                </div>
              </div>
              <DialogFooter className="shrink-0">
                <Button onClick={handleSaveSchedule} className="w-full">
                  Simpan Jadwal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Tab 6: Pendapatan */}
        <TabsContent value="pendapatan" className="space-y-6 mt-4 overflow-y-auto custom-scrollbar">
          {/* Earnings Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Bulan Ini</p>
                <p className="text-2xl font-bold text-primary mt-1">Rp {formatCurrency(monthlyEarning)}</p>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  +12% dari bulan lalu
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Pendapatan</p>
                <p className="text-2xl font-bold mt-1">
                  Rp {formatCurrency(monthlyEarnings.reduce((sum, m) => sum + m.amount, 0))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">6 bulan terakhir</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Rata-rata / Bulan</p>
                <p className="text-2xl font-bold mt-1">
                  Rp {formatCurrency(Math.round(monthlyEarnings.reduce((sum, m) => sum + m.amount, 0) / monthlyEarnings.length))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Konsultasi & home care</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Earnings Chart (Simple bar chart) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Pendapatan Bulanan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyEarnings.map((item) => {
                  const maxAmount = Math.max(...monthlyEarnings.map(m => m.amount));
                  const percentage = (item.amount / maxAmount) * 100;
                  return (
                    <div key={item.month} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-8 shrink-0">{item.month}</span>
                      <div className="flex-1 h-6 bg-muted/50 rounded-md overflow-hidden">
                        <div
                          className="h-full bg-primary/80 rounded-md flex items-center px-2 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        >
                          <span className="text-[10px] text-primary-foreground font-medium whitespace-nowrap">
                            Rp {formatCurrency(item.amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Transaction List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Riwayat Transaksi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {consultations.filter(c => c.status === 'completed').slice(0, 10).map((consultation) => {
                const fee = consultation.doctor?.doctorProfile?.consultationFee || 75000;
                return (
                  <div key={consultation.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">
                          Konsultasi - {consultation.patient?.name || 'Pasien'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(consultation.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-green-600 shrink-0">
                      +Rp {formatCurrency(fee)}
                    </span>
                  </div>
                );
              })}
              {consultations.filter(c => c.status === 'completed').length === 0 && (
                <div className="text-center py-6">
                  <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Chat Pasien Section Component
function ChatPasienSection({ consultations }: { consultations: Consultation[] }) {
  const [selectedPatient, setSelectedPatient] = useState<Consultation | null>(null);
  const [chatInput, setChatInput] = useState('');
  const { messages, setMessages } = useStore();

  const chatConsultations = consultations.filter(c =>
    c.type === 'chat' && (c.status === 'active' || c.status === 'waiting' || c.status === 'completed')
  );

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[400px] border rounded-lg overflow-hidden bg-card">
      {/* Chat List */}
      <div className={cn(
        'w-full md:w-80 border-r border-border flex flex-col',
        selectedPatient ? 'hidden md:flex' : 'flex'
      )}>
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-semibold">Chat Pasien</h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {chatConsultations.length > 0 ? (
            chatConsultations.map((consultation) => (
              <button
                key={consultation.id}
                onClick={() => setSelectedPatient(consultation)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50',
                  selectedPatient?.id === consultation.id && 'bg-muted'
                )}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                  {consultation.patient?.name?.charAt(0) || 'P'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{consultation.patient?.name || 'Pasien'}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {new Date(consultation.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {consultation.notes || 'Konsultasi ' + consultation.type}
                  </p>
                </div>
                {consultation.status === 'waiting' && (
                  <div className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
                )}
              </button>
            ))
          ) : (
            <div className="text-center py-12">
              <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada chat</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        'flex-1 flex flex-col',
        !selectedPatient ? 'hidden md:flex' : 'flex'
      )}>
        {selectedPatient ? (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b border-border flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden h-8 w-8 p-0"
                onClick={() => setSelectedPatient(null)}
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                {selectedPatient.patient?.name?.charAt(0) || 'P'}
              </div>
              <div>
                <p className="text-sm font-semibold">{selectedPatient.patient?.name || 'Pasien'}</p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedPatient.status === 'active' ? 'Online' : selectedPatient.status === 'waiting' ? 'Menunggu' : 'Offline'}
                </p>
              </div>
              {getConsultationStatusBadge(selectedPatient.status)}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {/* Demo messages */}
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg rounded-tl-none p-3 max-w-[75%]">
                  <p className="text-sm">Selamat pagi, Dok. Saya sudah merasakan gejala ini sejak 2 hari yang lalu.</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">09:15</span>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-lg rounded-tr-none p-3 max-w-[75%]">
                  <p className="text-sm">Selamat pagi. Bisa dijelaskan lebih detail mengenai gejalanya?</p>
                  <span className="text-[10px] text-primary-foreground/70 mt-1 block">09:16</span>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg rounded-tl-none p-3 max-w-[75%]">
                  <p className="text-sm">Saya mengalami demam, sakit kepala, dan batuk. Nafsu makan juga berkurang.</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">09:17</span>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-lg rounded-tr-none p-3 max-w-[75%]">
                  <p className="text-sm">Apakah ada riwayat kontak dengan pasien positif? Dan apakah ada gejala sesak napas?</p>
                  <span className="text-[10px] text-primary-foreground/70 mt-1 block">09:18</span>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg rounded-tl-none p-3 max-w-[75%]">
                  <p className="text-sm">Tidak ada kontak yang saya ketahui, dan tidak ada sesak napas, Dok.</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">09:20</span>
                </div>
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ketik pesan..."
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && chatInput.trim()) {
                      setChatInput('');
                    }
                  }}
                />
                <Button
                  size="sm"
                  disabled={!chatInput.trim()}
                  onClick={() => {
                    if (chatInput.trim()) setChatInput('');
                  }}
                >
                  <Megaphone className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Pilih percakapan untuk memulai chat</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
