'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import type { MedicalRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  FlaskConical,
  Pill,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Activity,
  Droplets,
  Heart,
  Ruler,
  AlertTriangle,
  Calendar,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Demo data for medical records
const demoConsultations = [
  {
    id: 'c1',
    date: '2025-01-10',
    doctorName: 'dr. Andi Pratama',
    specialization: 'Penyakit Dalam',
    diagnosis: 'Gastritis Akut',
    treatment: 'Obat maag (Antasida), diet ringan, hindari makanan pedas',
    status: 'completed',
    notes: 'Pasien mengeluh nyeri ulu hati sejak 3 hari. Direkomendasikan endoskopi jika kambuh.',
  },
  {
    id: 'c2',
    date: '2024-12-28',
    doctorName: 'dr. Siti Rahayu',
    specialization: 'Kebidanan',
    diagnosis: 'Kehamilan Trimester 2 - Normal',
    treatment: 'Suplemen asam folat, vitamin B6, kontrol rutin tiap bulan',
    status: 'completed',
    notes: 'USG menunjukkan perkembangan janin normal. Berat janin sesuai usia kehamilan.',
  },
  {
    id: 'c3',
    date: '2024-12-15',
    doctorName: 'dr. Budi Santoso',
    specialization: 'Anak',
    diagnosis: 'ISPA (Infeksi Saluran Pernapasan Atas)',
    treatment: 'Paracetamol sirup, istirahat cukup, minum air putih banyak',
    status: 'completed',
    notes: 'Demam sudah turun setelah 2 hari. Batuk masih ada, kontrol 1 minggu.',
  },
  {
    id: 'c4',
    date: '2024-11-20',
    doctorName: 'dr. Andi Pratama',
    specialization: 'Penyakit Dalam',
    diagnosis: 'Diabetes Mellitus Tipe 2',
    treatment: 'Metformin 500mg 2x sehari, diet rendah gula, olahraga teratur',
    status: 'active',
    notes: 'Gula darah puasa 180 mg/dL. Perlu monitoring rutin dan evaluasi HbA1c.',
  },
];

const demoLabResults = [
  {
    id: 'l1',
    date: '2025-01-10',
    testName: 'Darah Lengkap',
    result: 'Hb: 12.5 g/dL, Leukosit: 7.800/μL, Trombosit: 250.000/μL',
    referenceRange: 'Hb: 12-16 g/dL, Leukosit: 4.000-11.000/μL, Trombosit: 150.000-400.000/μL',
    status: 'normal',
  },
  {
    id: 'l2',
    date: '2025-01-10',
    testName: 'Gula Darah Puasa',
    result: '180 mg/dL',
    referenceRange: '70-100 mg/dL',
    status: 'high',
  },
  {
    id: 'l3',
    date: '2024-12-28',
    testName: 'USG Obstetri',
    result: 'Janin tunggal hidup, usia kehamilan 22 minggu, posisi kepala',
    referenceRange: 'Normal sesuai usia kehamilan',
    status: 'normal',
  },
  {
    id: 'l4',
    date: '2024-12-15',
    testName: 'Throat Swab',
    result: 'Streptococcus pyogenes: Negatif',
    referenceRange: 'Negatif',
    status: 'normal',
  },
  {
    id: 'l5',
    date: '2024-11-20',
    testName: 'HbA1c',
    result: '8.2%',
    referenceRange: '< 5.7% (normal), 5.7-6.4% (pre-diabetes), >= 6.5% (diabetes)',
    status: 'high',
  },
];

const demoPrescriptions = [
  {
    id: 'p1',
    date: '2025-01-10',
    doctor: 'dr. Andi Pratama',
    items: [
      { name: 'Antasida', dosage: '3x sehari setelah makan', quantity: 30 },
      { name: 'Omeprazole 20mg', dosage: '1x sehari sebelum sarapan', quantity: 14 },
    ],
    status: 'active',
  },
  {
    id: 'p2',
    date: '2024-12-28',
    doctor: 'dr. Siti Rahayu',
    items: [
      { name: 'Asam Folat 400mcg', dosage: '1x sehari', quantity: 30 },
      { name: 'Vitamin B6', dosage: '1x sehari', quantity: 30 },
    ],
    status: 'completed',
  },
  {
    id: 'p3',
    date: '2024-12-15',
    doctor: 'dr. Budi Santoso',
    items: [
      { name: 'Paracetamol Sirup 120mg/5ml', dosage: '3x sehari jika demam', quantity: 60 },
    ],
    status: 'completed',
  },
  {
    id: 'p4',
    date: '2024-11-20',
    doctor: 'dr. Andi Pratama',
    items: [
      { name: 'Metformin 500mg', dosage: '2x sehari setelah makan', quantity: 60 },
    ],
    status: 'active',
  },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function MedicalRecordsPanel() {
  const { currentUser } = useStore();
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  const patientInfo = useMemo(() => ({
    bloodType: currentUser?.patientProfile?.bloodType || 'O+',
    allergies: currentUser?.patientProfile?.allergies || 'Penisilin, Alergi debu',
    medicalHistory: currentUser?.patientProfile?.medicalHistory || 'Diabetes Mellitus Tipe 2, Gastritis kronis',
    height: currentUser?.patientProfile?.height || 165,
    weight: currentUser?.patientProfile?.weight || 62,
  }), [currentUser]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Rekam Medis Elektronik</h2>
          <p className="text-sm text-muted-foreground">Riwayat kesehatan dan hasil pemeriksaan</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0 w-fit">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
          Terintegrasi SATUSEHAT
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Patient Info Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Informasi Pasien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {currentUser?.name?.charAt(0) || 'P'}
                </div>
                <div>
                  <p className="font-semibold text-sm">{currentUser?.name || 'Pasien'}</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.nik || '-'}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
                    <Droplets className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Golongan Darah</p>
                    <p className="text-sm font-semibold">{patientInfo.bloodType}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Alergi</p>
                    <p className="text-sm font-semibold">{patientInfo.allergies}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/50 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Riwayat Penyakit</p>
                    <p className="text-sm font-semibold">{patientInfo.medicalHistory}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                    <Ruler className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tinggi / Berat</p>
                    <p className="text-sm font-semibold">{patientInfo.height} cm / {patientInfo.weight} kg</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="consultations" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="consultations" className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Riwayat Konsultasi</span>
                <span className="sm:hidden">Konsultasi</span>
              </TabsTrigger>
              <TabsTrigger value="lab" className="flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4" />
                <span className="hidden sm:inline">Hasil Lab</span>
                <span className="sm:hidden">Lab</span>
              </TabsTrigger>
              <TabsTrigger value="prescriptions" className="flex items-center gap-1.5">
                <Pill className="w-4 h-4" />
                <span className="hidden sm:inline">Resep Obat</span>
                <span className="sm:hidden">Resep</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Riwayat Konsultasi */}
            <TabsContent value="consultations" className="space-y-3 mt-0">
              {demoConsultations.map((record) => (
                <Card key={record.id} className="border-0 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-foreground">{record.diagnosis}</p>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-[10px]',
                                record.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              )}
                            >
                              {record.status === 'active' ? 'Aktif' : 'Selesai'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {record.doctorName} - {record.specialization}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {formatDate(record.date)}
                          </p>
                        </div>
                      </div>
                      {expandedRecord === record.id ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                      )}
                    </div>

                    {expandedRecord === record.id && (
                      <div className="mt-4 pt-3 border-t border-border space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pengobatan</p>
                          <p className="text-sm text-foreground mt-1">{record.treatment}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Catatan Dokter</p>
                          <p className="text-sm text-foreground mt-1">{record.notes}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Tab 2: Hasil Lab */}
            <TabsContent value="lab" className="space-y-3 mt-0">
              {demoLabResults.map((lab) => (
                <Card key={lab.id} className="border-0 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                            lab.status === 'normal'
                              ? 'bg-emerald-100 dark:bg-emerald-950/50'
                              : 'bg-amber-100 dark:bg-amber-950/50'
                          )}
                        >
                          <FlaskConical
                            className={cn(
                              'w-5 h-5',
                              lab.status === 'normal' ? 'text-emerald-600' : 'text-amber-600'
                            )}
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{lab.testName}</p>
                          <p className="text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {formatDate(lab.date)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px] shrink-0',
                          lab.status === 'normal'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                        )}
                      >
                        {lab.status === 'normal' ? 'Normal' : 'Tinggi'}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2 pl-13">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Hasil</p>
                        <p className="text-sm text-foreground font-medium">{lab.result}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Nilai Rujukan</p>
                        <p className="text-xs text-muted-foreground">{lab.referenceRange}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Tab 3: Resep Obat */}
            <TabsContent value="prescriptions" className="space-y-3 mt-0">
              {demoPrescriptions.map((rx) => (
                <Card key={rx.id} className="border-0 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
                          <Pill className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            Resep dari {rx.doctor}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {formatDate(rx.date)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px] shrink-0',
                          rx.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        )}
                      >
                        {rx.status === 'active' ? 'Aktif' : 'Selesai'}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      {rx.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-2.5">
                          <div>
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.dosage}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
