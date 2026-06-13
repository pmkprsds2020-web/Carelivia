'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import type { User, Consultation, Message, DoctorProfile, Prescription, PrescriptionItem, MedicalRecord, MedicalRecordStatus, ScreeningForm, ScreeningModuleId, PalliativeToolType, PalliativeScreeningForm, PalliativeMonitoringStatus } from '@/lib/types';
import { InlineScreeningForm } from '@/components/telemedicine/inline-screening-form';
import type { ScreeningScoreResult } from '@/lib/palliative-screening-data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  SCREENING_MODULES,
  MODULE_LABELS,
  MODULE_ICONS,
  TRIAGE_COLORS,
  TRIAGE_LABELS,
  getModuleById,
  calculateProgress,
} from '@/lib/screening-templates';
import {
  Send,
  ArrowLeft,
  Search,
  Star,
  Check,
  CheckCheck,
  Loader2,
  MessageCircle,
  CreditCard,
  ShoppingCart,
  FileText,
  ClipboardList,
  Plus,
  Trash2,
  Stethoscope,
  Eye,
  Download,
  ClipboardCheck,
  AlertTriangle,
  Circle,
  Pill,
  Flame,
  Apple,
  ShieldAlert,
  Accessibility,
  Home,
  Paperclip,
  Brain,
  Activity,
  Heart,
  HeartPulse,
  Users,
  Shield,
} from 'lucide-react';

// ── Module Icon Map (Lucide icons replacing emojis) ──
const MODULE_ICON_MAP: Record<ScreeningModuleId, React.ReactNode> = {
  keluhan_utama: <Stethoscope className="w-4 h-4" />,
  tanda_bahaya: <AlertTriangle className="w-4 h-4" />,
  tanda_vital: <Activity className="w-4 h-4" />,
  penyakit_kronis: <Pill className="w-4 h-4" />,
  nyeri: <Flame className="w-4 h-4" />,
  kesehatan_mental: <Brain className="w-4 h-4" />,
  nutrisi: <Apple className="w-4 h-4" />,
  risiko_jatuh: <ShieldAlert className="w-4 h-4" />,
  status_fungsional: <Accessibility className="w-4 h-4" />,
  home_care: <Home className="w-4 h-4" />,
  paliatif: <Heart className="w-4 h-4" />,
  bukti_klinis: <Paperclip className="w-4 h-4" />,
};

// ── Palliative Screening Tool Labels ──
const PALLIATIVE_TOOL_LABELS: Record<PalliativeToolType, { name: string; icon: React.ReactNode; desc: string }> = {
  esas: { name: 'ESAS-r', icon: <Activity className="w-4 h-4" />, desc: 'Edmonton Symptom Assessment — 9 gejala VAS 0-10' },
  distress: { name: 'Distress Thermometer', icon: <Flame className="w-4 h-4" />, desc: 'NCCN Distress — Skor tekanan + daftar masalah' },
  spict: { name: 'Skrining Kebutuhan Perawatan Paliatif (SPICT)', icon: <ClipboardList className="w-4 h-4" />, desc: '15 pertanyaan + penyakit kronis + surprise question' },
  pps: { name: 'Skrining Kondisi Pasien (PPS)', icon: <HeartPulse className="w-4 h-4" />, desc: 'Palliative Performance Scale — 5 dimensi + pertanyaan tambahan' },
  zarit: { name: 'Zarit Caregiver Burden', icon: <Users className="w-4 h-4" />, desc: 'Beban pengasuh — 22 pertanyaan' },
  eortc: { name: 'EORTC QLQ-C15-PAL', icon: <Heart className="w-4 h-4" />, desc: 'Kualitas hidup paliatif — 15 item' },
};

// ── Types ──────────────────────────────────────────────────────────────────

interface DoctorWithProfile extends User {
  doctorProfile?: DoctorProfile;
}

type FilterTab = 'semua' | 'umum' | 'anak' | 'penyakit_dalam' | 'kebidanan' | 'gigi';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'umum', label: 'Umum' },
  { key: 'anak', label: 'Anak' },
  { key: 'penyakit_dalam', label: 'Penyakit Dalam' },
  { key: 'kebidanan', label: 'Kebidanan' },
  { key: 'gigi', label: 'Gigi' },
];

const SPECIALIZATION_LABELS: Record<string, string> = {
  umum: 'Dokter Umum',
  anak: 'Dokter Anak',
  penyakit_dalam: 'Penyakit Dalam',
  kebidanan: 'Dokter Kebidanan',
  gigi: 'Dokter Gigi',
};

// ── Demo Prescription Medicines ────────────────────────────────────────────

interface DemoMedicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  price: number;
}

const DEMO_MEDICINES: DemoMedicine[] = [
  { id: 'pm-1', name: 'Paracetamol 500mg', dosage: '500mg', frequency: '3x sehari', duration: '5 hari', price: 15000 },
  { id: 'pm-2', name: 'Amoxicillin 500mg', dosage: '500mg', frequency: '3x sehari', duration: '7 hari', price: 25000 },
  { id: 'pm-3', name: 'Omeprazole 20mg', dosage: '20mg', frequency: '1x sehari', duration: '14 hari', price: 35000 },
  { id: 'pm-4', name: 'Ibuprofen 400mg', dosage: '400mg', frequency: '2x sehari', duration: '5 hari', price: 18000 },
  { id: 'pm-5', name: 'CTM 4mg', dosage: '4mg', frequency: '3x sehari', duration: '5 hari', price: 8000 },
  { id: 'pm-6', name: 'Loratadine 10mg', dosage: '10mg', frequency: '1x sehari', duration: '7 hari', price: 28000 },
  { id: 'pm-7', name: 'Metformin 500mg', dosage: '500mg', frequency: '2x sehari', duration: '30 hari', price: 22000 },
  { id: 'pm-8', name: 'Vitamin C 1000mg', dosage: '1000mg', frequency: '1x sehari', duration: '30 hari', price: 45000 },
  { id: 'pm-9', name: 'Antasida Sirup', dosage: '10ml', frequency: '3x sehari', duration: '7 hari', price: 22000 },
  { id: 'pm-10', name: 'Vitamin D3 1000IU', dosage: '1000IU', frequency: '1x sehari', duration: '30 hari', price: 65000 },
];

// ── Auto-Prescription Templates ────────────────────────────────────────────

const AUTO_PRESCRIPTION_TEMPLATES: Record<string, string[][]> = {
  umum: [['pm-1', 'pm-2'], ['pm-1', 'pm-5'], ['pm-4', 'pm-6']],
  anak: [['pm-1'], ['pm-1', 'pm-8']],
  penyakit_dalam: [['pm-7', 'pm-3'], ['pm-2', 'pm-3']],
  kebidanan: [['pm-8', 'pm-10'], ['pm-1', 'pm-8']],
  gigi: [['pm-4', 'pm-2'], ['pm-1', 'pm-5']],
};

// ── Doctor Auto-Reply Messages ─────────────────────────────────────────────

const DOCTOR_AUTO_REPLIES: Record<string, string[]> = {
  umum: [
    'Baik, saya akan membantu Anda. Bisakah Anda jelaskan keluhan Anda lebih detail?',
    'Saya mengerti keluhan Anda. Mari kita lakukan pemeriksaan lebih lanjut.',
    'Untuk sementara, Anda bisa minum obat pereda nyeri dan banyak istirahat.',
    'Apakah ada riwayat penyakit sebelumnya yang perlu saya ketahui?',
    'Saya akan meresepkan obat untuk meredakan gejala Anda. Pastikan untuk minum sesuai anjuran.',
    'Jika gejala tidak membaik dalam 3 hari, silakan konsultasi kembali.',
  ],
  anak: [
    'Baik, berapa usia anak Anda? Apakah ada demam?',
    'Untuk anak-anak, dosis obat harus disesuaikan dengan berat badan.',
    'Pastikan anak mendapat cukup cairan dan istirahat.',
    'Apakah anak sudah diberikan imunisasi lengkap?',
    'Saya akan meresepkan obat yang aman untuk anak. Ikuti dosis sesuai petunjuk.',
    'Jika anak masih rewel atau demam tinggi, bawa ke IGD segera.',
  ],
  penyakit_dalam: [
    'Saya perlu mengetahui tekanan darah dan gula darah Anda.',
    'Apakah Anda sedang mengonsumsi obat lain saat ini?',
    'Kita perlu memantau kondisi Anda secara berkala.',
    'Saya akan menyesuaikan pengobatan Anda. Harap rutin kontrol.',
    'Penting untuk menjaga pola makan dan olahraga teratur.',
    'Saya akan meresepkan obat untuk mengontrol kondisi Anda.',
  ],
  kebidanan: [
    'Selamat! Bagaimana kondisi kehamilan Anda saat ini?',
    'Pastikan Anda rutin memeriksa kehamilan dan mengonsumsi vitamin prenatal.',
    'Apakah ada keluhan tertentu selama kehamilan?',
    'Saya akan meresepkan vitamin dan suplemen yang dibutuhkan.',
    'Jangan lupa jadwal USG berikutnya ya, Bu.',
    'Pastikan asupan nutrisi cukup untuk ibu dan bayi.',
  ],
  gigi: [
    'Sejak kapan gigi Anda terasa sakit?',
    'Apakah ada pembengkakan pada gusi?',
    'Sementara, Anda bisa berkumur dengan air garam hangat.',
    'Saya akan meresepkan obat penghilang rasa sakit dan antibiotik.',
    'Pastikan untuk menyikat gigi 2x sehari dan gunakan benang gigi.',
    'Kita perlu melakukan perawatan lebih lanjut. Silakan buat janji kontrol.',
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Hari Ini';
    if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

function isDifferentDay(a: string, b: string): boolean {
  return new Date(a).toDateString() !== new Date(b).toDateString();
}

function formatFee(fee: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(fee);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateRmNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `RM-${y}${m}${d}-${seq}`;
}

// ── Main Component ─────────────────────────────────────────────────────────

export function ChatPanel() {
  const {
    currentUser,
    doctors,
    consultations,
    setConsultations,
    activeConsultation,
    setActiveConsultation,
    messages,
    setMessages,
    addMessage,
    onlineDoctors,
    prescriptions,
    addPrescription,
    updatePrescriptionStatus,
    medicalRecords,
    addMedicalRecord,
    updateMedicalRecord,
    updateConsultation,
    addToCart,
    setActivePanel,
    setPayments,
    setPendingPrescriptionCheckout,
    screeningForms,
    addScreeningForm,
    updateScreeningForm,
    addAuditLog,
    addClinicalAlert,
    palliativeScreeningForms,
    addPalliativeScreeningForm,
    updatePalliativeScreeningForm,
    setActivePalliativeFormId,
    markPatientAsPalliative,
    palliativePatients,
    addPalliativeScreeningRecord,
    addPalliativeMonitoringNotification,
  } = useStore();

  const { toast } = useToast();

  // Local state
  const [activeFilter, setActiveFilter] = useState<FilterTab>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showChatArea, setShowChatArea] = useState(false);
  const [creatingConsultation, setCreatingConsultation] = useState<string | null>(null);

  // Doctor dialog state
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);
  const [showMedicalRecordDialog, setShowMedicalRecordDialog] = useState(false);

  // Screening dialog state
  const [showScreeningDialog, setShowScreeningDialog] = useState(false);
  const [selectedModules, setSelectedModules] = useState<ScreeningModuleId[]>([
    'keluhan_utama', 'tanda_bahaya', 'tanda_vital', 'penyakit_kronis',
    'nyeri', 'kesehatan_mental', 'nutrisi', 'risiko_jatuh',
    'status_fungsional', 'home_care', 'paliatif', 'bukti_klinis'
  ]);
  const [screeningInstructions, setScreeningInstructions] = useState('');
  const [screeningDeadline, setScreeningDeadline] = useState('');

  // Palliative screening dialog state
  const [showPalliativeDialog, setShowPalliativeDialog] = useState(false);
  const [selectedPalliativeTools, setSelectedPalliativeTools] = useState<PalliativeToolType[]>(['esas', 'distress', 'spict', 'pps', 'zarit', 'eortc']);
  const [palliativeInstructions, setPalliativeInstructions] = useState('');

  // Prescription form state
  const [rxItems, setRxItems] = useState<Array<{
    medicineId: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
  }>>([]);

  // Inline screening state
  const [inlineScreeningFormId, setInlineScreeningFormId] = useState<string | null>(null);
  const [inlineScreeningType, setInlineScreeningType] = useState<PalliativeToolType | null>(null);

  // Palliative marking dialog state
  const [showPalliativeMarkingDialog, setShowPalliativeMarkingDialog] = useState(false);
  const [markingData, setMarkingData] = useState({
    primaryDiagnosis: '',
    secondaryDiagnosis: '',
    initialPPS: 60,
    diseaseCategory: '',
    reasonForPalliative: '',
    doctorNotes: '',
  });

  // Medical record form state
  const [mrDiagnosis, setMrDiagnosis] = useState('');
  const [mrSymptoms, setMrSymptoms] = useState('');
  const [mrTreatment, setMrTreatment] = useState('');
  const [mrNotes, setMrNotes] = useState('');

  // Patient message count for auto-prescription
  const patientMessageCountRef = useRef(0);
  const autoPrescriptionSentRef = useRef(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  const isDoctor = currentUser?.role === 'doctor';
  const isPatient = currentUser?.role === 'patient';

  // ── Derived data ───────────────────────────────────────────────────────

  const filteredDoctors = doctors.filter((doc) => {
    const spec = doc.doctorProfile?.specialization;
    if (activeFilter !== 'semua' && spec !== activeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        doc.name.toLowerCase().includes(q) ||
        (spec && SPECIALIZATION_LABELS[spec]?.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const isDoctorOnline = (userId: string): boolean => {
    return onlineDoctors.includes(userId);
  };

  const getConsultationForDoctor = (doctorId: string): Consultation | undefined => {
    return consultations.find(
      (c) =>
        c.doctorId === doctorId &&
        (c.status === 'active' || c.status === 'waiting') &&
        c.patientId === currentUser?.id
    );
  };

  // Doctor's consultations (for doctor view)
  const doctorConsultations = consultations.filter(
    (c) => c.doctorId === currentUser?.id && (c.status === 'active' || c.status === 'waiting' || c.status === 'completed')
  );

  // ── Auto-scroll ──────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Reset auto-prescription tracking when consultation changes ──────

  useEffect(() => {
    patientMessageCountRef.current = 0;
    autoPrescriptionSentRef.current = false;
  }, [activeConsultation?.id]);

  // ── Start a chat with a doctor (Patient) ──────────────────────────────

  const handleStartChat = (doctor: DoctorWithProfile) => {
    if (!currentUser) return;

    const existing = getConsultationForDoctor(doctor.id);
    if (existing) {
      openConsultation(existing);
      return;
    }

    setCreatingConsultation(doctor.id);

    const consultationId = generateId();
    const welcomeMessage: Message = {
      id: generateId(),
      consultationId,
      senderId: 'system',
      content: "Selamat datang di CareLivia! Dokter akan segera merespons pesan Anda.",
      type: 'text',
      status: 'read',
      createdAt: new Date().toISOString(),
    };

    const newConsultation: Consultation = {
      id: consultationId,
      patientId: currentUser.id,
      doctorId: doctor.id,
      type: 'chat',
      status: 'active',
      startTime: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      patient: currentUser,
      doctor: doctor,
      messages: [welcomeMessage],
    };

    setConsultations([newConsultation, ...consultations]);
    setActiveConsultation(newConsultation);
    setMessages([welcomeMessage]);

    patientMessageCountRef.current = 0;
    autoPrescriptionSentRef.current = false;

    setShowChatArea(true);
    setCreatingConsultation(null);
  };

  // ── Open an existing consultation ──────────────────────────────────────

  const openConsultation = (consultation: Consultation) => {
    setActiveConsultation(consultation);

    // Load existing messages
    const existingMessages = consultation.messages || [];
    setMessages(existingMessages);

    patientMessageCountRef.current = existingMessages.filter(
      (m) => m.senderId === consultation.patientId
    ).length;
    autoPrescriptionSentRef.current = false;

    setShowChatArea(true);
  };

  // ── Send a message ─────────────────────────────────────────────────────

  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeConsultation || !currentUser) return;

    const content = messageInput.trim();
    setMessageInput('');
    setIsSending(true);

    const newMessage: Message = {
      id: generateId(),
      consultationId: activeConsultation.id,
      senderId: currentUser.id,
      content,
      type: 'text',
      status: 'sent',
      createdAt: new Date().toISOString(),
    };

    addMessage(newMessage);

    // Update consultation with new message
    const updatedMessages = [...messages, newMessage];
    const updatedConsultation = {
      ...activeConsultation,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };
    updateConsultation(activeConsultation.id, updatedConsultation);

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setIsSending(false);
    messageInputRef.current?.focus();

    // If patient is sending, simulate doctor auto-reply
    if (isPatient) {
      patientMessageCountRef.current += 1;

      // Show typing indicator
      setTimeout(() => setIsTyping(true), 500);

      const doctorUser = doctors.find((d) => d.id === activeConsultation.doctorId);
      const specialization = doctorUser?.doctorProfile?.specialization || 'umum';
      const replies = DOCTOR_AUTO_REPLIES[specialization] || DOCTOR_AUTO_REPLIES.umum;
      const randomReply = replies[Math.floor(Math.random() * replies.length)];

      setTimeout(() => {
        setIsTyping(false);
        const doctorReply: Message = {
          id: generateId(),
          consultationId: activeConsultation.id,
          senderId: activeConsultation.doctorId,
          content: randomReply,
          type: 'text',
          status: 'delivered',
          createdAt: new Date().toISOString(),
        };
        addMessage(doctorReply);
        updateConsultation(activeConsultation.id, {
          messages: [...updatedMessages, doctorReply],
          updatedAt: new Date().toISOString(),
        });
      }, 1500 + Math.random() * 2000);

      // Auto-send e-prescription after 3+ patient messages
      if (patientMessageCountRef.current >= 3 && !autoPrescriptionSentRef.current) {
        autoPrescriptionSentRef.current = true;
        setTimeout(() => {
          handleAutoPrescription(activeConsultation, specialization);
        }, 4000 + Math.random() * 2000);
      }
    }
  };

  // ── Auto-Prescription (Patient View Simulation) ────────────────────────

  const handleAutoPrescription = (consultation: Consultation, specialization: string) => {
    const templates = AUTO_PRESCRIPTION_TEMPLATES[specialization] || AUTO_PRESCRIPTION_TEMPLATES.umum;
    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];

    const items: PrescriptionItem[] = selectedTemplate.map((medId) => {
      const med = DEMO_MEDICINES.find((m) => m.id === medId)!;
      return {
        id: generateId(),
        prescriptionId: '',
        medicineName: med.name,
        dosage: med.dosage,
        quantity: 1,
        frequency: med.frequency,
        duration: med.duration,
        price: med.price,
      };
    });

    const prescriptionId = generateId();
    const prescription: Prescription = {
      id: prescriptionId,
      consultationId: consultation.id,
      doctorId: consultation.doctorId,
      patientId: consultation.patientId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: items.map((item) => ({ ...item, prescriptionId })),
    };

    addPrescription(prescription);

    // Send prescription message in chat
    const rxMessage: Message = {
      id: generateId(),
      consultationId: consultation.id,
      senderId: consultation.doctorId,
      content: `__PRESCRIPTION__${prescriptionId}__`,
      type: 'text',
      status: 'delivered',
      createdAt: new Date().toISOString(),
    };
    addMessage(rxMessage);
    updateConsultation(consultation.id, {
      messages: [...(consultation.messages || []), rxMessage],
      prescription: prescription,
      updatedAt: new Date().toISOString(),
    });

    // Auto-create medical record if not exists
    const existingMR = medicalRecords.find((mr) => mr.consultationId === consultation.id);
    if (!existingMR) {
      const rmNumber = generateRmNumber();
      const mr: MedicalRecord = {
        id: generateId(),
        patientId: consultation.patientId,
        consultationId: consultation.id,
        rmNumber,
        diagnosis: '',
        symptoms: '',
        treatment: '',
        notes: '',
        status: 'draft' as MedicalRecordStatus,
        recordDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addMedicalRecord(mr);
      updateConsultation(consultation.id, { medicalRecord: mr });
    }

    toast({
      title: 'E-Resep Dikirim',
      description: 'Dokter telah mengirim e-resep untuk Anda.',
    });
  };

  // ── Prescription Dialog (Doctor View) ──────────────────────────────────

  const handleOpenPrescriptionDialog = () => {
    setRxItems([]);
    setShowPrescriptionDialog(true);
  };

  const handleAddRxItem = () => {
    setRxItems([
      ...rxItems,
      { medicineId: '', dosage: '', frequency: '', duration: '', quantity: 1 },
    ]);
  };

  const handleRemoveRxItem = (index: number) => {
    setRxItems(rxItems.filter((_, i) => i !== index));
  };

  const handleRxItemChange = (index: number, field: string, value: string | number) => {
    const updated = [...rxItems];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-fill from demo medicine when selected
    if (field === 'medicineId') {
      const med = DEMO_MEDICINES.find((m) => m.id === value);
      if (med) {
        updated[index] = {
          ...updated[index],
          medicineId: med.id,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
        };
      }
    }
    setRxItems(updated);
  };

  const handleSendPrescription = () => {
    if (!activeConsultation || !currentUser || rxItems.length === 0) return;

    const validItems = rxItems.filter((item) => item.medicineId);
    if (validItems.length === 0) {
      toast({ title: 'Error', description: 'Tambahkan minimal 1 obat yang valid.' });
      return;
    }

    const prescriptionId = generateId();
    const items: PrescriptionItem[] = validItems.map((item) => {
      const med = DEMO_MEDICINES.find((m) => m.id === item.medicineId)!;
      return {
        id: generateId(),
        prescriptionId,
        medicineName: med.name,
        dosage: item.dosage || med.dosage,
        quantity: item.quantity,
        frequency: item.frequency || med.frequency,
        duration: item.duration || med.duration,
        price: med.price,
      };
    });

    const prescription: Prescription = {
      id: prescriptionId,
      consultationId: activeConsultation.id,
      doctorId: currentUser.id,
      patientId: activeConsultation.patientId,
      status: 'pending',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items,
    };

    addPrescription(prescription);

    // Send prescription message
    const rxMessage: Message = {
      id: generateId(),
      consultationId: activeConsultation.id,
      senderId: currentUser.id,
      content: `__PRESCRIPTION__${prescriptionId}__`,
      type: 'text',
      status: 'delivered',
      createdAt: new Date().toISOString(),
    };
    addMessage(rxMessage);
    updateConsultation(activeConsultation.id, {
      messages: [...(activeConsultation.messages || []), rxMessage],
      prescription: prescription,
      updatedAt: new Date().toISOString(),
    });

    // Auto-create medical record if not exists
    const existingMR = medicalRecords.find((mr) => mr.consultationId === activeConsultation.id);
    if (!existingMR) {
      const rmNumber = generateRmNumber();
      const mr: MedicalRecord = {
        id: generateId(),
        patientId: activeConsultation.patientId,
        consultationId: activeConsultation.id,
        rmNumber,
        diagnosis: '',
        symptoms: '',
        treatment: '',
        notes: '',
        status: 'draft' as MedicalRecordStatus,
        recordDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addMedicalRecord(mr);
      updateConsultation(activeConsultation.id, { medicalRecord: mr });
    }

    // System message
    const sysMessage: Message = {
      id: generateId(),
      consultationId: activeConsultation.id,
      senderId: 'system',
      content: 'E-Resep telah dikirim ke pasien.',
      type: 'text',
      status: 'read',
      createdAt: new Date().toISOString(),
    };
    addMessage(sysMessage);

    setShowPrescriptionDialog(false);
    setRxItems([]);
    toast({ title: 'Berhasil', description: 'E-Resep berhasil dikirim.' });
  };

  // ── Medical Record Dialog (Doctor View) ────────────────────────────────

  const handleOpenMedicalRecordDialog = () => {
    if (activeConsultation) {
      const existingMR = medicalRecords.find((mr) => mr.consultationId === activeConsultation.id);
      if (existingMR) {
        setMrDiagnosis(existingMR.diagnosis || '');
        setMrSymptoms(existingMR.symptoms || '');
        setMrTreatment(existingMR.treatment || '');
        setMrNotes(existingMR.notes || '');
      } else {
        setMrDiagnosis('');
        setMrSymptoms('');
        setMrTreatment('');
        setMrNotes('');
      }
    }
    setShowMedicalRecordDialog(true);
  };

  const handleSaveMedicalRecord = () => {
    if (!activeConsultation || !currentUser) return;

    const existingMR = medicalRecords.find((mr) => mr.consultationId === activeConsultation.id);
    const allFieldsFilled = mrDiagnosis.trim() && mrSymptoms.trim() && mrTreatment.trim();
    const status: MedicalRecordStatus = allFieldsFilled ? 'selesai' : 'draft';

    if (existingMR) {
      updateMedicalRecord(existingMR.id, {
        diagnosis: mrDiagnosis,
        symptoms: mrSymptoms,
        treatment: mrTreatment,
        notes: mrNotes,
        status,
        updatedAt: new Date().toISOString(),
      });
      updateConsultation(activeConsultation.id, {
        medicalRecord: {
          ...existingMR,
          diagnosis: mrDiagnosis,
          symptoms: mrSymptoms,
          treatment: mrTreatment,
          notes: mrNotes,
          status,
        },
      });
    } else {
      const rmNumber = generateRmNumber();
      const mr: MedicalRecord = {
        id: generateId(),
        patientId: activeConsultation.patientId,
        consultationId: activeConsultation.id,
        rmNumber,
        diagnosis: mrDiagnosis,
        symptoms: mrSymptoms,
        treatment: mrTreatment,
        notes: mrNotes,
        status,
        recordDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addMedicalRecord(mr);
      updateConsultation(activeConsultation.id, { medicalRecord: mr });
    }

    // System message
    const sysMessage: Message = {
      id: generateId(),
      consultationId: activeConsultation.id,
      senderId: 'system',
      content: `Rekam Medis ${status === 'selesai' ? 'disimpan' : 'disimpan sebagai draft'}.`,
      type: 'text',
      status: 'read',
      createdAt: new Date().toISOString(),
    };
    addMessage(sysMessage);

    setShowMedicalRecordDialog(false);
    toast({
      title: 'Berhasil',
      description: `Rekam Medis ${status === 'selesai' ? 'disimpan' : 'disimpan sebagai draft'}.`,
    });
  };

  // ── Payment Flow ───────────────────────────────────────────────────────

  const handlePayPrescription = (prescription: Prescription) => {
    if (!currentUser) return;

    // Set the pending prescription checkout in store and navigate to payments
    setPendingPrescriptionCheckout(prescription);
    setActivePanel('payments');
  };

  const handleCheckoutPrescription = (prescription: Prescription) => {
    if (!currentUser) return;

    (prescription.items || []).forEach((item) => {
      const med = useStore.getState().medicines.find(
        (m) => m.name.toLowerCase().includes(item.medicineName.toLowerCase().split(' ')[0])
      );
      if (med) {
        addToCart({ medicine: med, quantity: item.quantity });
      }
    });

    toast({ title: 'Ditambahkan ke Keranjang', description: 'Obat ditambahkan ke keranjang apotek.' });
    setActivePanel('pharmacy');
  };

  // ── Screening Flow ───────────────────────────────────────────────────────

  const handleOpenScreeningDialog = () => {
    setSelectedModules(['keluhan_utama', 'tanda_bahaya', 'tanda_vital']);
    setScreeningInstructions('');
    setScreeningDeadline('');
    setShowScreeningDialog(true);
  };

  const handleToggleModule = (moduleId: ScreeningModuleId) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleSendScreening = () => {
    if (!activeConsultation || !currentUser || selectedModules.length === 0) return;

    const formId = generateId();
    const screeningForm: ScreeningForm = {
      id: formId,
      consultationId: activeConsultation.id,
      doctorId: currentUser.id,
      patientId: activeConsultation.patientId,
      status: 'sent',
      instructions: screeningInstructions || undefined,
      deadline: screeningDeadline || undefined,
      selectedModules: [...selectedModules],
      moduleAnswers: {} as Record<ScreeningModuleId, Record<string, string | number | string[]>>,
      moduleScores: {} as Record<ScreeningModuleId, { score: number; riskCategory: 'rendah' | 'sedang' | 'tinggi'; label: string; recommendations: string[] }>,
      clinicalFiles: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addScreeningForm(screeningForm);

    // Send screening message in chat
    const screeningMessage: Message = {
      id: generateId(),
      consultationId: activeConsultation.id,
      senderId: currentUser.id,
      content: `__SCREENING__${formId}__`,
      type: 'text',
      status: 'delivered',
      createdAt: new Date().toISOString(),
    };
    addMessage(screeningMessage);
    updateConsultation(activeConsultation.id, {
      messages: [...(activeConsultation.messages || []), screeningMessage],
      updatedAt: new Date().toISOString(),
    });

    addAuditLog({
      id: generateId(),
      screeningId: formId,
      action: 'sent',
      performedBy: currentUser.id,
      timestamp: new Date().toISOString(),
      details: `Modul: ${selectedModules.map(m => MODULE_LABELS[m]).join(', ')}`,
    });

    // System message
    const sysMessage: Message = {
      id: generateId(),
      consultationId: activeConsultation.id,
      senderId: 'system',
      content: `Formulir Skrining Komprehensif Telemedicine telah dikirim. Modul: ${selectedModules.map(m => MODULE_LABELS[m]).join(', ')}`,
      type: 'text',
      status: 'read',
      createdAt: new Date().toISOString(),
    };
    addMessage(sysMessage);

    setShowScreeningDialog(false);
    setSelectedModules(['keluhan_utama', 'tanda_bahaya', 'tanda_vital']);
    toast({ title: 'Berhasil', description: 'Form skrining komprehensif berhasil dikirim ke pasien.' });
  };

  // ── Palliative Screening Flow ────────────────────────────────────────────

  const handleOpenPalliativeDialog = () => {
    setSelectedPalliativeTools(['esas', 'distress', 'spict', 'pps', 'zarit', 'eortc']);
    setPalliativeInstructions('');
    setShowPalliativeDialog(true);
  };

  const handleTogglePalliativeTool = (tool: PalliativeToolType) => {
    setSelectedPalliativeTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  };

  const handleSendPalliativeScreening = () => {
    if (!activeConsultation || !currentUser || selectedPalliativeTools.length === 0) return;

    const formId = generateId();
    const palliativeForm: PalliativeScreeningForm = {
      id: formId,
      consultationId: activeConsultation.id,
      doctorId: currentUser.id,
      patientId: activeConsultation.patientId,
      status: 'sent',
      instructions: palliativeInstructions || undefined,
      selectedTools: [...selectedPalliativeTools],
      toolAnswers: {},
      toolResults: {} as PalliativeScreeningForm['toolResults'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addPalliativeScreeningForm(palliativeForm);

    // Send palliative screening message in chat
    const palliativeMessage: Message = {
      id: generateId(),
      consultationId: activeConsultation.id,
      senderId: currentUser.id,
      content: `__PALLIATIVE__${formId}__`,
      type: 'text',
      status: 'delivered',
      createdAt: new Date().toISOString(),
    };
    addMessage(palliativeMessage);
    updateConsultation(activeConsultation.id, {
      messages: [...(activeConsultation.messages || []), palliativeMessage],
      updatedAt: new Date().toISOString(),
    });

    // System message
    const sysMessage: Message = {
      id: generateId(),
      consultationId: activeConsultation.id,
      senderId: 'system',
      content: `Formulir Skrining Paliatif telah dikirim. Alat: ${selectedPalliativeTools.map(t => PALLIATIVE_TOOL_LABELS[t].name).join(', ')}`,
      type: 'text',
      status: 'read',
      createdAt: new Date().toISOString(),
    };
    addMessage(sysMessage);

    setShowPalliativeDialog(false);
    setSelectedPalliativeTools(['esas', 'distress', 'spict', 'pps', 'zarit', 'eortc']);
    toast({ title: 'Berhasil', description: 'Form skrining paliatif berhasil dikirim ke pasien.' });
  };

  // ── Inline Screening Submit Handler ─────────────────────────────────────

  const handleInlineScreeningSubmit = useCallback((result: ScreeningScoreResult, answers: Record<string, number | string | string[]>) => {
    if (!inlineScreeningFormId || !inlineScreeningType || !activeConsultation) return;

    // Update the palliative screening form in store
    const currentForm = palliativeScreeningForms.find(f => f.id === inlineScreeningFormId);
    updatePalliativeScreeningForm(inlineScreeningFormId, {
      toolAnswers: { ...currentForm?.toolAnswers, [inlineScreeningType]: answers },
      toolResults: {
        ...currentForm?.toolResults,
        [inlineScreeningType]: {
          score: result.score,
          scoreLabel: result.scoreLabel,
          interpretation: result.interpretation,
          ewsLevel: result.ewsLevel,
          details: result.details,
        }
      },
      status: 'in_progress',
      updatedAt: new Date().toISOString(),
    });

    // Also add to screening records if patient is a palliative patient
    const palliativePatient = palliativePatients.find(p => p.patientId === activeConsultation.patientId);
    if (palliativePatient) {
      addPalliativeScreeningRecord({
        id: `sr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        palliativePatientId: palliativePatient.id,
        screeningType: inlineScreeningType,
        score: result.score,
        scoreLabel: result.scoreLabel,
        interpretation: result.interpretation,
        ewsLevel: result.ewsLevel,
        details: JSON.stringify(result.details),
        performedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    // Add a response message in chat
    const responseMsg: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      consultationId: activeConsultation.id,
      senderId: currentUser?.id || '',
      content: `Hasil skrining ${inlineScreeningType.toUpperCase()}: ${result.scoreLabel} (${result.ewsLevel === 'merah' ? 'Kritis' : result.ewsLevel === 'kuning' ? 'Perhatian' : 'Normal'})`,
      type: 'text',
      status: 'delivered',
      createdAt: new Date().toISOString(),
    };
    addMessage(responseMsg);

    // Send notification to doctor
    addPalliativeMonitoringNotification({
      id: `pn-${Date.now()}`,
      patientId: activeConsultation.patientId,
      patientName: activeConsultation.patient?.name || '',
      type: 'screening_completed',
      title: 'Skrining Paliatif Selesai',
      description: `Pasien telah mengisi skrining ${inlineScreeningType.toUpperCase()}: ${result.scoreLabel}`,
      severity: result.ewsLevel === 'merah' ? 'critical' : result.ewsLevel === 'kuning' ? 'warning' : 'info',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // Reset inline screening state
    setInlineScreeningFormId(null);
    setInlineScreeningType(null);

    toast({ title: 'Skrining Terkirim', description: `Hasil skrining ${inlineScreeningType.toUpperCase()} berhasil dikirim.` });
  }, [inlineScreeningFormId, inlineScreeningType, activeConsultation, currentUser, palliativeScreeningForms, palliativePatients, updatePalliativeScreeningForm, addPalliativeScreeningRecord, addPalliativeMonitoringNotification, addMessage, toast]);

  // ── Palliative Marking Handler ──────────────────────────────────────────

  const handleConfirmPalliativeMarking = () => {
    if (!activeConsultation || !currentUser || !markingData.primaryDiagnosis) {
      toast({ title: 'Error', description: 'Diagnosis utama wajib diisi.' });
      return;
    }

    markPatientAsPalliative(
      activeConsultation.id,
      currentUser.id,
      activeConsultation.patientId,
      activeConsultation.patient?.name || 'Pasien',
      markingData
    );

    // Send system message
    const sysMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      consultationId: activeConsultation.id,
      senderId: 'system',
      content: 'Pasien telah ditandai sebagai Pasien Monitoring Paliatif. Data pasien otomatis tersinkronisasi dengan Modul Monitoring Paliatif.',
      type: 'text',
      status: 'read',
      createdAt: new Date().toISOString(),
    };
    addMessage(sysMessage);

    setShowPalliativeMarkingDialog(false);
    setMarkingData({
      primaryDiagnosis: '',
      secondaryDiagnosis: '',
      initialPPS: 60,
      diseaseCategory: '',
      reasonForPalliative: '',
      doctorNotes: '',
    });

    toast({ title: 'Berhasil', description: 'Pasien berhasil ditandai sebagai Pasien Monitoring Paliatif.' });
  };

  // ── Handle typing ──────────────────────────────────────────────────────

  const handleTyping = (value: string) => {
    setMessageInput(value);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      // stopped typing
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleBackToList = () => {
    setShowChatArea(false);
    setActiveConsultation(null);
  };

  // ── Get doctor for active consultation ────────────────────────────────

  const activeDoctor = activeConsultation
    ? doctors.find((d) => d.id === activeConsultation.doctorId)
    : undefined;

  // ── Render E-Prescription Card ─────────────────────────────────────────

  const renderPrescriptionCard = (prescriptionId: string) => {
    const prescription = prescriptions.find((p) => p.id === prescriptionId);
    if (!prescription) return null;

    const items = prescription.items || [];
    const totalAmount = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    const isPaid = prescription.status === 'paid';

    return (
      <div className="border-2 border-primary rounded-xl overflow-hidden bg-card max-w-sm my-2">
        {/* Header */}
        <div className="bg-primary/10 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-primary">E-Resep Dokter</span>
          </div>
          <Badge variant={isPaid ? 'default' : 'secondary'} className={cn('text-[10px]', isPaid && 'bg-emerald-600')}>
            {isPaid ? 'Sudah Dibayar' : 'Menunggu Pembayaran'}
          </Badge>
        </div>

        {/* Medicine Table */}
        <div className="px-4 py-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 text-muted-foreground font-medium">Obat</th>
                  <th className="text-center py-1.5 text-muted-foreground font-medium">Dosis</th>
                  <th className="text-center py-1.5 text-muted-foreground font-medium">Frek.</th>
                  <th className="text-center py-1.5 text-muted-foreground font-medium">Durasi</th>
                  <th className="text-center py-1.5 text-muted-foreground font-medium">Qty</th>
                  <th className="text-right py-1.5 text-muted-foreground font-medium">Harga</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 font-medium text-foreground">{item.medicineName}</td>
                    <td className="py-1.5 text-center text-muted-foreground">{item.dosage}</td>
                    <td className="py-1.5 text-center text-muted-foreground">{item.frequency}</td>
                    <td className="py-1.5 text-center text-muted-foreground">{item.duration}</td>
                    <td className="py-1.5 text-center text-foreground">{item.quantity}</td>
                    <td className="py-1.5 text-right text-foreground">{formatFee(item.price || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
            <span className="font-semibold text-sm text-foreground">Total</span>
            <span className="font-bold text-sm text-primary">{formatFee(totalAmount)}</span>
          </div>
        </div>

        {/* Patient Action Buttons */}
        {isPatient && (
          <div className="px-4 pb-3">
            {isPaid ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 py-1 text-emerald-600">
                  <CheckCheck className="w-4 h-4" />
                  <span className="text-sm font-medium">Sudah Dibayar</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs"
                    onClick={() => {
                      setActivePanel('medical-records');
                    }}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Lihat Bukti
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs"
                    onClick={() => {
                      // Find payment for this prescription and download
                      const pay = useStore.getState().payments.find(
                        (p) => p.referenceId === prescription.id && p.status === 'success'
                      );
                      if (pay) {
                        const items = (prescription.items || []).map((item) => ({
                          name: item.medicineName,
                          dosage: item.dosage,
                          quantity: item.quantity,
                          price: item.price || 0,
                        }));
                        const params = new URLSearchParams({
                          invoiceNumber: pay.invoiceNumber || `INV-${pay.id}`,
                          amount: String(pay.amount),
                          method: pay.method,
                          paidAt: pay.paidAt || pay.createdAt,
                          patientName: useStore.getState().currentUser?.name || '',
                          doctorName: '',
                          prescriptionId: prescription.id,
                          items: JSON.stringify(items),
                        });
                        window.open(`/api/payment-proof?${params.toString()}`, '_blank');
                      }
                    }}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Unduh Bukti
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => handlePayPrescription(prescription)}
                >
                  <CreditCard className="w-3.5 h-3.5 mr-1" />
                  Bayar Sekarang
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-xs"
                  onClick={() => handleCheckoutPrescription(prescription)}
                >
                  <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                  Tambah ke Keranjang Apotek
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Render Screening Card ──────────────────────────────────────────────

  const renderScreeningCard = (formId: string) => {
    const form = screeningForms.find((f) => f.id === formId);
    if (!form) return null;

    const isCompleted = form.status === 'completed' || form.status === 'reviewed';
    const isPending = form.status === 'sent' || form.status === 'opened' || form.status === 'in_progress' || form.status === 'draft';
    const triage = form.triageResult;
    const summary = form.clinicalSummary;

    return (
      <div className="border-2 border-teal-500 rounded-xl overflow-hidden bg-card max-w-sm my-2">
        {/* Header */}
        <div className="bg-teal-500/10 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-teal-600" />
            <span className="font-semibold text-sm text-teal-700">Skrining Komprehensif Telemedicine</span>
          </div>
          <Badge className={cn('text-[10px]', isCompleted ? 'bg-emerald-600' : 'bg-amber-500')}>
            {isCompleted ? 'Selesai' : 'Menunggu Diisi'}
          </Badge>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <p className="font-medium text-sm text-foreground">Skrining Pra-Konsultasi</p>
          <p className="text-xs text-muted-foreground">12 modul skrining komprehensif</p>

          {form.instructions && (
            <p className="text-xs text-primary mt-2 bg-primary/5 p-2 rounded flex items-start gap-1"><FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {form.instructions}</p>
          )}

          {/* Triage result */}
          {isCompleted && triage && (
            <div className="mt-3 space-y-2">
              <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border', TRIAGE_COLORS[triage.level].bg, TRIAGE_COLORS[triage.level].border)}>
                <Circle className={cn('w-5 h-5', triage.level === 'hijau' ? 'text-emerald-500 fill-emerald-500' : triage.level === 'kuning' ? 'text-amber-500 fill-amber-500' : triage.level === 'oranye' ? 'text-orange-500 fill-orange-500' : 'text-red-500 fill-red-500')} />
                <div>
                  <p className={cn('text-sm font-bold', TRIAGE_COLORS[triage.level].text)}>{triage.label}</p>
                  <p className="text-xs text-foreground">{triage.description}</p>
                </div>
              </div>
              {summary && (
                <div className="text-xs text-muted-foreground">
                  <p>Keluhan: {summary.chiefComplaint}</p>
                  {summary.painScore !== null && <p>Nyeri: {summary.painScore}/10</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Patient Actions */}
        {isPatient && isPending && (
          <div className="px-4 pb-3">
            <Button
              size="sm"
              className="w-full h-8 text-xs bg-teal-600 hover:bg-teal-700"
              onClick={() => setActivePanel('screening')}
            >
              <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
              Isi Skrining Komprehensif
            </Button>
          </div>
        )}

        {/* Doctor view - completed summary */}
        {isDoctor && isCompleted && triage && (
          <div className="px-4 pb-3">
            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">✅ Skrining Komprehensif Telah Diselesaikan</p>
              <p className={cn('font-medium', TRIAGE_COLORS[triage.level].text)}>Triase: {triage.label}</p>
              {summary && <p className="text-muted-foreground">Keluhan: {summary.chiefComplaint}</p>}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs mt-2"
              onClick={() => setActivePanel('screening')}
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              Lihat Detail
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ── Render Palliative Screening Card ──────────────────────────────────

  const renderPalliativeCard = (formId: string) => {
    const form = palliativeScreeningForms.find((f) => f.id === formId);
    if (!form) return null;

    const isCompleted = form.status === 'completed' || form.status === 'reviewed';
    const isPending = form.status === 'sent' || form.status === 'opened' || form.status === 'in_progress' || form.status === 'draft';
    const toolNames = form.selectedTools.map(t => PALLIATIVE_TOOL_LABELS[t].name);

    // Determine worst EWS level for badge
    const ewsLevels = Object.values(form.toolResults).map(r => r.ewsLevel);
    const worstEws = ewsLevels.includes('merah') ? 'merah' : ewsLevels.includes('kuning') ? 'kuning' : 'hijau';
    const ewsBadge = worstEws === 'merah' ? { label: 'Kritis', color: 'text-red-700', bg: 'bg-red-100 border-red-300' } :
                     worstEws === 'kuning' ? { label: 'Perhatian', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300' } :
                     { label: 'Normal', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-300' };

    return (
      <div className="border-2 border-rose-500 rounded-xl overflow-hidden bg-card max-w-sm my-2">
        {/* Header */}
        <div className="bg-rose-500/10 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-600" />
            <span className="font-semibold text-sm text-rose-700">Skrining Paliatif</span>
          </div>
          <Badge className={cn('text-[10px]', isCompleted ? 'bg-emerald-600' : 'bg-amber-500')}>
            {isCompleted ? 'Selesai' : 'Menunggu Diisi'}
          </Badge>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <p className="font-medium text-sm text-foreground">Skrining Paliatif Telemedicine</p>
          <p className="text-xs text-muted-foreground">{form.selectedTools.length} alat skrining paliatif</p>

          {form.instructions && (
            <p className="text-xs text-rose-600 mt-2 bg-rose-50 p-2 rounded flex items-start gap-1"><FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {form.instructions}</p>
          )}

          {/* Tool list */}
          <div className="flex flex-wrap gap-1 mt-2">
            {form.selectedTools.map(tool => (
              <Badge key={tool} variant="outline" className="text-[10px]">
                {PALLIATIVE_TOOL_LABELS[tool].name}
              </Badge>
            ))}
          </div>

          {/* Completed results summary */}
          {isCompleted && Object.keys(form.toolResults).length > 0 && (
            <div className="mt-3 space-y-2">
              <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border', ewsBadge.bg)}>
                <div className={cn('w-4 h-4 rounded-full', worstEws === 'merah' ? 'bg-red-500' : worstEws === 'kuning' ? 'bg-amber-500' : 'bg-emerald-500')} />
                <div>
                  <p className={cn('text-sm font-bold', ewsBadge.color)}>{ewsBadge.label}</p>
                </div>
              </div>
              <div className="space-y-1">
                {Object.entries(form.toolResults).map(([toolKey, result]) => (
                  <div key={toolKey} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{PALLIATIVE_TOOL_LABELS[toolKey as PalliativeToolType]?.name || toolKey}</span>
                    <span className={cn('font-bold', result.ewsLevel === 'merah' ? 'text-red-600' : result.ewsLevel === 'kuning' ? 'text-amber-600' : 'text-emerald-600')}>
                      {result.scoreLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Patient Actions */}
        {isPatient && isPending && (
          <div className="px-4 pb-3">
            {inlineScreeningFormId === formId && inlineScreeningType ? (
              /* Inline screening form is active for this form */
              <div className="border border-rose-200 rounded-lg p-3 bg-rose-50/50">
                <InlineScreeningForm
                  screeningType={inlineScreeningType}
                  onSubmit={handleInlineScreeningSubmit}
                  onSaveDraft={(answers) => {
                    // Save draft back to form
                    const currentForm = palliativeScreeningForms.find(f => f.id === formId);
                    if (currentForm) {
                      updatePalliativeScreeningForm(formId, {
                        toolAnswers: { ...currentForm.toolAnswers, [inlineScreeningType]: answers },
                        status: 'in_progress',
                        updatedAt: new Date().toISOString(),
                      });
                    }
                    toast({ title: 'Draft Disimpan', description: `Draft skrining ${inlineScreeningType.toUpperCase()} tersimpan.` });
                  }}
                  initialAnswers={form.toolAnswers[inlineScreeningType] as Record<string, number | string | string[]> | undefined}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs text-muted-foreground"
                  onClick={() => {
                    setInlineScreeningFormId(null);
                    setInlineScreeningType(null);
                  }}
                >
                  Batal
                </Button>
              </div>
            ) : inlineScreeningFormId === formId && !inlineScreeningType ? (
              /* Tool selection for this form */
              <div className="space-y-2">
                <p className="text-xs font-medium text-rose-700">Pilih alat skrining yang ingin diisi:</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {form.selectedTools.map(tool => {
                    const toolInfo = PALLIATIVE_TOOL_LABELS[tool];
                    const alreadyFilled = !!form.toolResults[tool];
                    return (
                      <Button
                        key={tool}
                        size="sm"
                        variant={alreadyFilled ? 'ghost' : 'outline'}
                        className={cn(
                          'h-auto py-2 px-3 text-xs justify-start gap-2',
                          alreadyFilled && 'opacity-60'
                        )}
                        disabled={alreadyFilled}
                        onClick={() => setInlineScreeningType(tool)}
                      >
                        {toolInfo.icon}
                        <span className="font-medium">{toolInfo.name}</span>
                        {alreadyFilled && <Badge className="ml-auto text-[9px] bg-emerald-600">Selesai</Badge>}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs bg-rose-600 hover:bg-rose-700"
                  onClick={() => {
                    // Fill all remaining tools one by one — start with the first unfilled
                    const nextTool = form.selectedTools.find(t => !form.toolResults[t]);
                    if (nextTool) {
                      setInlineScreeningType(nextTool);
                    }
                  }}
                >
                  <HeartPulse className="w-3.5 h-3.5 mr-1" />
                  Isi Semua
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => setInlineScreeningFormId(null)}
                >
                  Batal
                </Button>
              </div>
            ) : (
              /* Default: Show button to start inline screening */
              <Button
                size="sm"
                className="w-full h-8 text-xs bg-rose-600 hover:bg-rose-700"
                onClick={() => setInlineScreeningFormId(formId)}
              >
                <HeartPulse className="w-3.5 h-3.5 mr-1" />
                Isi Skrining Paliatif
              </Button>
            )}
          </div>
        )}

        {/* Doctor view - completed summary */}
        {isDoctor && isCompleted && (
          <div className="px-4 pb-3">
            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">Skrining Paliatif Telah Diselesaikan</p>
              <p className={cn('font-medium', ewsBadge.color)}>EWS: {ewsBadge.label}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs mt-2"
              onClick={() => {
                setActivePalliativeFormId(formId);
                setActivePanel('palliative-screening');
              }}
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              Lihat Detail
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ── Render message status icon ─────────────────────────────────────────

  const renderMessageStatus = (status: string, isOwn: boolean) => {
    if (!isOwn) return null;
    if (status === 'read') return <CheckCheck className="w-3.5 h-3.5 text-primary" />;
    if (status === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />;
    return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  // ── Render: Doctor List Card (Patient View) ────────────────────────────

  const renderDoctorCard = (doctor: DoctorWithProfile) => {
    const profile = doctor.doctorProfile;
    if (!profile) return null;

    const existingConsultation = getConsultationForDoctor(doctor.id);
    const online = isDoctorOnline(doctor.id);
    const isCreating = creatingConsultation === doctor.id;
    const lastMessage = existingConsultation?.messages?.[existingConsultation.messages.length - 1];

    return (
      <div
        key={doctor.id}
        className={cn(
          'p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all duration-200 cursor-pointer group',
          activeConsultation?.doctorId === doctor.id && 'ring-2 ring-primary/30 bg-primary/5'
        )}
        onClick={() => {
          if (existingConsultation) {
            openConsultation(existingConsultation);
          }
        }}
      >
        <div className="flex gap-3">
          <div className="relative shrink-0">
            <Avatar className="w-12 h-12">
              <AvatarImage src={doctor.avatar || undefined} alt={doctor.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {doctor.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card',
                online ? 'bg-emerald-500' : 'bg-gray-400'
              )}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-foreground truncate">{doctor.name}</h3>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5">
                  {SPECIALIZATION_LABELS[profile.specialization] || profile.specialization}
                </Badge>
              </div>
              {lastMessage && (
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatTime(lastMessage.createdAt)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span className="text-[11px] font-medium text-foreground">{profile.rating.toFixed(1)}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {formatFee(profile.consultationFee)}
              </span>
            </div>

            {existingConsultation ? (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {lastMessage?.content?.startsWith('__PRESCRIPTION__') ? <span className="flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> E-Resep Dokter</span> : lastMessage?.content?.startsWith('__PALLIATIVE__') ? <span className="flex items-center gap-1"><HeartPulse className="w-3.5 h-3.5" /> Skrining Paliatif</span> : lastMessage?.content?.startsWith('__SCREENING__') ? <span className="flex items-center gap-1"><ClipboardCheck className="w-3.5 h-3.5" /> Form Skrining</span> : lastMessage?.content || 'Belum ada pesan'}
              </p>
            ) : (
              <Button
                size="sm"
                className="mt-2 h-7 text-xs font-medium"
                disabled={isCreating}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartChat(doctor);
                }}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Memulai...
                  </>
                ) : (
                  'Mulai Chat'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Render: Patient Consultation Card (Doctor View) ────────────────────

  const renderPatientCard = (consultation: Consultation) => {
    const patient = consultation.patient;
    const lastMessage = consultation.messages?.[consultation.messages.length - 1];
    const isActive = activeConsultation?.id === consultation.id;

    return (
      <div
        key={consultation.id}
        className={cn(
          'p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all duration-200 cursor-pointer',
          isActive && 'ring-2 ring-primary/30 bg-primary/5'
        )}
        onClick={() => openConsultation(consultation)}
      >
        <div className="flex gap-3">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={patient?.avatar || undefined} alt={patient?.name || ''} />
            <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-semibold text-sm">
              {patient?.name?.charAt(0).toUpperCase() || 'P'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm text-foreground truncate">{patient?.name || 'Pasien'}</h3>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant={consultation.status === 'active' ? 'default' : 'secondary'}
                  className="text-[10px] px-1.5 py-0"
                >
                  {consultation.status === 'active' ? 'Aktif' : consultation.status === 'completed' ? 'Selesai' : 'Menunggu'}
                </Badge>
              </div>
            </div>
            {lastMessage && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {lastMessage.content?.startsWith('__PRESCRIPTION__') ? <span className="flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> E-Resep</span> : lastMessage.content?.startsWith('__PALLIATIVE__') ? <span className="flex items-center gap-1"><HeartPulse className="w-3.5 h-3.5" /> Skrining Paliatif</span> : lastMessage.content?.startsWith('__SCREENING__') ? <span className="flex items-center gap-1"><ClipboardCheck className="w-3.5 h-3.5" /> Skrining</span> : lastMessage.content}
              </p>
            )}
            <span className="text-[10px] text-muted-foreground">
              {formatTime(consultation.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ── Render: Chat Header ────────────────────────────────────────────────

  const renderChatHeader = () => {
    if (!activeConsultation) return null;

    const otherUser = isDoctor
      ? activeConsultation.patient
      : activeDoctor;

    const specialization = !isDoctor && activeDoctor?.doctorProfile
      ? SPECIALIZATION_LABELS[activeDoctor.doctorProfile.specialization]
      : undefined;

    const online = !isDoctor && activeDoctor ? isDoctorOnline(activeDoctor.id) : false;

    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={handleBackToList}>
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="relative shrink-0">
          <Avatar className="w-10 h-10">
            <AvatarImage src={otherUser?.avatar || undefined} alt={otherUser?.name || ''} />
            <AvatarFallback className={cn(
              'font-semibold text-sm',
              isDoctor ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'
            )}>
              {otherUser?.name?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          {!isDoctor && (
            <div className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card',
              online ? 'bg-emerald-500' : 'bg-gray-400'
            )} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-sm text-foreground truncate">{otherUser?.name || 'User'}</h3>
            {activeConsultation && palliativePatients.some(p => p.patientId === activeConsultation.patientId) && (
              <Badge className="text-[9px] bg-rose-100 text-rose-700 border border-rose-300 gap-1 shrink-0">
                <HeartPulse className="w-2.5 h-2.5" />
                Monitoring Paliatif
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {!isDoctor && (
              <>
                <span className={cn('text-[11px] font-medium', online ? 'text-emerald-600' : 'text-muted-foreground')}>
                  {online ? 'Online' : 'Offline'}
                </span>
                {specialization && (
                  <>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[11px] text-muted-foreground">{specialization}</span>
                  </>
                )}
              </>
            )}
            {isDoctor && (
              <>
                <span className="text-[11px] text-muted-foreground">Pasien</span>
                {activeConsultation && palliativePatients.some(p => p.patientId === activeConsultation.patientId) && (
                  <>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <Select
                      value={palliativePatients.find(p => p.patientId === activeConsultation.patientId)?.monitoringStatus || 'monitoring_aktif'}
                      onValueChange={(val) => {
                        const patient = palliativePatients.find(p => p.patientId === activeConsultation.patientId);
                        if (patient) {
                          useStore.getState().updatePalliativePatient(patient.id, {
                            monitoringStatus: val as PalliativeMonitoringStatus,
                            updatedAt: new Date().toISOString(),
                          });
                          toast({ title: 'Status Diperbarui', description: `Status monitoring diubah ke ${val.replace(/_/g, ' ')}.` });
                        }
                      }}
                    >
                      <SelectTrigger className="h-5 text-[10px] w-auto border-0 p-0 gap-0.5 bg-transparent hover:bg-muted/50 rounded px-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monitoring_aktif">Monitoring Aktif</SelectItem>
                        <SelectItem value="stabil">Stabil</SelectItem>
                        <SelectItem value="membutuhkan_home_visit">Membutuhkan Home Visit</SelectItem>
                        <SelectItem value="membutuhkan_telekonsultasi">Membutuhkan Telekonsultasi</SelectItem>
                        <SelectItem value="membutuhkan_rujukan">Membutuhkan Rujukan</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Doctor action buttons */}
        {isDoctor && activeConsultation && (
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              size="sm"
              className="h-8 text-xs gap-1 bg-teal-600 hover:bg-teal-700"
              onClick={handleOpenScreeningDialog}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kirim Form Skrining</span>
              <span className="sm:hidden">Skrining</span>
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1 bg-rose-600 hover:bg-rose-700"
              onClick={handleOpenPalliativeDialog}
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Skrining Paliatif</span>
              <span className="sm:hidden">Paliatif</span>
            </Button>
            {!palliativePatients.some(p => p.patientId === activeConsultation.patientId) && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1 border-rose-300 text-rose-600 hover:bg-rose-50"
                onClick={() => {
                  setMarkingData({
                    primaryDiagnosis: '',
                    secondaryDiagnosis: '',
                    initialPPS: 60,
                    diseaseCategory: '',
                    reasonForPalliative: '',
                    doctorNotes: '',
                  });
                  setShowPalliativeMarkingDialog(true);
                }}
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Jadikan Pasien Monitoring Paliatif</span>
                <span className="sm:hidden">Monitoring</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={handleOpenMedicalRecordDialog}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rekam Medis</span>
              <span className="sm:hidden">RM</span>
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={handleOpenPrescriptionDialog}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">E-Resep</span>
              <span className="sm:hidden">Resep</span>
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ── Render: Messages Area ──────────────────────────────────────────────

  const renderMessages = () => {
    if (!activeConsultation) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">
              {isDoctor ? 'Pilih Pasien' : 'Pilih Dokter'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {isDoctor
                ? 'Pilih konsultasi pasien untuk memulai chat'
                : 'Pilih dokter dari daftar untuk memulai konsultasi chat'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-1">
        {messages.map((msg, index) => {
          const isOwn = msg.senderId === currentUser?.id;
          const isSystem = msg.senderId === 'system';
          const prevMsg = messages[index - 1];
          const showDateSeparator = index === 0 || (prevMsg && isDifferentDay(msg.createdAt, prevMsg.createdAt));

          // Check if this is a prescription message
          const prescriptionMatch = msg.content?.match(/^__PRESCRIPTION__(.+)__$/);
          const isPrescriptionMsg = !!prescriptionMatch;

          // Check if this is a screening message
          const screeningMatch = msg.content?.match(/^__SCREENING__(.+)__$/);
          const isScreeningMsg = !!screeningMatch;

          // Check if this is a palliative screening message
          const palliativeMatch = msg.content?.match(/^__PALLIATIVE__(.+)__$/);
          const isPalliativeMsg = !!palliativeMatch;

          return (
            <div key={msg.id}>
              {showDateSeparator && (
                <div className="flex items-center justify-center py-3">
                  <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {formatDate(msg.createdAt)}
                  </span>
                </div>
              )}

              {isSystem ? (
                <div className="flex items-center justify-center py-2">
                  <span className="text-[11px] text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg text-center max-w-[85%]">
                    {msg.content}
                  </span>
                </div>
              ) : isPalliativeMsg && palliativeMatch ? (
                <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                  {renderPalliativeCard(palliativeMatch[1])}
                </div>
              ) : isScreeningMsg && screeningMatch ? (
                <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                  {renderScreeningCard(screeningMatch[1])}
                </div>
              ) : isPrescriptionMsg && prescriptionMatch ? (
                <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                  {renderPrescriptionCard(prescriptionMatch[1])}
                </div>
              ) : (
                <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[75%] sm:max-w-[65%] rounded-2xl px-3.5 py-2',
                      isOwn
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-card border border-border text-card-foreground rounded-bl-md'
                    )}
                  >
                    <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                    <div className={cn('flex items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
                      <span className={cn('text-[10px]', isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {formatTime(msg.createdAt)}
                      </span>
                      {renderMessageStatus(msg.status, isOwn)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    );
  };

  // ── Render: Message Input ──────────────────────────────────────────────

  const renderMessageInput = () => {
    if (!activeConsultation) return null;

    return (
      <div className="border-t border-border bg-card/80 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              ref={messageInputRef}
              value={messageInput}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ketik pesan..."
              className="h-9 text-sm rounded-full border-border bg-background pr-2"
            />
          </div>
          <Button
            size="icon"
            className="shrink-0 h-9 w-9 rounded-full"
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    );
  };

  // ── Render: E-Prescription Dialog (Doctor) ─────────────────────────────

  const renderPrescriptionDialog = () => (
    <Dialog open={showPrescriptionDialog} onOpenChange={setShowPrescriptionDialog}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            Buat E-Resep
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
          {rxItems.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Belum ada obat ditambahkan. Klik tombol di bawah untuk menambahkan.
            </div>
          )}

          {rxItems.map((item, index) => {
            const selectedMed = DEMO_MEDICINES.find((m) => m.id === item.medicineId);
            return (
              <div key={index} className="border rounded-lg p-3 space-y-3 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveRxItem(index)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Obat</Label>
                  <Select
                    value={item.medicineId}
                    onValueChange={(val) => handleRxItemChange(index, 'medicineId', val)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Pilih obat..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DEMO_MEDICINES.map((med) => (
                        <SelectItem key={med.id} value={med.id}>
                          {med.name} - {formatFee(med.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedMed && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Dosis</Label>
                      <Input
                        value={item.dosage}
                        onChange={(e) => handleRxItemChange(index, 'dosage', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Frekuensi</Label>
                      <Input
                        value={item.frequency}
                        onChange={(e) => handleRxItemChange(index, 'frequency', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Durasi</Label>
                      <Input
                        value={item.duration}
                        onChange={(e) => handleRxItemChange(index, 'duration', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Jumlah</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleRxItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1"
            onClick={handleAddRxItem}
          >
            <Plus className="w-4 h-4" />
            Tambah Obat
          </Button>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => setShowPrescriptionDialog(false)}>
            Batal
          </Button>
          <Button
            onClick={handleSendPrescription}
            disabled={rxItems.length === 0 || rxItems.every((i) => !i.medicineId)}
          >
            Kirim E-Resep
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Render: Medical Record Dialog (Doctor) ─────────────────────────────

  const renderMedicalRecordDialog = () => {
    const existingMR = activeConsultation
      ? medicalRecords.find((mr) => mr.consultationId === activeConsultation.id)
      : null;

    return (
      <Dialog open={showMedicalRecordDialog} onOpenChange={setShowMedicalRecordDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Rekam Medis
              {existingMR?.rmNumber && (
                <Badge variant="outline" className="text-xs font-mono">{existingMR.rmNumber}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Diagnosis</Label>
              <Textarea
                value={mrDiagnosis}
                onChange={(e) => setMrDiagnosis(e.target.value)}
                placeholder="Masukkan diagnosis..."
                className="min-h-[60px] text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Gejala (Symptoms)</Label>
              <Textarea
                value={mrSymptoms}
                onChange={(e) => setMrSymptoms(e.target.value)}
                placeholder="Masukkan gejala..."
                className="min-h-[60px] text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Pengobatan (Treatment)</Label>
              <Textarea
                value={mrTreatment}
                onChange={(e) => setMrTreatment(e.target.value)}
                placeholder="Masukkan pengobatan..."
                className="min-h-[60px] text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Catatan (Notes)</Label>
              <Textarea
                value={mrNotes}
                onChange={(e) => setMrNotes(e.target.value)}
                placeholder="Catatan tambahan..."
                className="min-h-[60px] text-sm"
              />
            </div>

            {existingMR && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Status:</span>
                <Badge variant={existingMR.status === 'selesai' ? 'default' : 'secondary'} className="text-[10px]">
                  {existingMR.status === 'selesai' ? 'Selesai' : existingMR.status === 'draft' ? 'Draft' : 'Ditinjau'}
                </Badge>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setShowMedicalRecordDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveMedicalRecord}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // ── Screening Dialog (Doctor View) ──────────────────────────────────────

  const renderScreeningDialogUI = () => (
    <Dialog open={showScreeningDialog} onOpenChange={setShowScreeningDialog}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-teal-600" />
            Kirim Skrining Komprehensif Telemedicine
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
          <p className="text-sm text-muted-foreground">
            Pilih modul skrining yang akan dikirim kepada pasien. Modul wajib sudah terpilih secara default.
          </p>

          {/* Module Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SCREENING_MODULES.map((mod) => {
              const isSelected = selectedModules.includes(mod.id);
              const isRequired = mod.isRequired;
              return (
                <button
                  key={mod.id}
                  onClick={() => !isRequired && handleToggleModule(mod.id)}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all',
                    isSelected
                      ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500'
                      : 'border-border hover:border-teal-300 hover:bg-teal-50/50',
                    isRequired && 'cursor-default'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      'w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0',
                      isSelected ? 'bg-teal-500 border-teal-500' : 'border-muted-foreground'
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        <span className="mr-1">{MODULE_ICON_MAP[mod.id]}</span>
                        {mod.name}
                        {isRequired && <Badge variant="secondary" className="text-[9px] ml-1.5">Wajib</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                      <span className="text-[10px] text-muted-foreground">~{mod.estimatedMinutes} menit</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Instructions */}
          <div>
            <Label className="text-sm font-medium">Instruksi Khusus (Opsional)</Label>
            <Textarea
              className="mt-1"
              placeholder="Tambahkan instruksi untuk pasien..."
              value={screeningInstructions}
              onChange={(e) => setScreeningInstructions(e.target.value)}
            />
          </div>

          {/* Deadline */}
          <div>
            <Label className="text-sm font-medium">Batas Waktu Pengisian (Opsional)</Label>
            <Input
              type="datetime-local"
              className="mt-1"
              value={screeningDeadline}
              onChange={(e) => setScreeningDeadline(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => setShowScreeningDialog(false)}>
            Batal
          </Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700"
            onClick={handleSendScreening}
            disabled={selectedModules.length === 0}
          >
            <Send className="w-4 h-4 mr-1" />
            Kirim ({selectedModules.length} modul)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Render: Left Panel (Patient - Doctor List) ─────────────────────────

  const renderPatientLeftPanel = () => (
    <div className={cn('flex flex-col border-r border-border bg-card h-full', showChatArea ? 'hidden lg:flex' : 'flex')}>
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-foreground text-base">Chat Dokter</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Konsultasi dengan dokter pilihan Anda</p>
      </div>

      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari dokter..."
            className="h-8 text-xs pl-8 rounded-lg bg-background"
          />
        </div>
      </div>

      <div className="px-3 pb-2">
        <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                'whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200',
                activeFilter === tab.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {filteredDoctors.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Tidak ada dokter ditemukan</p>
          </div>
        ) : (
          filteredDoctors.map((doctor) => renderDoctorCard(doctor as DoctorWithProfile))
        )}
      </div>
    </div>
  );

  // ── Render: Palliative Screening Dialog (Doctor) ────────────────────────

  const renderPalliativeDialogUI = () => (
    <Dialog open={showPalliativeDialog} onOpenChange={setShowPalliativeDialog}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-600" />
            Kirim Skrining Paliatif
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
          <div>
            <Label className="text-sm font-medium mb-2 block">Pilih Alat Skrining Paliatif</Label>
            <p className="text-xs text-muted-foreground mb-3">Pilih alat skrining yang ingin dikirim ke pasien:</p>
            <div className="space-y-2">
              {(Object.entries(PALLIATIVE_TOOL_LABELS) as [PalliativeToolType, typeof PALLIATIVE_TOOL_LABELS[PalliativeToolType]][]).map(([toolKey, tool]) => (
                <div
                  key={toolKey}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    selectedPalliativeTools.includes(toolKey)
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-border hover:border-rose-300 hover:bg-rose-50/50'
                  )}
                  onClick={() => handleTogglePalliativeTool(toolKey)}
                >
                  <Checkbox
                    checked={selectedPalliativeTools.includes(toolKey)}
                    onCheckedChange={() => handleTogglePalliativeTool(toolKey)}
                  />
                  <div className={cn('w-8 h-8 rounded-md flex items-center justify-center', selectedPalliativeTools.includes(toolKey) ? 'bg-rose-600 text-white' : 'bg-muted text-muted-foreground')}>
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">Instruksi Tambahan (Opsional)</Label>
            <Textarea
              placeholder="Contoh: Mohon isi semua alat skrining paliatif berikut..."
              value={palliativeInstructions}
              onChange={(e) => setPalliativeInstructions(e.target.value)}
              className="min-h-[80px] text-sm"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPalliativeDialog(false)}
          >
            Batal
          </Button>
          <Button
            size="sm"
            className="bg-rose-600 hover:bg-rose-700"
            onClick={handleSendPalliativeScreening}
            disabled={selectedPalliativeTools.length === 0}
          >
            <HeartPulse className="w-4 h-4 mr-1" />
            Kirim Skrining Paliatif ({selectedPalliativeTools.length} alat)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Render: Left Panel (Doctor - Patient Consultation List) ────────────

  const renderDoctorLeftPanel = () => (
    <div className={cn('flex flex-col border-r border-border bg-card h-full', showChatArea ? 'hidden lg:flex' : 'flex')}>
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-foreground text-base">Konsultasi Pasien</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Daftar konsultasi aktif dan selesai</p>
      </div>

      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pasien..."
            className="h-8 text-xs pl-8 rounded-lg bg-background"
          />
        </div>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {doctorConsultations.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Belum ada konsultasi</p>
          </div>
        ) : (
          doctorConsultations
            .filter((c) => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return c.patient?.name?.toLowerCase().includes(q);
            })
            .map((consultation) => renderPatientCard(consultation))
        )}
      </div>
    </div>
  );

  // ── Render: Right Panel ────────────────────────────────────────────────

  const renderRightPanel = () => (
    <div className={cn('flex flex-col h-full bg-background', !showChatArea ? 'hidden lg:flex' : 'flex')}>
      {renderChatHeader()}
      {renderMessages()}
      {renderMessageInput()}
    </div>
  );

  // ── Palliative Marking Dialog (Doctor View) ─────────────────────────────

  const renderPalliativeMarkingDialog = () => (
    <Dialog open={showPalliativeMarkingDialog} onOpenChange={setShowPalliativeMarkingDialog}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-rose-600" />
            Jadikan Pasien Monitoring Paliatif
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
            <p className="text-xs text-rose-700">
              Dengan menandai pasien ini sebagai pasien monitoring paliatif, data pasien akan otomatis tersinkronisasi dengan Modul Monitoring Paliatif. Pasien akan menerima pemantauan berkala dan skrining rutin.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Diagnosis Utama <span className="text-red-500">*</span>
            </Label>
            <Input
              value={markingData.primaryDiagnosis}
              onChange={(e) => setMarkingData({ ...markingData, primaryDiagnosis: e.target.value })}
              placeholder="Masukkan diagnosis utama..."
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Diagnosis Penyerta</Label>
            <Input
              value={markingData.secondaryDiagnosis}
              onChange={(e) => setMarkingData({ ...markingData, secondaryDiagnosis: e.target.value })}
              placeholder="Diagnosis penyerta (opsional)..."
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Tingkat PPS Awal</Label>
            <Select
              value={String(markingData.initialPPS)}
              onValueChange={(val) => setMarkingData({ ...markingData, initialPPS: Number(val) })}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Pilih tingkat PPS..." />
              </SelectTrigger>
              <SelectContent>
                {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10].map(val => (
                  <SelectItem key={val} value={String(val)}>{val}%</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Kategori Penyakit</Label>
            <Select
              value={markingData.diseaseCategory}
              onValueChange={(val) => setMarkingData({ ...markingData, diseaseCategory: val })}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Pilih kategori penyakit..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Kanker">Kanker</SelectItem>
                <SelectItem value="Gagal Jantung">Gagal Jantung</SelectItem>
                <SelectItem value="PPOK">PPOK</SelectItem>
                <SelectItem value="Stroke">Stroke</SelectItem>
                <SelectItem value="Sirosis Hepatis">Sirosis Hepatis</SelectItem>
                <SelectItem value="Gagal Ginjal">Gagal Ginjal</SelectItem>
                <SelectItem value="Lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Alasan Masuk Program Paliatif</Label>
            <Textarea
              value={markingData.reasonForPalliative}
              onChange={(e) => setMarkingData({ ...markingData, reasonForPalliative: e.target.value })}
              placeholder="Jelaskan alasan pasien memerlukan monitoring paliatif..."
              className="min-h-[60px] text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Catatan Dokter</Label>
            <Textarea
              value={markingData.doctorNotes}
              onChange={(e) => setMarkingData({ ...markingData, doctorNotes: e.target.value })}
              placeholder="Catatan tambahan..."
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => setShowPalliativeMarkingDialog(false)}>
            Batal
          </Button>
          <Button
            onClick={handleConfirmPalliativeMarking}
            disabled={!markingData.primaryDiagnosis.trim()}
            className="bg-rose-600 hover:bg-rose-700"
          >
            <Shield className="w-4 h-4 mr-1" />
            Tandai sebagai Pasien Paliatif
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Main Render ────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-xl overflow-hidden border border-border shadow-sm">
      {/* Left panel */}
      <div className="w-full lg:w-80 xl:w-96 shrink-0">
        {isDoctor ? renderDoctorLeftPanel() : renderPatientLeftPanel()}
      </div>

      {/* Right panel - Chat area */}
      <div className="flex-1">
        {renderRightPanel()}
      </div>

      {/* Dialogs (Doctor View) */}
      {isDoctor && renderPrescriptionDialog()}
      {isDoctor && renderMedicalRecordDialog()}
      {isDoctor && renderScreeningDialogUI()}
      {isDoctor && renderPalliativeDialogUI()}
      {isDoctor && renderPalliativeMarkingDialog()}
    </div>
  );
}