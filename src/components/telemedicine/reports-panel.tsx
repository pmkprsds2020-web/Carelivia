'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Stethoscope,
  Pill,
  Heart,
  FileDown,
  FileSpreadsheet,
  Users,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

// Demo chart data
const dailyConsultations = [
  { day: 'Sen', jumlah: 12 },
  { day: 'Sel', jumlah: 18 },
  { day: 'Rab', jumlah: 15 },
  { day: 'Kam', jumlah: 22 },
  { day: 'Jum', jumlah: 20 },
  { day: 'Sab', jumlah: 8 },
  { day: 'Min', jumlah: 5 },
];

const revenueData = [
  { month: 'Jul', pendapatan: 12500000 },
  { month: 'Ags', pendapatan: 15800000 },
  { month: 'Sep', pendapatan: 14200000 },
  { month: 'Okt', pendapatan: 18500000 },
  { month: 'Nov', pendapatan: 21000000 },
  { month: 'Des', pendapatan: 19500000 },
  { month: 'Jan', pendapatan: 23400000 },
];

const homeCareDistribution = [
  { name: 'Perawatan Luka', value: 35 },
  { name: 'Infus', value: 20 },
  { name: 'Injeksi', value: 15 },
  { name: 'Kunjungan Dokter', value: 12 },
  { name: 'Fisioterapi', value: 10 },
  { name: 'Lainnya', value: 8 },
];

const topDoctors = [
  { name: 'dr. Andi Pratama', specialization: 'Penyakit Dalam', konsultasi: 45 },
  { name: 'dr. Siti Rahayu', specialization: 'Kebidanan', konsultasi: 38 },
  { name: 'dr. Budi Santoso', specialization: 'Anak', konsultasi: 32 },
  { name: 'drg. Maya Putri', specialization: 'Gigi', konsultasi: 28 },
  { name: 'dr. Rina Wati', specialization: 'Umum', konsultasi: 25 },
];

const consultationTable = [
  { id: 1, patient: 'Rina Wulandari', doctor: 'dr. Andi Pratama', type: 'Video', date: '10 Jan 2025', status: 'Selesai', amount: 200000 },
  { id: 2, patient: 'Ahmad Fauzi', doctor: 'dr. Siti Rahayu', type: 'Chat', date: '09 Jan 2025', status: 'Selesai', amount: 150000 },
  { id: 3, patient: 'Dewi Sartika', doctor: 'dr. Budi Santoso', type: 'Audio', date: '08 Jan 2025', status: 'Selesai', amount: 125000 },
  { id: 4, patient: 'Bambang S.', doctor: 'dr. Andi Pratama', type: 'Video', date: '07 Jan 2025', status: 'Selesai', amount: 200000 },
  { id: 5, patient: 'Siti Aminah', doctor: 'drg. Maya Putri', type: 'Chat', date: '06 Jan 2025', status: 'Aktif', amount: 175000 },
];

const medicineTable = [
  { id: 1, name: 'Paracetamol 500mg', category: 'Bebas', sold: 250, revenue: 1250000 },
  { id: 2, name: 'Amoxicillin 500mg', category: 'Resep', sold: 180, revenue: 2160000 },
  { id: 3, name: 'Omeprazole 20mg', category: 'Resep', sold: 150, revenue: 1800000 },
  { id: 4, name: 'Vitamin C 1000mg', category: 'Vitamin', sold: 320, revenue: 960000 },
  { id: 5, name: 'Antasida Sirup', category: 'Bebas', sold: 120, revenue: 720000 },
];

const homeCareTable = [
  { id: 1, patient: 'Rina Wulandari', service: 'Perawatan Luka', staff: 'Nana S.', date: '10 Jan 2025', status: 'Selesai', amount: 150000 },
  { id: 2, patient: 'Ahmad Fauzi', service: 'Infus', staff: 'Dedi R.', date: '09 Jan 2025', status: 'Selesai', amount: 200000 },
  { id: 3, patient: 'Siti Aminah', service: 'Kunjungan Dokter', staff: 'Nana S.', date: '08 Jan 2025', status: 'Dalam Proses', amount: 250000 },
];

const PIE_COLORS = ['#0d9488', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

function formatCurrency(amount: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
}

type DatePreset = '7' | '30' | '90' | '365';

export function ReportsPanel() {
  const { toast } = useToast();
  const [datePreset, setDatePreset] = useState<DatePreset>('30');

  const statsCards = useMemo(() => [
    {
      title: 'Total Konsultasi',
      value: '156',
      change: '+12%',
      icon: <Stethoscope className="w-5 h-5" />,
      bgColor: 'bg-emerald-100 dark:bg-emerald-950/50',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Pendapatan',
      value: formatCurrency(23400000),
      change: '+18%',
      icon: <TrendingUp className="w-5 h-5" />,
      bgColor: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Home Care',
      value: '42',
      change: '+8%',
      icon: <Heart className="w-5 h-5" />,
      bgColor: 'bg-rose-100 dark:bg-rose-950/50',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
    {
      title: 'Pasien Aktif',
      value: '89',
      change: '+5%',
      icon: <Users className="w-5 h-5" />,
      bgColor: 'bg-sky-100 dark:bg-sky-950/50',
      iconColor: 'text-sky-600 dark:text-sky-400',
    },
  ], []);

  const handleExportPDF = () => {
    toast({ title: 'Ekspor PDF', description: 'Laporan sedang disiapkan dalam format PDF...' });
  };

  const handleExportExcel = () => {
    toast({ title: 'Ekspor Excel', description: 'Laporan sedang disiapkan dalam format Excel...' });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header with date filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Laporan & Analitik</h2>
          <p className="text-sm text-muted-foreground">Ringkasan performa dan data operasional</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 hari terakhir</SelectItem>
              <SelectItem value="30">30 hari terakhir</SelectItem>
              <SelectItem value="90">3 bulan terakhir</SelectItem>
              <SelectItem value="365">1 tahun terakhir</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileDown className="w-4 h-4 mr-1" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.bgColor)}>
                  <span className={stat.iconColor}>{stat.icon}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-sm font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-emerald-600">{stat.change}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Consultations Bar Chart */}
        <Card className="border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Konsultasi Harian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyConsultations}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="jumlah" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Area Chart */}
        <Card className="border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Pendapatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}jt`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Pendapatan']}
                />
                <Area type="monotone" dataKey="pendapatan" stroke="#0d9488" fill="#0d9488" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Home Care Pie Chart */}
        <Card className="border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" />
              Layanan Home Care
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={homeCareDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {homeCareDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Persentase']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {homeCareDistribution.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground">{item.name} ({item.value}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Doctors Horizontal Bar */}
        <Card className="border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" />
              Dokter Teraktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topDoctors.map((doc, i) => {
                const maxConsult = Math.max(...topDoctors.map((d) => d.konsultasi));
                const width = (doc.konsultasi / maxConsult) * 100;
                const colors = ['bg-amber-500', 'bg-gray-400', 'bg-orange-600', 'bg-primary', 'bg-primary'];

                return (
                  <div key={doc.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold',
                          i < 3 ? colors[i] : 'bg-muted text-muted-foreground'
                        )}>
                          {i + 1}
                        </span>
                        <div>
                          <span className="font-medium text-foreground">{doc.name}</span>
                          <span className="text-muted-foreground text-xs ml-1.5">({doc.specialization})</span>
                        </div>
                      </div>
                      <span className="font-semibold text-sm text-foreground">{doc.konsultasi}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', i < 3 ? colors[i] : 'bg-primary')}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consultation Report Table */}
        <Card className="border-0 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" />
              Laporan Konsultasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Pasien</TableHead>
                    <TableHead className="text-xs">Tipe</TableHead>
                    <TableHead className="text-xs">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultationTable.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs font-medium">{row.patient}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px]">{row.type}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{formatCurrency(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Medicine Sales Table */}
        <Card className="border-0 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Pill className="w-4 h-4 text-primary" />
              Penjualan Obat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Obat</TableHead>
                    <TableHead className="text-xs">Terjual</TableHead>
                    <TableHead className="text-xs">Pendapatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medicineTable.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs font-medium">{row.name}</TableCell>
                      <TableCell className="text-xs">{row.sold}</TableCell>
                      <TableCell className="text-xs">{formatCurrency(row.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Home Care Report Table */}
        <Card className="border-0 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" />
              Laporan Home Care
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Pasien</TableHead>
                    <TableHead className="text-xs">Layanan</TableHead>
                    <TableHead className="text-xs">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {homeCareTable.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs font-medium">{row.patient}</TableCell>
                      <TableCell className="text-xs">{row.service}</TableCell>
                      <TableCell className="text-xs">{formatCurrency(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
