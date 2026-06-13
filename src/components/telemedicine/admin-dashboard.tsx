'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Stethoscope,
  MessageCircle,
  CreditCard,
  UserCog,
  Activity,
  BarChart3,
  Settings,
  Star,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const PIE_COLORS = [
  '#0d9488',
  '#f97316',
  '#8b5cf6',
  '#ef4444',
  '#3b82f6',
  '#eab308',
  '#ec4899',
  '#14b8a6',
];

function formatCurrency(amount: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
}

const CONSULTATION_TYPE_LABELS: Record<string, string> = {
  chat: 'Chat',
  video: 'Video',
  audio: 'Audio',
};

const CONSULTATION_STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  waiting: 'outline',
  active: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
};

const PAYMENT_STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  success: 'default',
  failed: 'destructive',
  refunded: 'secondary',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  qris: 'QRIS',
  bank_transfer: 'Transfer Bank',
  va: 'Virtual Account',
  gopay: 'GoPay',
  ovo: 'OVO',
  dana: 'DANA',
  shopeepay: 'ShopeePay',
};

export function AdminDashboard() {
  const { dashboardStats, doctors } = useStore();

  const statsCards = useMemo(() => {
    if (!dashboardStats) {
      return [
        { title: 'Total Pasien', value: '0', icon: <Users className="w-5 h-5" />, color: 'text-teal-600 bg-teal-50' },
        { title: 'Total Dokter', value: '0', icon: <Stethoscope className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50' },
        { title: 'Total Konsultasi', value: '0', icon: <MessageCircle className="w-5 h-5" />, color: 'text-orange-600 bg-orange-50' },
        { title: 'Total Pendapatan', value: 'Rp 0', icon: <CreditCard className="w-5 h-5" />, color: 'text-violet-600 bg-violet-50' },
      ];
    }

    return [
      {
        title: 'Total Pasien',
        value: dashboardStats.totalPatients.toString(),
        icon: <Users className="w-5 h-5" />,
        color: 'text-teal-600 bg-teal-50',
      },
      {
        title: 'Total Dokter',
        value: dashboardStats.totalDoctors.toString(),
        icon: <Stethoscope className="w-5 h-5" />,
        color: 'text-emerald-600 bg-emerald-50',
      },
      {
        title: 'Total Konsultasi',
        value: dashboardStats.totalConsultations.toString(),
        icon: <MessageCircle className="w-5 h-5" />,
        color: 'text-orange-600 bg-orange-50',
      },
      {
        title: 'Total Pendapatan',
        value: formatCurrency(dashboardStats.totalRevenue),
        icon: <CreditCard className="w-5 h-5" />,
        color: 'text-violet-600 bg-violet-50',
      },
    ];
  }, [dashboardStats]);

  const monthlyData = useMemo(() => {
    if (!dashboardStats?.monthlyStats) return [];
    return dashboardStats.monthlyStats.map((s) => ({
      ...s,
      month: s.month.length > 10 ? s.month.substring(0, 3) + ' ' + s.month.substring(s.month.length - 4) : s.month,
    }));
  }, [dashboardStats]);

  const specializationData = useMemo(() => {
    if (!dashboardStats?.doctorSpecializationDistribution) return [];
    return dashboardStats.doctorSpecializationDistribution.map((d) => ({
      name: d.specialization,
      value: d.count,
    }));
  }, [dashboardStats]);

  const topDoctorsData = useMemo(() => {
    if (!dashboardStats?.topDoctors) return [];
    return dashboardStats.topDoctors.map((td) => {
      const doctor = doctors.find((d) => d.id === td.doctorId);
      return {
        ...td,
        specialization: (doctor?.doctorProfile?.specialization) || (td as Record<string, unknown>).specialization as string || '',
        rating: (doctor?.doctorProfile?.rating) || (td as Record<string, unknown>).rating as number || 0,
        avatar: doctor?.avatar || (td as Record<string, unknown>).avatar as string || null,
        consultationCount: td.count || (td as Record<string, unknown>).consultationCount as number || 0,
      };
    });
  }, [dashboardStats, doctors]);

  const recentConsultations = useMemo(() => {
    return dashboardStats?.recentConsultations || [];
  }, [dashboardStats]);

  const recentPayments = useMemo(() => {
    return dashboardStats?.recentPayments || [];
  }, [dashboardStats]);

  const quickActions = [
    { label: 'Kelola User', icon: <UserCog className="w-5 h-5" />, color: 'text-teal-600 bg-teal-50 hover:bg-teal-100' },
    { label: 'Kelola Dokter', icon: <Stethoscope className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
    { label: 'Laporan', icon: <BarChart3 className="w-5 h-5" />, color: 'text-orange-600 bg-orange-50 hover:bg-orange-100' },
    { label: 'Pengaturan', icon: <Settings className="w-5 h-5" />, color: 'text-violet-600 bg-violet-50 hover:bg-violet-100' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Consultation Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              Tren Konsultasi Bulanan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                Belum ada data
              </div>
            ) : (
              <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={{ fill: '#0d9488', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Konsultasi"
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Doctor Specialization Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-emerald-600" />
              Distribusi Spesialisasi Dokter
            </CardTitle>
          </CardHeader>
          <CardContent>
            {specializationData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                Belum ada data
              </div>
            ) : (
              <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={specializationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {specializationData.map((_, index) => (
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
                    formatter={(value: number) => [`${value} dokter`, 'Jumlah']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Consultations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-teal-600" />
              Konsultasi Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentConsultations.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                Belum ada data konsultasi
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <div className="overflow-x-auto table-scroll-wrapper">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Pasien</TableHead>
                      <TableHead className="text-xs">Dokter</TableHead>
                      <TableHead className="text-xs">Tipe</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Tanggal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentConsultations.map((consultation) => (
                      <TableRow key={consultation.id}>
                        <TableCell className="text-xs font-medium">
                          {(consultation.patient as Record<string, unknown> & { name?: string })?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {(() => {
                            const doc = consultation.doctor as Record<string, unknown> | undefined;
                            if (!doc) return 'N/A';
                            if (typeof doc === 'object' && 'user' in doc) {
                              const user = doc.user as Record<string, unknown> & { name?: string };
                              return user?.name || 'N/A';
                            }
                            return (doc as Record<string, unknown> & { name?: string })?.name || 'N/A';
                          })()}
                        </TableCell>
                        <TableCell className="text-xs">
                          {CONSULTATION_TYPE_LABELS[consultation.type] || consultation.type}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={CONSULTATION_STATUS_VARIANTS[consultation.status] || 'outline'} className="text-[10px]">
                            {consultation.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(consultation.createdAt).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-violet-600" />
              Pembayaran Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                Belum ada data pembayaran
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <div className="overflow-x-auto table-scroll-wrapper">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Invoice</TableHead>
                      <TableHead className="text-xs">Jumlah</TableHead>
                      <TableHead className="text-xs">Metode</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Tanggal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-xs font-medium font-mono">
                          {payment.invoiceNumber || payment.id.substring(0, 8)}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {PAYMENT_METHOD_LABELS[payment.method] || payment.method}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={PAYMENT_STATUS_VARIANTS[payment.status] || 'outline'} className="text-[10px]">
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Doctors Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Dokter Terbaik
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topDoctorsData.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Belum ada data dokter
            </div>
          ) : (
            <div className="space-y-3">
              {topDoctorsData.map((doctor, index) => (
                <div
                  key={doctor.doctorId}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    index === 0 ? 'bg-amber-100 text-amber-700' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {doctor.avatar ? (
                      <img src={doctor.avatar} alt={doctor.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      doctor.name.charAt(0)
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{doctor.name}</p>
                    <p className="text-xs text-muted-foreground">{doctor.specialization || 'Umum'}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{doctor.consultationCount}</p>
                      <p className="text-[10px] text-muted-foreground">Konsultasi</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-semibold text-foreground">{doctor.rating.toFixed(1)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Rating</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600" />
            Aksi Cepat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className={`h-auto py-4 px-3 flex flex-col items-center gap-2 ${action.color} border-transparent`}
              >
                {action.icon}
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
