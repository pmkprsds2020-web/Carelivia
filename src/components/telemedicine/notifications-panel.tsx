'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import type { NotificationType } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Video,
  Heart,
  Pill,
  CreditCard,
  Bell,
  CheckCheck,
  Stethoscope,
  Clock,
  ClipboardCheck,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterTab {
  key: NotificationType | 'all';
  label: string;
}

const filterTabs: FilterTab[] = [
  { key: 'all', label: 'Semua' },
  { key: 'consultation', label: 'Konsultasi' },
  { key: 'chat', label: 'Chat' },
  { key: 'homecare', label: 'Home Care' },
  { key: 'pharmacy', label: 'Farmasi' },
  { key: 'payment', label: 'Pembayaran' },
  { key: 'reminder', label: 'Pengingat' },
];

const typeConfig: Record<NotificationType, { icon: React.ReactNode; bgColor: string; iconColor: string }> = {
  consultation: {
    icon: <Stethoscope className="w-5 h-5" />,
    bgColor: 'bg-emerald-100 dark:bg-emerald-950/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  chat: {
    icon: <MessageCircle className="w-5 h-5" />,
    bgColor: 'bg-sky-100 dark:bg-sky-950/50',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  homecare: {
    icon: <Heart className="w-5 h-5" />,
    bgColor: 'bg-rose-100 dark:bg-rose-950/50',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  pharmacy: {
    icon: <Pill className="w-5 h-5" />,
    bgColor: 'bg-amber-100 dark:bg-amber-950/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  payment: {
    icon: <CreditCard className="w-5 h-5" />,
    bgColor: 'bg-violet-100 dark:bg-violet-950/50',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  reminder: {
    icon: <Clock className="w-5 h-5" />,
    bgColor: 'bg-orange-100 dark:bg-orange-950/50',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  screening: {
    icon: <ClipboardCheck className="w-5 h-5" />,
    bgColor: 'bg-teal-100 dark:bg-teal-950/50',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
  clinical_alert: {
    icon: <AlertTriangle className="w-5 h-5" />,
    bgColor: 'bg-red-100 dark:bg-red-950/50',
    iconColor: 'text-red-600 dark:text-red-400',
  },
};

// NOTE: the `demoNotifications` array (10 fake notifications — "Konsultasi
// Dimulai", "Pembayaran Berhasil" etc., all tagged `userId: 'demo-patient'`
// but merged in UNCONDITIONALLY without any userId filtering) has been
// removed. Every logged-in account, patient or doctor, used to see these
// same 10 fake items mixed into their real notifications. Real ones now
// come exclusively from the store (populated via GET /api/notifications
// for the actual logged-in user — see page.tsx), and "mark as read" now
// calls the real PATCH /api/notifications endpoint instead of only
// mutating local state (which never persisted past a page refresh).

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 7) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function NotificationsPanel() {
  const { notifications, setNotifications, setUnreadCount, currentUser } = useStore();
  const [activeFilter, setActiveFilter] = useState<NotificationType | 'all'>('all');

  // Real notifications only — sorted newest first.
  const allNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return allNotifications;
    return allNotifications.filter((n) => n.type === activeFilter);
  }, [allNotifications, activeFilter]);

  const unreadCount = useMemo(
    () => allNotifications.filter((n) => !n.isRead).length,
    [allNotifications]
  );

  const handleMarkAsRead = async (notifId: string) => {
    // Optimistic local update...
    const updated = allNotifications.map((n) =>
      n.id === notifId ? { ...n, isRead: true } : n
    );
    setNotifications(updated);
    setUnreadCount(updated.filter((n) => !n.isRead).length);

    // ...then persist for real, so it survives a page refresh.
    try {
      const res = await fetch(`/api/notifications?id=${encodeURIComponent(notifId)}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Gagal menandai notifikasi sebagai dibaca');
    } catch (err) {
      console.error('[notifications-panel] markAsRead failed:', err);
      // Revert on failure so the UI doesn't lie about persisted state.
      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter((n) => !n.isRead).length);
    }
  };

  const handleMarkAllRead = async () => {
    const previous = allNotifications;
    const updated = allNotifications.map((n) => ({ ...n, isRead: true }));
    setNotifications(updated);
    setUnreadCount(0);

    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/notifications?userId=${encodeURIComponent(currentUser.id)}&all=true`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Gagal menandai semua notifikasi sebagai dibaca');
    } catch (err) {
      console.error('[notifications-panel] markAllRead failed:', err);
      setNotifications(previous);
      setUnreadCount(previous.filter((n) => !n.isRead).length);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Notifikasi</h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="w-4 h-4 mr-1" />
            Tandai Semua Dibaca
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-1 px-1">
        {filterTabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeFilter === tab.key ? 'default' : 'outline'}
            size="sm"
            className="rounded-full whitespace-nowrap shrink-0"
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.label}
            {tab.key === 'all' && unreadCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1.5 bg-white/20">
                {unreadCount}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Notification List */}
      {filteredNotifications.length === 0 ? (
        <Card className="border-0 bg-muted/50">
          <CardContent className="p-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Tidak ada notifikasi</p>
            <p className="text-muted-foreground text-sm mt-1">
              Notifikasi Anda akan muncul di sini
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {filteredNotifications.map((notif) => {
            const config = typeConfig[notif.type as NotificationType] || typeConfig.reminder;

            return (
              <Card
                key={notif.id}
                className={cn(
                  'border-0 cursor-pointer transition-all duration-200 hover:shadow-sm',
                  !notif.isRead && 'bg-primary/[0.03] border-l-4 border-l-primary'
                )}
                onClick={() => handleMarkAsRead(notif.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', config.bgColor)}>
                      <span className={config.iconColor}>{config.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={cn('text-sm font-semibold', !notif.isRead ? 'text-foreground' : 'text-foreground/80')}>
                              {notif.title}
                            </p>
                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
