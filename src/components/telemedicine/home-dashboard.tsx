'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  MessageCircle,
  Video,
  Heart,
  Pill,
  FileText,
  CreditCard,
  Star,
  Calendar,
  Clock,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivePanel } from '@/lib/types';

// --- Quick Action Config ---
interface QuickAction {
  id: ActivePanel;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'chat',
    title: 'Chat Dokter',
    description: 'Konsultasi via chat',
    icon: <MessageCircle className="w-6 h-6" />,
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'video',
    title: 'Video Call',
    description: 'Konsultasi via video',
    icon: <Video className="w-6 h-6" />,
    iconBg: 'bg-teal-100 dark:bg-teal-950/50',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
  {
    id: 'homecare',
    title: 'Home Care',
    description: 'Perawatan di rumah',
    icon: <Heart className="w-6 h-6" />,
    iconBg: 'bg-rose-100 dark:bg-rose-950/50',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    id: 'pharmacy',
    title: 'Apotek Online',
    description: 'Beli obat online',
    icon: <Pill className="w-6 h-6" />,
    iconBg: 'bg-amber-100 dark:bg-amber-950/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'medical-records',
    title: 'Rekam Medis',
    description: 'Riwayat kesehatan',
    icon: <FileText className="w-6 h-6" />,
    iconBg: 'bg-sky-100 dark:bg-sky-950/50',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  {
    id: 'payments',
    title: 'Riwayat Pembayaran',
    description: 'Transaksi Anda',
    icon: <CreditCard className="w-6 h-6" />,
    iconBg: 'bg-violet-100 dark:bg-violet-950/50',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
];

// --- Promo Banner Config ---
interface PromoBanner {
  title: string;
  description: string;
  cta: string;
  gradient: string;
  icon: React.ReactNode;
}

const promoBanners: PromoBanner[] = [
  {
    title: 'Konsultasi Gratis Hari Ini',
    description: 'Chat dokter umum tanpa biaya!',
    cta: 'Konsultasi Sekarang',
    gradient: 'from-emerald-500 to-teal-600',
    icon: <Sparkles className="w-8 h-8 text-white/80" />,
  },
  {
    title: 'Diskon 20% Vitamin',
    description: 'Jaga imun tubuh Anda',
    cta: 'Belanja Vitamin',
    gradient: 'from-amber-500 to-orange-500',
    icon: <ShieldCheck className="w-8 h-8 text-white/80" />,
  },
  {
    title: 'Home Care Promo',
    description: 'Layanan perawatan rumah mulai Rp 100.000',
    cta: 'Pesan Home Care',
    gradient: 'from-rose-500 to-pink-600',
    icon: <Heart className="w-8 h-8 text-white/80" />,
  },
];

// --- Doctor Avatar Colors ---
const avatarColors = [
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-sky-500',
  'bg-lime-500',
];

function getAvatarColor(index: number): string {
  return avatarColors[index % avatarColors.length];
}

// --- Helper: Format date in Indonesian ---
function formatIndonesianDate(date: Date): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// --- Greeting based on time ---
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

// =====================================================================
// MAIN COMPONENT
// =====================================================================

export function HomeDashboard() {
  const {
    currentUser,
    doctors,
    articles,
    consultations,
    homeCareBookings,
    setActivePanel,
    setSelectedChatDoctor,
    isLoading,
  } = useStore();

  const [currentPromo, setCurrentPromo] = useState(0);
  const [api, setApi] = useState<ReturnType<typeof Object> | null>(null);

  // Auto-rotate promo carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromo((prev) => (prev + 1) % promoBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Sync carousel with auto-rotation
  useEffect(() => {
    if (api && typeof api === 'object' && 'scrollTo' in api) {
      (api as { scrollTo: (index: number) => void }).scrollTo(currentPromo);
    }
  }, [currentPromo, api]);

  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      setActivePanel(action.id);
    },
    [setActivePanel]
  );

  const handleChatDoctor = useCallback(
    (doctor: typeof doctors[number]) => {
      setSelectedChatDoctor(doctor);
      setActivePanel('chat');
    },
    [setSelectedChatDoctor, setActivePanel]
  );

  // Compute upcoming schedule from consultations & home care bookings
  const upcomingSchedule = (() => {
    const items: {
      id: string;
      type: 'consultation' | 'homecare';
      title: string;
      datetime: string;
      status: string;
      icon: React.ReactNode;
    }[] = [];

    const now = new Date();

    consultations
      .filter((c) => c.status === 'waiting' || c.status === 'active')
      .forEach((c) => {
        const doctorName = c.doctor?.name || 'Dokter';
        items.push({
          id: c.id,
          type: 'consultation',
          title: `Konsultasi dengan ${doctorName}`,
          datetime: c.startTime || c.createdAt,
          status: c.status === 'active' ? 'Aktif' : 'Menunggu',
          icon: <Stethoscope className="w-4 h-4" />,
        });
      });

    homeCareBookings
      .filter(
        (b) =>
          b.status === 'pending' ||
          b.status === 'confirmed' ||
          b.status === 'in_progress' ||
          b.status === 'on_the_way'
      )
      .forEach((b) => {
        const serviceName = b.service?.name || 'Home Care';
        items.push({
          id: b.id,
          type: 'homecare',
          title: serviceName,
          datetime: b.scheduledAt,
          status:
            b.status === 'on_the_way'
              ? 'Dalam Perjalanan'
              : b.status === 'in_progress'
                ? 'Berlangsung'
                : b.status === 'confirmed'
                  ? 'Dikonfirmasi'
                  : 'Menunggu',
          icon: <Heart className="w-4 h-4" />,
        });
      });

    // Sort by datetime, nearest first
    items.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    return items.slice(0, 5);
  })();

  // --- RENDER ---
  return (
    <div className="space-y-6 pb-6">
      {/* ====== 1. WELCOME BANNER ====== */}
      <Card className="medika-gradient border-0 overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                {getGreeting()}, {currentUser?.name?.replace(/^(dr\.|drg\.)\s*/i, '').split(' ')[0] || 'Pasien'}!
              </h2>
              <p className="text-white/80 text-sm md:text-base">
                Apa yang bisa kami bantu hari ini?
              </p>
              <p className="text-white/60 text-xs md:text-sm mt-2">
                {formatIndonesianDate(new Date())}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <svg
                  className="w-9 h-9 text-white/90"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====== 2. QUICK ACTION GRID ====== */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
          {quickActions.map((action) => (
            <Card
              key={action.id}
              className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-0 bg-card group"
              onClick={() => handleQuickAction(action)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110',
                    action.iconBg
                  )}
                >
                  <span className={action.iconColor}>{action.icon}</span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{action.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{action.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ====== 3. PROMO BANNER CAROUSEL ====== */}
      <section>
        <Carousel
          setApi={(apiRef) => setApi(apiRef)}
          opts={{
            align: 'start',
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent>
            {promoBanners.map((banner, index) => (
              <CarouselItem key={index}>
                <Card className={cn('border-0 overflow-hidden bg-gradient-to-r', banner.gradient)}>
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <h3 className="text-lg md:text-xl font-bold text-white">
                          {banner.title}
                        </h3>
                        <p className="text-white/80 text-sm">{banner.description}</p>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-3 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                          onClick={() => {
                            if (index === 1) setActivePanel('pharmacy');
                            else if (index === 2) setActivePanel('homecare');
                            else setActivePanel('chat');
                          }}
                        >
                          {banner.cta}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                      <div className="hidden sm:flex items-center">{banner.icon}</div>
                    </div>
                    {/* Dots indicator */}
                    <div className="flex gap-1.5 mt-4">
                      {promoBanners.map((_, i) => (
                        <button
                          key={i}
                          className={cn(
                            'w-2 h-2 rounded-full transition-all duration-300',
                            i === currentPromo
                              ? 'bg-white w-6'
                              : 'bg-white/40 hover:bg-white/60'
                          )}
                          onClick={() => setCurrentPromo(i)}
                          aria-label={`Go to slide ${i + 1}`}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2 bg-white/20 border-0 text-white hover:bg-white/30 hover:text-white" />
          <CarouselNext className="right-2 bg-white/20 border-0 text-white hover:bg-white/30 hover:text-white" />
        </Carousel>
      </section>

      {/* ====== 4. DOCTORS ONLINE SECTION ====== */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Dokter Online Sekarang</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/80"
            onClick={() => setActivePanel('chat')}
          >
            Lihat Semua
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-0">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center gap-2">
                    <Skeleton className="w-14 h-14 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-8 w-full mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <Card className="border-0 bg-muted/50">
            <CardContent className="p-8 text-center">
              <Stethoscope className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                Belum ada dokter online saat ini
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {doctors.slice(0, 8).map((doctor, index) => {
              const profile = doctor.doctorProfile;
              const isOnline = profile?.isOnline ?? false;
              const initial = doctor.name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();
              const rating = profile?.rating ?? 0;
              const fee = profile?.consultationFee ?? 0;

              return (
                <Card
                  key={doctor.id}
                  className="border-0 hover:shadow-md transition-all duration-200 group"
                >
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="relative">
                      <Avatar className="w-14 h-14">
                        <AvatarFallback
                          className={cn(
                            'text-white font-bold text-sm',
                            getAvatarColor(index)
                          )}
                        >
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full pulse-online" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-sm text-foreground leading-tight">
                        {doctor.name}
                      </p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {({ umum: 'Dokter Umum', anak: 'Dokter Anak', penyakit_dalam: 'Penyakit Dalam', kebidanan: 'Dokter Kebidanan', gigi: 'Dokter Gigi' } as Record<string, string>)[profile?.specialization || 'umum'] || profile?.specialization || 'Umum'}
                      </Badge>
                    </div>
                    {/* Rating */}
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-medium text-foreground">
                        {rating.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ({profile?.reviewCount ?? 0})
                      </span>
                    </div>
                    {/* Fee */}
                    <p className="text-xs text-muted-foreground">
                      Rp {fee.toLocaleString('id-ID')}
                    </p>
                    {/* Chat button */}
                    <Button
                      size="sm"
                      className="w-full mt-1 text-xs h-8"
                      onClick={() => handleChatDoctor(doctor)}
                      disabled={!isOnline}
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1" />
                      Chat
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ====== 5. HEALTH ARTICLES SECTION ====== */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Artikel Kesehatan</h2>
        </div>

        {isLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-0 min-w-[260px] max-w-[280px] shrink-0">
                <Skeleton className="h-28 w-full rounded-t-xl" />
                <CardContent className="p-4">
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <Card className="border-0 bg-muted/50">
            <CardContent className="p-8 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                Belum ada artikel kesehatan
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2 -mx-1 px-1 snap-x snap-mandatory">
            {articles.map((article, index) => {
              const gradients = [
                'from-emerald-400 to-teal-500',
                'from-amber-400 to-orange-500',
                'from-sky-400 to-cyan-500',
                'from-rose-400 to-pink-500',
                'from-violet-400 to-purple-500',
              ];
              const gradient = gradients[index % gradients.length];

              return (
                <Card
                  key={article.id}
                  className="border-0 min-w-[260px] max-w-[280px] shrink-0 snap-start hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden"
                >
                  {/* Colored top section */}
                  <div
                    className={cn(
                      'h-28 bg-gradient-to-br flex items-end p-4',
                      gradient
                    )}
                  >
                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-[10px]">
                      {article.category || 'Kesehatan'}
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-1.5">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{article.author || 'Tim MedikaLink'}</span>
                      <span className="text-border">|</span>
                      <span>{formatDateShort(article.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ====== 6. UPCOMING SCHEDULE SECTION ====== */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Jadwal Mendatang</h2>
        </div>

        {upcomingSchedule.length === 0 ? (
          <Card className="border-0 bg-muted/50">
            <CardContent className="p-8 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                Tidak ada jadwal mendatang
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Mulai konsultasi atau pesan layanan home care
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setActivePanel('chat')}
              >
                Mulai Konsultasi
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingSchedule.map((item) => {
              const statusColor =
                item.status === 'Aktif' || item.status === 'Berlangsung'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : item.status === 'Dalam Perjalanan'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                    : 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400';

              return (
                <Card key={item.id} className="border-0 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        item.type === 'consultation'
                          ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatDateShort(item.datetime)}, {formatTime(item.datetime)}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn('text-[10px] shrink-0', statusColor)}
                    >
                      {item.status}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
