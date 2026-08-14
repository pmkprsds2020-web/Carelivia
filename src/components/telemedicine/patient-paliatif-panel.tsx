'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { isValidUuid } from '@/services/supabase';
import { getToolLabel, type ScreeningScoreResult } from '@/lib/palliative-screening-data';
import { InlineScreeningForm } from '@/components/telemedicine/inline-screening-form';
import { MedicationMonitoringForm } from '@/components/telemedicine/medication-monitoring-form';
import type {
  PatientTransportRequest,
  PatientCareUpdate,
  PatientPaliatifChatMessage,
  PalliativeChatMessage,
  PatientTransportRequestType,
  PatientConditionStatus,
  PalliativePatientInfo,
  TTVFormAnswers,
  VitalSignRecordInfo,
  PalliativeClinicalAlert,
  DailyComplaintRecord,
  PalliativeScreeningRecordInfo,
  MedicationMonitoringFormAnswers,
} from '@/lib/types';
import { TTVForm, checkTTVAlerts } from '@/components/telemedicine/ttv-form';
import { DailyComplaintForm } from '@/components/telemedicine/daily-complaint-panel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  HeartPulse,
  Users,
  BookOpen,
  ClipboardList,
  Phone,
  Car,
  MessageCircle,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Send,
  FileText,
  Activity,
  Eye,
  Download,
  Video,
  PhoneCall,
  MessageSquare,
  Wifi,
  WifiOff,
  Stethoscope,
  UserCheck,
  Bell,
  Ambulance,
  Pill,
  Home,
  AlertTriangle,
} from 'lucide-react';

// ── Helper Functions ──────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

const REQUEST_TYPE_LABELS: Record<PatientTransportRequestType, string> = {
  kontrol_faskes: 'Kontrol Faskes',
  kunjungan_rumah: 'Kunjungan Rumah',
  transportasi_darurat: 'Transportasi Darurat',
  pengambilan_obat: 'Pengambilan Obat',
  lainnya: 'Lainnya',
};

const STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
  menunggu_konfirmasi: { label: 'Menunggu Konfirmasi', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  disetujui: { label: 'Disetujui', className: 'bg-teal-100 text-teal-800 border-teal-200' },
  dijadwalkan: { label: 'Dijadwalkan', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  selesai: { label: 'Selesai', className: 'bg-green-100 text-green-800 border-green-200' },
  ditolak: { label: 'Ditolak', className: 'bg-red-100 text-red-800 border-red-200' },
};

const MEETING_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  dijadwalkan: { label: 'Dijadwalkan', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  berlangsung: { label: 'Berlangsung', className: 'bg-teal-100 text-teal-800 border-teal-200' },
  selesai: { label: 'Selesai', className: 'bg-green-100 text-green-800 border-green-200' },
  dibatalkan: { label: 'Dibatalkan', className: 'bg-red-100 text-red-800 border-red-200' },
};

const CONDITION_STATUS_LABELS: Record<PatientConditionStatus, { label: string; className: string }> = {
  membaik: { label: 'Membaik', className: 'bg-green-100 text-green-800 border-green-200' },
  stabil: { label: 'Stabil', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  menurun: { label: 'Menurun', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  keluhan_baru: { label: 'Keluhan Baru', className: 'bg-red-100 text-red-800 border-red-200' },
};

const FORM_TYPE_LABELS: Record<string, string> = {
  form_ttv: 'Form TTV',
  form_keluhan: 'Form Keluhan',
  form_esas: 'Form ESAS-r',
  form_pps: 'Form PPS',
  form_distress: 'Form Distress',
  form_screening: 'Form Screening',
};

const EDU_CATEGORY_LABELS: Record<string, string> = {
  perawatan_rumah: 'Perawatan Rumah',
  panduan_caregiver: 'Panduan Caregiver',
  video_edukasi: 'Video Edukasi',
  dukungan_psikososial: 'Dukungan Psikososial',
  gawat_darurat: 'Gawat Darurat',
  end_of_life: 'End of Life',
  faq: 'FAQ',
};

// ── Main Component ────────────────────────────────────────────────────────

export function PatientPaliatifPanel() {
  const {
    palliativePatients,
    currentUser,
    familyMeetings,
    eduMaterials,
    emergencyContacts,
    patientTransportRequests,
    addPatientTransportRequest,
    patientCareUpdates,
    addPatientCareUpdate,
    palliativeChatMessages,
    addPalliativeChatMessage,
  } = useStore();

  // Resolve the palliative-patient record for whoever is actually logged in,
  // not a hardcoded demo id — this was the root cause of the patient side
  // never lining up with the doctor's Monitoring Paliatif data for the same person.
  const palliativePatient = palliativePatients.find(p => p.patientId === currentUser?.id);
  const patientId = palliativePatient?.id || '';

  // Filter data for this patient
  const myTransportRequests = patientTransportRequests.filter(r => r.palliativePatientId === patientId);
  const myCareUpdates = patientCareUpdates.filter(u => u.palliativePatientId === patientId);
  const myMessages = palliativeChatMessages.filter(m => m.palliativePatientId === patientId || m.roomId === `room-${patientId}`);
  const myMeetings = familyMeetings.filter(m => m.palliativePatientId === patientId);
  // Edu materials bersifat katalog umum (tidak per-pasien)
  const myEduMaterials = eduMaterials;
  const myEmergencyContacts = emergencyContacts.filter(c => c.palliativePatientId === patientId);

  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
            <HeartPulse className="w-4 h-4 mr-1" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="meetings" className="text-xs sm:text-sm">
            <Users className="w-4 h-4 mr-1" /> Family Meeting
          </TabsTrigger>
          <TabsTrigger value="education" className="text-xs sm:text-sm">
            <BookOpen className="w-4 h-4 mr-1" /> Dukungan Keluarga
          </TabsTrigger>
          <TabsTrigger value="care" className="text-xs sm:text-sm">
            <ClipboardList className="w-4 h-4 mr-1" /> Koordinasi Perawatan
          </TabsTrigger>
          <TabsTrigger value="emergency" className="text-xs sm:text-sm">
            <Phone className="w-4 h-4 mr-1" /> Kontak Darurat
          </TabsTrigger>
          <TabsTrigger value="transport" className="text-xs sm:text-sm">
            <Car className="w-4 h-4 mr-1" /> Transportasi
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-xs sm:text-sm">
            <MessageCircle className="w-4 h-4 mr-1" /> Chat Paliatif
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab
            palliativePatient={palliativePatient}
            myTransportRequests={myTransportRequests}
            myCareUpdates={myCareUpdates}
            myMessages={myMessages}
            myMeetings={myMeetings}
            myEduMaterials={myEduMaterials}
            myEmergencyContacts={myEmergencyContacts}
            onNavigate={setActiveTab}
          />
        </TabsContent>

        <TabsContent value="meetings">
          <FamilyMeetingTab meetings={myMeetings} />
        </TabsContent>

        <TabsContent value="education">
          <EducationTab materials={myEduMaterials} />
        </TabsContent>

        <TabsContent value="care">
          <CareCoordinationTab patientId={patientId} updates={myCareUpdates} onSubmit={addPatientCareUpdate} />
        </TabsContent>

        <TabsContent value="emergency">
          <EmergencyContactTab contacts={myEmergencyContacts} />
        </TabsContent>

        <TabsContent value="transport">
          <TransportTab patientId={patientId} requests={myTransportRequests} onSubmit={addPatientTransportRequest} />
        </TabsContent>

        <TabsContent value="chat">
          <ChatTab patient={palliativePatient} patientId={patientId} messages={myMessages} onSend={addPalliativeChatMessage} currentUser={currentUser} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────

function DashboardTab({
  palliativePatient,
  myTransportRequests,
  myCareUpdates,
  myMessages,
  myMeetings,
  myEduMaterials,
  myEmergencyContacts,
  onNavigate,
}: {
  palliativePatient: typeof useStore extends { getState: () => { palliativePatients: (infer T)[] } } ? T | undefined : never;
  myTransportRequests: PatientTransportRequest[];
  myCareUpdates: PatientCareUpdate[];
  myMessages: PalliativeChatMessage[];
  myMeetings: { id: string; title: string; scheduledAt: string; status: string }[];
  myEduMaterials: { id: string }[];
  myEmergencyContacts: { id: string }[];
  onNavigate: (tab: string) => void;
}) {
  const pendingTransport = myTransportRequests.filter(r => r.status === 'menunggu_konfirmasi').length;
  const unreadMessages = myMessages.filter(m => m.senderRole !== 'patient' && m.status !== 'read').length;
  const upcomingMeetings = myMeetings.filter(m => m.status === 'dijadwalkan');
  const nextMeeting = upcomingMeetings.length > 0 ? upcomingMeetings[0] : null;
  const unviewedUpdates = myCareUpdates.filter(u => !u.viewedByDoctor).length;

  return (
    <div className="space-y-4">
      {/* Patient Info Card */}
      <Card className="border-l-4 border-l-teal-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-teal-600" />
            Informasi Program Paliatif
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Stethoscope className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Dokter Penanggung Jawab</p>
                  <p className="text-sm font-medium">{palliativePatient?.attendingDoctorName || 'Belum ditentukan'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Activity className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Status Program Paliatif</p>
                  <Badge className={palliativePatient?.patientStatus === 'aktif' ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>
                    {palliativePatient?.patientStatus === 'aktif' ? 'Aktif' : palliativePatient?.patientStatus || 'Tidak Diketahui'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Home className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Status Perawatan</p>
                  <p className="text-sm font-medium capitalize">{(palliativePatient?.careStatus || '').replace(/_/g, ' ')}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Tingkat Risiko</p>
                  <Badge className={
                    palliativePatient?.riskLevel === 'merah' ? 'bg-red-100 text-red-800 border-red-200' :
                    palliativePatient?.riskLevel === 'kuning' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    'bg-green-100 text-green-800 border-green-200'
                  }>
                    {palliativePatient?.riskLevel === 'merah' ? 'Risiko Tinggi' :
                     palliativePatient?.riskLevel === 'kuning' ? 'Risiko Sedang' : 'Risiko Rendah'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Diagnosis Utama</p>
                  <p className="text-sm font-medium">{palliativePatient?.primaryDiagnosis || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Calendar className="w-5 h-5" />}
          label="Jadwal Kontrol Berikutnya"
          value={myTransportRequests.find(r => r.status === 'disetujui' || r.status === 'dijadwalkan')
            ? formatDate(myTransportRequests.find(r => r.status === 'disetujui' || r.status === 'dijadwalkan')!.requestDate)
            : 'Belum ada'}
          onClick={() => onNavigate('transport')}
          color="teal"
        />
        <SummaryCard
          icon={<Users className="w-5 h-5" />}
          label="Family Meeting Terdekat"
          value={nextMeeting ? formatDate(nextMeeting.scheduledAt) : 'Belum ada'}
          onClick={() => onNavigate('meetings')}
          color="sky"
        />
        <SummaryCard
          icon={<BookOpen className="w-5 h-5" />}
          label="Materi Edukasi Baru"
          value={`${myEduMaterials.length} materi`}
          onClick={() => onNavigate('education')}
          color="amber"
        />
        <SummaryCard
          icon={<Ambulance className="w-5 h-5" />}
          label="Permintaan Transportasi"
          value={pendingTransport > 0 ? `${pendingTransport} menunggu` : 'Tidak ada'}
          onClick={() => onNavigate('transport')}
          color="red"
        />
      </div>

      {/* Quick Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" /> Notifikasi Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {unreadMessages > 0 && (
              <button
                onClick={() => onNavigate('chat')}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-teal-50 border border-teal-100 hover:bg-teal-100 transition-colors text-left"
              >
                <MessageCircle className="w-5 h-5 text-teal-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-teal-800">{unreadMessages} pesan baru dari dokter</p>
                  <p className="text-xs text-teal-600">Klik untuk membuka chat</p>
                </div>
                <ChevronRight className="w-4 h-4 text-teal-400 shrink-0" />
              </button>
            )}
            {pendingTransport > 0 && (
              <button
                onClick={() => onNavigate('transport')}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors text-left"
              >
                <Car className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800">{pendingTransport} permintaan transportasi menunggu konfirmasi</p>
                  <p className="text-xs text-amber-600">Klik untuk melihat detail</p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
              </button>
            )}
            {unviewedUpdates > 0 && (
              <button
                onClick={() => onNavigate('care')}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-sky-50 border border-sky-100 hover:bg-sky-100 transition-colors text-left"
              >
                <ClipboardList className="w-5 h-5 text-sky-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sky-800">{unviewedUpdates} laporan kondisi belum dilihat dokter</p>
                  <p className="text-xs text-sky-600">Klik untuk melihat riwayat</p>
                </div>
                <ChevronRight className="w-4 h-4 text-sky-400 shrink-0" />
              </button>
            )}
            {unreadMessages === 0 && pendingTransport === 0 && unviewedUpdates === 0 && (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Tidak ada notifikasi baru</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('care')}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-teal-50 border border-teal-100 hover:bg-teal-100 transition-colors"
        >
          <ClipboardList className="w-6 h-6 text-teal-600" />
          <span className="text-xs font-medium text-teal-800">Laporkan Kondisi</span>
        </button>
        <button
          onClick={() => onNavigate('transport')}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors"
        >
          <Car className="w-6 h-6 text-amber-600" />
          <span className="text-xs font-medium text-amber-800">Ajukan Transportasi</span>
        </button>
        <button
          onClick={() => onNavigate('chat')}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-sky-50 border border-sky-100 hover:bg-sky-100 transition-colors"
        >
          <MessageCircle className="w-6 h-6 text-sky-600" />
          <span className="text-xs font-medium text-sky-800">Chat Paliatif</span>
        </button>
        <button
          onClick={() => onNavigate('emergency')}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
        >
          <Phone className="w-6 h-6 text-red-600" />
          <span className="text-xs font-medium text-red-800">Kontak Darurat</span>
        </button>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick: () => void;
  color: 'teal' | 'sky' | 'amber' | 'red';
}) {
  const colorMap = {
    teal: 'border-l-teal-500 hover:bg-teal-50/50',
    sky: 'border-l-sky-500 hover:bg-sky-50/50',
    amber: 'border-l-amber-500 hover:bg-amber-50/50',
    red: 'border-l-red-500 hover:bg-red-50/50',
  };
  const iconColorMap = {
    teal: 'text-teal-600',
    sky: 'text-sky-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  };

  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-lg border border-l-4 bg-card ${colorMap[color]} transition-colors`}
    >
      <div className={`${iconColorMap[color]} mb-2`}>{icon}</div>
      <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{label}</p>
      <p className="text-xs sm:text-sm font-semibold mt-1 truncate">{value}</p>
    </button>
  );
}

// ── Family Meeting Tab (Read-Only) ────────────────────────────────────────

function FamilyMeetingTab({ meetings }: { meetings: { id: string; title: string; scheduledAt: string; status: string; duration?: number; participants?: { name: string; role: string; attended: boolean }[]; agenda?: string; discussionNotes?: string; resume?: string; followUpActions?: string[]; meetingUrl?: string }[] }) {
  if (meetings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada jadwal Family Meeting</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">Hanya Lihat</Badge>
        <p className="text-xs text-muted-foreground">Anda tidak dapat membuat atau mengubah jadwal Family Meeting</p>
      </div>
      {meetings.map((meeting) => {
        const statusBadge = MEETING_STATUS_BADGE[meeting.status] || { label: meeting.status, className: 'bg-gray-100 text-gray-800 border-gray-200' };
        return (
          <Card key={meeting.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{meeting.title}</CardTitle>
                <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(meeting.scheduledAt)}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatTime(meeting.scheduledAt)}
                  {meeting.duration && ` (${meeting.duration} menit)`}
                </div>
              </div>
              {meeting.agenda && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Agenda</p>
                  <p className="text-sm">{meeting.agenda}</p>
                </div>
              )}
              {meeting.participants && meeting.participants.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Peserta</p>
                  <div className="flex flex-wrap gap-2">
                    {meeting.participants.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs bg-muted/50 px-2 py-1 rounded-md">
                        {p.attended ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-muted-foreground" />}
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground">({p.role})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {meeting.meetingUrl && (meeting.status === 'dijadwalkan' || meeting.status === 'berlangsung') && (
                <a href={meeting.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800">
                  <Video className="w-4 h-4" /> Gabung Meeting
                </a>
              )}
              {meeting.resume && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Resume Diskusi</p>
                  <p className="text-sm bg-muted/30 p-3 rounded-md">{meeting.resume}</p>
                </div>
              )}
              {meeting.followUpActions && meeting.followUpActions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tindak Lanjut</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {meeting.followUpActions.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Education Tab (Read-Only) ─────────────────────────────────────────────

function EducationTab({ materials }: { materials: { id: string; title: string; category?: string; type?: string; description?: string; fileUrl?: string }[] }) {
  if (materials.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada materi edukasi tersedia</p>
        </CardContent>
      </Card>
    );
  }

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4 text-red-500" />;
      case 'pdf': case 'document': return <FileText className="w-4 h-4 text-blue-500" />;
      default: return <BookOpen className="w-4 h-4 text-teal-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Hanya Lihat</Badge>
        <p className="text-xs text-muted-foreground">Materi edukasi disediakan oleh tim paliatif</p>
      </div>
      <div className="grid gap-3">
        {materials.map((mat) => (
          <Card key={mat.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                  {getTypeIcon(mat.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{mat.title}</p>
                      {mat.category && (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {EDU_CATEGORY_LABELS[mat.category] || mat.category}
                        </Badge>
                      )}
                    </div>
                    {mat.fileUrl && (
                      <Button variant="outline" size="sm" className="shrink-0 text-xs" asChild>
                        <a href={mat.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="w-3 h-3 mr-1" /> Unduh
                        </a>
                      </Button>
                    )}
                  </div>
                  {mat.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{mat.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Care Coordination Tab ─────────────────────────────────────────────────

function CareCoordinationTab({
  patientId,
  updates,
  onSubmit,
}: {
  patientId: string;
  updates: PatientCareUpdate[];
  onSubmit: (update: PatientCareUpdate) => void;
}) {
  const [conditionStatus, setConditionStatus] = useState<PatientConditionStatus>('stabil');
  const [newComplaints, setNewComplaints] = useState(false);
  const [activityChange, setActivityChange] = useState(false);
  const [appetiteChange, setAppetiteChange] = useState(false);
  const [sleepQualityChange, setSleepQualityChange] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const update: PatientCareUpdate = {
      id: genId('pcu'),
      palliativePatientId: patientId,
      conditionStatus,
      newComplaints,
      activityChange,
      appetiteChange,
      sleepQualityChange,
      additionalNotes: additionalNotes.trim() || undefined,
      submittedBy: 'Siti Rahayu',
      viewedByDoctor: false,
      createdAt: new Date().toISOString(),
    };
    onSubmit(update);
    setConditionStatus('stabil');
    setNewComplaints(false);
    setActivityChange(false);
    setAppetiteChange(false);
    setSleepQualityChange(false);
    setAdditionalNotes('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Submit Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-teal-600" />
            Laporkan Kondisi Anda Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Condition Status */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Status Kondisi</Label>
            <RadioGroup value={conditionStatus} onValueChange={(v) => setConditionStatus(v as PatientConditionStatus)} className="grid grid-cols-2 gap-2">
              {(['membaik', 'stabil', 'menurun', 'keluhan_baru'] as PatientConditionStatus[]).map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <RadioGroupItem value={status} id={`cond-${status}`} />
                  <Label htmlFor={`cond-${status}`} className="text-sm cursor-pointer flex items-center gap-1.5">
                    <Badge className={CONDITION_STATUS_LABELS[status].className}>
                      {CONDITION_STATUS_LABELS[status].label}
                    </Badge>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* Checklist */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Perubahan yang Dirasakan</Label>
            <div className="flex items-center space-x-2">
              <Checkbox id="new-complaints" checked={newComplaints} onCheckedChange={(v) => setNewComplaints(!!v)} />
              <Label htmlFor="new-complaints" className="text-sm cursor-pointer">Ada keluhan baru</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="activity-change" checked={activityChange} onCheckedChange={(v) => setActivityChange(!!v)} />
              <Label htmlFor="activity-change" className="text-sm cursor-pointer">Perubahan aktivitas</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="appetite-change" checked={appetiteChange} onCheckedChange={(v) => setAppetiteChange(!!v)} />
              <Label htmlFor="appetite-change" className="text-sm cursor-pointer">Perubahan nafsu makan</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="sleep-change" checked={sleepQualityChange} onCheckedChange={(v) => setSleepQualityChange(!!v)} />
              <Label htmlFor="sleep-change" className="text-sm cursor-pointer">Perubahan kualitas tidur</Label>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div>
            <Label htmlFor="additional-notes" className="text-sm font-medium">Catatan Tambahan</Label>
            <Textarea
              id="additional-notes"
              placeholder="Tuliskan catatan atau keluhan tambahan..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="mt-1.5"
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
            {submitted ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Laporan Terkirim
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" /> Kirim Laporan Kondisi
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Update History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Riwayat Laporan Kondisi</CardTitle>
        </CardHeader>
        <CardContent>
          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada laporan kondisi</p>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {[...updates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((update) => (
                  <div key={update.id} className="p-3 rounded-lg border bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <Badge className={CONDITION_STATUS_LABELS[update.conditionStatus].className}>
                        {CONDITION_STATUS_LABELS[update.conditionStatus].label}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {update.viewedByDoctor ? (
                          <><Eye className="w-3 h-3 text-green-500" /> Dilihat dokter</>
                        ) : (
                          <><Clock className="w-3 h-3 text-amber-500" /> Belum dilihat</>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {update.newComplaints && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700">Keluhan Baru</Badge>}
                      {update.activityChange && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700">Perubahan Aktivitas</Badge>}
                      {update.appetiteChange && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700">Perubahan Nafsu Makan</Badge>}
                      {update.sleepQualityChange && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700">Perubahan Tidur</Badge>}
                    </div>
                    {update.additionalNotes && (
                      <p className="text-xs text-muted-foreground mt-2">{update.additionalNotes}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2">{formatDateTime(update.createdAt)}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Emergency Contact Tab ─────────────────────────────────────────────────

function EmergencyContactTab({ contacts }: { contacts: { id: string; name: string; role: string; phone: string; alternatePhone?: string; isAvailable?: boolean }[] }) {
  if (contacts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Phone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada kontak darurat terdaftar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Hanya Lihat</Badge>
        <p className="text-xs text-muted-foreground">Kontak darurat dikelola oleh tim paliatif</p>
      </div>
      {contacts.map((contact) => (
        <Card key={contact.id} className="border-l-4 border-l-red-400">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium">{contact.name}</p>
                  <Badge variant="outline" className="text-[10px]">{contact.role}</Badge>
                  {contact.isAvailable !== undefined && (
                    <Badge className={contact.isAvailable ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}>
                      {contact.isAvailable ? 'Tersedia' : 'Tidak Tersedia'}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" /> {contact.phone}
                </div>
                {contact.alternatePhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                    <Phone className="w-3.5 h-3.5" /> {contact.alternatePhone} (alternatif)
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" className="text-xs" asChild>
                  <a href={`tel:${contact.phone}`}>
                    <PhoneCall className="w-3 h-3 mr-1" /> Hubungi
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="text-xs" asChild>
                  <a href={`sms:${contact.phone}`}>
                    <MessageSquare className="w-3 h-3 mr-1" /> Pesan
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Transport Tab ─────────────────────────────────────────────────────────

function TransportTab({
  patientId,
  requests,
  onSubmit,
}: {
  patientId: string;
  requests: PatientTransportRequest[];
  onSubmit: (request: PatientTransportRequest) => void;
}) {
  const [requestType, setRequestType] = useState<PatientTransportRequestType>('kontrol_faskes');
  const [requestDate, setRequestDate] = useState('');
  const [requestTime, setRequestTime] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!requestDate || !requestTime || !pickupLocation || !destination) return;
    const request: PatientTransportRequest = {
      id: genId('ptr'),
      palliativePatientId: patientId,
      requestType,
      requestDate,
      requestTime,
      pickupLocation,
      destination,
      notes: notes.trim() || undefined,
      status: 'menunggu_konfirmasi',
      requestedBy: 'Siti Rahayu',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSubmit(request);
    setRequestType('kontrol_faskes');
    setRequestDate('');
    setRequestTime('');
    setPickupLocation('');
    setDestination('');
    setNotes('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const isValid = requestDate && requestTime && pickupLocation && destination;

  return (
    <div className="space-y-4">
      {/* Request Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="w-5 h-5 text-amber-600" />
            Ajukan Permintaan Transportasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Jenis Permintaan</Label>
            <Select value={requestType} onValueChange={(v) => setRequestType(v as PatientTransportRequestType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="kontrol_faskes">Kontrol Faskes</SelectItem>
                <SelectItem value="kunjungan_rumah">Kunjungan Rumah</SelectItem>
                <SelectItem value="transportasi_darurat">Transportasi Darurat</SelectItem>
                <SelectItem value="pengambilan_obat">Pengambilan Obat</SelectItem>
                <SelectItem value="lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tr-date" className="text-sm font-medium mb-1.5 block">Tanggal</Label>
              <Input id="tr-date" type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tr-time" className="text-sm font-medium mb-1.5 block">Waktu</Label>
              <Input id="tr-time" type="time" value={requestTime} onChange={(e) => setRequestTime(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="tr-pickup" className="text-sm font-medium mb-1.5 block">Lokasi Jemput</Label>
            <Input id="tr-pickup" placeholder="Alamat lokasi jemput" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="tr-dest" className="text-sm font-medium mb-1.5 block">Tujuan</Label>
            <Input id="tr-dest" placeholder="Alamat tujuan" value={destination} onChange={(e) => setDestination(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="tr-notes" className="text-sm font-medium mb-1.5 block">Catatan Tambahan</Label>
            <Textarea id="tr-notes" placeholder="Catatan tambahan (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <Button onClick={handleSubmit} disabled={!isValid} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
            {submitted ? (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Permintaan Terkirim</>
            ) : (
              <><Send className="w-4 h-4 mr-2" /> Kirim Permintaan Transportasi</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Request History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Riwayat Permintaan Transportasi</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada permintaan transportasi</p>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {[...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((req) => {
                  const statusInfo = STATUS_BADGE_MAP[req.status] || { label: req.status, className: 'bg-gray-100 text-gray-800 border-gray-200' };
                  return (
                    <div key={req.id} className="p-3 rounded-lg border">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{REQUEST_TYPE_LABELS[req.requestType]}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(req.requestDate)} | {req.requestTime}</p>
                        </div>
                        <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                      </div>
                      <div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{req.pickupLocation}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ChevronRight className="w-3 h-3 shrink-0" />
                          <span>{req.destination}</span>
                        </div>
                      </div>
                      {req.notes && <p className="text-xs text-muted-foreground mt-1 italic">{req.notes}</p>}
                      {req.confirmedBy && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Dikonfirmasi oleh {req.confirmedBy} - {req.confirmedAt ? formatDateTime(req.confirmedAt) : ''}
                        </p>
                      )}
                      {req.rejectionReason && (
                        <p className="text-xs text-red-600 mt-1">Alasan penolakan: {req.rejectionReason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Chat Paliatif Tab ─────────────────────────────────────────────────────

function ChatTab({
  patient,
  patientId,
  messages,
  onSend,
  currentUser,
}: {
  patient: PalliativePatientInfo | undefined;
  patientId: string;
  messages: PalliativeChatMessage[];
  onSend: (message: PalliativeChatMessage) => void;
  currentUser: { id: string; name: string } | null;
}) {
  const [inputMessage, setInputMessage] = useState('');
  // The form message currently open in the fill-in dialog (TTV / Keluhan
  // Harian). Clicking a "Form TTV"/"Form Keluhan" bubble sets this; the
  // dialog closes it again once the patient submits.
  const [activeFormMsg, setActiveFormMsg] = useState<PalliativeChatMessage | null>(null);
  const {
    addVitalSignRecord,
    addPalliativeClinicalAlert,
    addPalliativeAuditEntry,
    updatePalliativeChatMessage,
    addPalliativeScreeningRecord,
    addMedicationMonitoringAlert,
    addMedicationMonitoringAuditEntry,
    palliativeMedications,
  } = useStore();

  const genFormId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const handleOpenForm = (msg: PalliativeChatMessage) => {
    const status = msg.formData?.status;
    if (status === 'sent' || status === 'opened' || status === 'in_progress' || status === undefined) {
      setActiveFormMsg(msg);
    }
  };

  const markFormSubmitted = (msg: PalliativeChatMessage) => {
    if (!msg.formData) return;
    updatePalliativeChatMessage(msg.id, {
      formData: { ...msg.formData, status: 'submitted' },
    });
  };

  const handleTTVSubmit = (answers: TTVFormAnswers) => {
    if (!patient || !activeFormMsg) return;
    const roomId = activeFormMsg.roomId || `room-${patientId}`;

    const responseMsg: PalliativeChatMessage = {
      id: genFormId('ppm'),
      roomId,
      palliativePatientId: patient.id,
      senderId: currentUser?.id || patient.patientId || patient.id,
      senderName: currentUser?.name || patient.patientName || 'Pasien',
      senderRole: 'patient',
      type: 'form_response',
      content: 'Form TTV telah diisi.',
      formType: 'ttv',
      formResponse: {
        formId: activeFormMsg.formData?.id || genFormId('form'),
        formType: 'ttv',
        ttvAnswers: answers,
        submittedAt: new Date().toISOString(),
      },
      status: 'delivered',
      createdAt: new Date().toISOString(),
    };
    onSend(responseMsg);
    markFormSubmitted(activeFormMsg);

    const vitalRecord: VitalSignRecordInfo = {
      id: genFormId('vs'),
      palliativePatientId: patient.id,
      recordedBy: 'patient',
      systolicBP: answers.systolicBP,
      diastolicBP: answers.diastolicBP,
      heartRate: answers.heartRate,
      respiratoryRate: answers.respiratoryRate,
      temperature: answers.temperature,
      oxygenSat: answers.oxygenSat,
      weight: answers.weight,
      notes: answers.notes,
      recordedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    addVitalSignRecord(vitalRecord);

    const alertCheck = checkTTVAlerts(answers);
    if (alertCheck.alert) {
      const alert: PalliativeClinicalAlert = {
        id: genFormId('alert'),
        patientId: patient.id,
        alertType: 'ttv_abnormal',
        severity: alertCheck.severity,
        title: alertCheck.severity === 'merah' ? 'TTV Kritis' : 'TTV Abnormal',
        description: alertCheck.messages.join('. '),
        values: { systolicBP: answers.systolicBP, diastolicBP: answers.diastolicBP, heartRate: answers.heartRate, respiratoryRate: answers.respiratoryRate, temperature: answers.temperature, oxygenSat: answers.oxygenSat },
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      addPalliativeClinicalAlert(alert);

      onSend({
        id: genFormId('ppm'),
        roomId,
        palliativePatientId: patient.id,
        senderId: 'system',
        senderName: 'Sistem',
        senderRole: 'system',
        type: 'clinical_alert',
        content: `Peringatan: ${alertCheck.messages.join('. ')}`,
        clinicalAlert: alert,
        status: 'delivered',
        createdAt: new Date().toISOString(),
      });
      addPalliativeAuditEntry({
        id: genFormId('audit'),
        patientId: patient.id,
        action: 'alert_triggered',
        performedBy: 'system',
        performedByRole: 'system',
        details: `Alert: ${alertCheck.messages.join(', ')}`,
        createdAt: new Date().toISOString(),
      });
    }

    addPalliativeAuditEntry({
      id: genFormId('audit'),
      patientId: patient.id,
      action: 'form_submitted',
      performedBy: currentUser?.id || patient.patientId || patient.id,
      performedByRole: 'patient',
      details: 'Pasien mengirimkan hasil Form TTV',
      createdAt: new Date().toISOString(),
    });

    setActiveFormMsg(null);
  };

  const handleKeluhanSubmit = (complaint: DailyComplaintRecord) => {
    if (!patient || !activeFormMsg) return;
    const roomId = activeFormMsg.roomId || `room-${patientId}`;

    onSend({
      id: genFormId('ppm'),
      roomId,
      palliativePatientId: patient.id,
      senderId: currentUser?.id || patient.patientId || patient.id,
      senderName: currentUser?.name || patient.patientName || 'Pasien',
      senderRole: 'patient',
      type: 'form_response',
      content: 'Form Keluhan Harian telah diisi.',
      formType: 'keluhan',
      formResponse: {
        formId: activeFormMsg.formData?.id || genFormId('form'),
        formType: 'keluhan',
        submittedAt: new Date().toISOString(),
        dailyComplaint: complaint,
      },
      status: 'delivered',
      createdAt: new Date().toISOString(),
    });
    markFormSubmitted(activeFormMsg);

    addPalliativeAuditEntry({
      id: genFormId('audit'),
      patientId: patient.id,
      action: 'form_submitted',
      performedBy: currentUser?.id || patient.patientId || patient.id,
      performedByRole: 'patient',
      details: `Pasien mengirimkan hasil Form Keluhan Harian (via Chat) - Status: ${complaint.severityLevel}`,
      createdAt: new Date().toISOString(),
    });

    setActiveFormMsg(null);
  };

  const handleScreeningSubmit = (result: ScreeningScoreResult, answers: Record<string, number | string | string[]>) => {
    if (!patient || !activeFormMsg || !activeFormMsg.screeningType) return;
    const roomId = activeFormMsg.roomId || `room-${patientId}`;
    const screeningType = activeFormMsg.screeningType;

    onSend({
      id: genFormId('ppm'),
      roomId,
      palliativePatientId: patient.id,
      senderId: currentUser?.id || patient.patientId || patient.id,
      senderName: currentUser?.name || patient.patientName || 'Pasien',
      senderRole: 'patient',
      type: 'form_response',
      content: `Skrining ${getToolLabel(screeningType)} telah diisi.`,
      formType: 'screening',
      formResponse: {
        formId: activeFormMsg.formData?.id || genFormId('form'),
        formType: 'screening',
        screeningType,
        screeningAnswers: answers,
        screeningResult: {
          score: result.score,
          scoreLabel: result.scoreLabel,
          interpretation: result.interpretation,
          ewsLevel: result.ewsLevel,
        },
        submittedAt: new Date().toISOString(),
      },
      status: 'delivered',
      createdAt: new Date().toISOString(),
    });
    markFormSubmitted(activeFormMsg);

    const screeningRecord: PalliativeScreeningRecordInfo = {
      id: genFormId('sr'),
      palliativePatientId: patient.id,
      screeningType,
      score: result.score,
      scoreLabel: result.scoreLabel,
      interpretation: result.interpretation,
      ewsLevel: result.ewsLevel,
      details: JSON.stringify(result.details),
      performedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    addPalliativeScreeningRecord(screeningRecord);

    if (result.ewsLevel === 'merah') {
      const alert: PalliativeClinicalAlert = {
        id: genFormId('alert'),
        patientId: patient.id,
        alertType: 'perburukan',
        severity: 'merah',
        title: `Skrining ${getToolLabel(screeningType)} Kritis`,
        description: `Hasil skrining ${getToolLabel(screeningType)} menunjukkan kondisi kritis: ${result.scoreLabel}. ${result.interpretation}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      addPalliativeClinicalAlert(alert);

      onSend({
        id: genFormId('ppm'),
        roomId,
        palliativePatientId: patient.id,
        senderId: 'system',
        senderName: 'Sistem',
        senderRole: 'system',
        type: 'clinical_alert',
        content: `Peringatan: Skrining ${getToolLabel(screeningType)} menunjukkan kondisi kritis (${result.scoreLabel})`,
        clinicalAlert: alert,
        status: 'delivered',
        createdAt: new Date().toISOString(),
      });
    }

    addPalliativeAuditEntry({
      id: genFormId('audit'),
      patientId: patient.id,
      action: 'form_submitted',
      performedBy: currentUser?.id || patient.patientId || patient.id,
      performedByRole: 'patient',
      details: `Pasien mengirimkan hasil Skrining ${getToolLabel(screeningType)}: ${result.scoreLabel}`,
      createdAt: new Date().toISOString(),
    });

    setActiveFormMsg(null);
  };

  const handleMedMonitoringSubmit = (answers: MedicationMonitoringFormAnswers) => {
    if (!patient || !activeFormMsg) return;
    const roomId = activeFormMsg.roomId || `room-${patientId}`;

    onSend({
      id: genFormId('ppm'),
      roomId,
      palliativePatientId: patient.id,
      senderId: currentUser?.id || patient.patientId || patient.id,
      senderName: currentUser?.name || patient.patientName || 'Pasien',
      senderRole: 'patient',
      type: 'form_response',
      content: 'Form Monitoring Obat Paliatif telah diisi.',
      formType: 'monitoring_obat',
      formResponse: {
        formId: activeFormMsg.formData?.id || genFormId('form'),
        formType: 'monitoring_obat',
        medicationMonitoringAnswers: answers,
        submittedAt: new Date().toISOString(),
      },
      status: 'delivered',
      createdAt: new Date().toISOString(),
    });
    markFormSubmitted(activeFormMsg);

    // The Medication Monitoring Dashboard reads adherence stats straight out
    // of `form_response` chat messages (see medication-monitoring-dashboard.tsx),
    // so sending that message above is what actually makes this show up there
    // — there's no separate table to write to. We still raise local alerts
    // here, matching the doctor-side behavior.
    const notConsumedMeds = answers.medications.filter(m => m.consumptionStatus === 'tidak_diminum');
    const severeSideEffects = answers.medications.filter(m =>
      m.hasComplaints && ((m.complaintSeverity !== undefined && m.complaintSeverity >= 7) ||
        m.sideEffects?.includes('reaksi_alergi') ||
        m.sideEffects?.includes('sesak_napas'))
    );

    for (const med of notConsumedMeds) {
      addMedicationMonitoringAlert({
        id: genFormId('mmalert'),
        patientId: patient.id,
        alertType: 'obat_tidak_diminum',
        severity: 'warning',
        title: `Obat Tidak Diminum: ${med.medicineName}`,
        description: `Pasien tidak meminum ${med.medicineName}. Alasan: ${med.notConsumedReason || 'tidak disebutkan'}. ${med.notConsumedExplanation || ''}`,
        medicationName: med.medicineName,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    for (const med of severeSideEffects) {
      addMedicationMonitoringAlert({
        id: genFormId('mmalert'),
        patientId: patient.id,
        alertType: 'efek_samping_berat',
        severity: 'critical',
        title: `Efek Samping Berat: ${med.medicineName}`,
        description: `Pasien melaporkan efek samping berat setelah minum ${med.medicineName}. Keparahan: ${med.complaintSeverity}/10. Efek samping: ${(med.sideEffects || []).join(', ')}`,
        medicationName: med.medicineName,
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      const alert: PalliativeClinicalAlert = {
        id: genFormId('alert'),
        patientId: patient.id,
        alertType: 'obat_tidak_diminum',
        severity: 'merah',
        title: `Efek Samping Obat Berat: ${med.medicineName}`,
        description: `Keparahan ${med.complaintSeverity}/10. Efek: ${(med.sideEffects || []).join(', ')}. ${med.complaintNotes || ''}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      addPalliativeClinicalAlert(alert);

      onSend({
        id: genFormId('ppm'),
        roomId,
        palliativePatientId: patient.id,
        senderId: 'system',
        senderName: 'Sistem',
        senderRole: 'system',
        type: 'clinical_alert',
        content: `Peringatan: Efek samping berat dilaporkan untuk ${med.medicineName} (keparahan ${med.complaintSeverity}/10)`,
        clinicalAlert: alert,
        status: 'delivered',
        createdAt: new Date().toISOString(),
      });
    }

    const takenCount = answers.medications.filter(m => m.consumptionStatus === 'sudah_diminum').length;
    const missedCount = answers.medications.filter(m => m.consumptionStatus === 'belum_diminum').length;
    const notConsumedCount = notConsumedMeds.length;

    addMedicationMonitoringAuditEntry({
      id: genFormId('mmaudit'),
      patientId: patient.id,
      action: 'form_submitted',
      performedBy: currentUser?.id || patient.patientId || patient.id,
      performedByRole: 'patient',
      details: `Form Monitoring Obat disubmit: ${takenCount} diminum, ${missedCount} belum, ${notConsumedCount} tidak`,
      createdAt: new Date().toISOString(),
    });

    addPalliativeAuditEntry({
      id: genFormId('audit'),
      patientId: patient.id,
      action: 'form_submitted',
      performedBy: currentUser?.id || patient.patientId || patient.id,
      performedByRole: 'patient',
      details: 'Pasien mengirimkan hasil Form Monitoring Obat Paliatif',
      createdAt: new Date().toISOString(),
    });

    setActiveFormMsg(null);
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load real message history from Supabase on mount / when patientId changes —
  // same pattern used by the doctor's Monitoring Paliatif chat (palliative-chat-panel.tsx).
  // Without this, only messages sent *after* this component mounted (via realtime)
  // would show up; history from a prior session would be missing.
  useEffect(() => {
    let cancelled = false;
    async function loadMessages() {
      if (!patientId || !isValidUuid(patientId)) return;
      try {
        const { chatService } = await import('@/services/supabase');
        const roomUuid = await chatService.getOrCreateRoom(patientId, '');
        if (!roomUuid || cancelled) return;
        const msgs = await chatService.getMessages(roomUuid);
        if (cancelled) return;
        useStore.setState((s) => ({
          palliativeChatMessages: [
            ...s.palliativeChatMessages.filter((m) => m.palliativePatientId !== patientId),
            ...msgs,
          ],
        }));
      } catch (e) {
        console.error('[patient-paliatif ChatTab] loadMessages failed:', e);
      }
    }
    loadMessages();
    return () => { cancelled = true; };
  }, [patientId]);

  const handleSend = () => {
    if (!inputMessage.trim() || !patientId) return;
    const message: PalliativeChatMessage = {
      id: genId('ppm'),
      roomId: `room-${patientId}`,
      palliativePatientId: patientId,
      senderId: currentUser?.id || 'patient',
      senderName: currentUser?.name || 'Pasien',
      senderRole: 'patient',
      content: inputMessage.trim(),
      type: 'text',
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    onSend(message);
    setInputMessage('');
  };

  const { onlineDoctors } = useStore();

  // This is a shared "Tim Paliatif" room, not a 1:1 chat with a single fixed
  // doctor — so derive the displayed name/status from whoever actually sent
  // the most recent non-patient message, instead of hardcoding a person.
  const lastStaffMessage = [...messages].reverse().find((m) => m.senderRole !== 'patient');
  const staffDisplayName = lastStaffMessage?.senderName || 'Tim Paliatif';
  const staffOnline = lastStaffMessage ? onlineDoctors.includes(lastStaffMessage.senderId) : false;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle2 className="w-3 h-3 text-muted-foreground" />;
      case 'delivered': return <CheckCircle2 className="w-3 h-3 text-sky-500" />;
      case 'read': return <CheckCircle2 className="w-3 h-3 text-teal-500" />;
      default: return null;
    }
  };

  return (
    <Card className="flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
      {/* Chat Header */}
      <div className="p-3 border-b flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
          <Stethoscope className="w-5 h-5 text-teal-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{staffDisplayName}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {staffOnline ? (
              <>
                <Wifi className="w-3 h-3 text-green-500" />
                <span className="text-green-600">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200">Tim Paliatif</Badge>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Mulai percakapan dengan tim paliatif</p>
          </div>
        )}
        {messages.map((msg) => {
          const isPatient = msg.senderRole === 'patient';
          const isForm = msg.type !== 'text';
          // Fillable form types the patient can tap to open.
          const isFillableForm = msg.type === 'form_ttv' || msg.type === 'form_keluhan' || msg.type === 'form_screening' || msg.type === 'form_monitoring_obat';
          const formStatus = msg.formData?.status;
          const isOpenable = isFillableForm && formStatus !== 'submitted';
          const isSubmitted = isFillableForm && formStatus === 'submitted';

          return (
            <div key={msg.id} className={`flex ${isPatient ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${isPatient ? 'order-2' : 'order-1'}`}>
                {!isPatient && (
                  <p className="text-[10px] font-medium text-muted-foreground mb-1 ml-1">{msg.senderName}</p>
                )}
                <div
                  className={`rounded-xl px-3 py-2 ${
                    isPatient
                      ? 'bg-teal-600 text-white rounded-br-sm'
                      : isForm
                      ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-bl-sm'
                      : 'bg-muted rounded-bl-sm'
                  } ${isOpenable ? 'cursor-pointer hover:opacity-90' : ''}`}
                  onClick={() => { if (isOpenable) handleOpenForm(msg); }}
                >
                  {isForm ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <p className="text-xs font-medium">{FORM_TYPE_LABELS[msg.type] || msg.type}</p>
                          <p className="text-[10px] mt-0.5 opacity-80">{msg.content}</p>
                        </div>
                      </div>
                      {isOpenable && isFillableForm && (
                        <Button variant="outline" size="sm" className="text-xs h-7 w-full mt-1 bg-white">
                          <FileText className="w-3 h-3 mr-1" /> Klik untuk mengisi form
                        </Button>
                      )}
                      {isSubmitted && (
                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Sudah diisi
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
                <div className={`flex items-center gap-1 mt-1 ${isPatient ? 'justify-end' : 'justify-start'} px-1`}>
                  <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                  {isPatient && getStatusIcon(msg.status)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Ketik pesan..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!inputMessage.trim()} size="icon" className="bg-teal-600 hover:bg-teal-700 text-white shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Fill-in dialog — opened by tapping a Form TTV / Form Keluhan bubble */}
      {activeFormMsg && (
        <Dialog open={!!activeFormMsg} onOpenChange={(open) => { if (!open) setActiveFormMsg(null); }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Isi Formulir</DialogTitle>
              <DialogDescription>Silakan isi formulir yang dikirim oleh dokter</DialogDescription>
            </DialogHeader>
            {activeFormMsg.type === 'form_ttv' && (
              <TTVForm onSubmit={handleTTVSubmit} onSaveDraft={() => {}} />
            )}
            {activeFormMsg.type === 'form_keluhan' && patient && (
              <DailyComplaintForm
                palliativePatientId={patient.id}
                source="chat"
                compact
                onSubmitSuccess={handleKeluhanSubmit}
              />
            )}
            {activeFormMsg.type === 'form_screening' && activeFormMsg.screeningType && (
              <InlineScreeningForm
                screeningType={activeFormMsg.screeningType}
                onSubmit={handleScreeningSubmit}
                onSaveDraft={() => {}}
              />
            )}
            {activeFormMsg.type === 'form_monitoring_obat' && patient && (
              <MedicationMonitoringForm
                medications={palliativeMedications.filter(m => m.palliativePatientId === patient.id && m.isActive)}
                onSubmit={handleMedMonitoringSubmit}
                onSaveDraft={() => {}}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
