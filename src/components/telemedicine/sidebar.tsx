'use client';

import { useStore } from '@/lib/store';
import type { ActivePanel } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Home,
  MessageCircle,
  Video,
  Pill,
  Heart,
  FileText,
  Stethoscope,
  Shield,
  Bell,
  CreditCard,
  BarChart3,
  User,
  ChevronLeft,
  ChevronRight,
  Package,
  Truck,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
}

interface NavItem {
  id: ActivePanel;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  roles?: string[];
  section?: string;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { activePanel, setActivePanel, setSidebarOpen, unreadCount, cart } = useStore();

  const navItems: NavItem[] = [
    { id: 'home', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { id: 'chat', label: 'Chat Dokter', icon: <MessageCircle className="w-5 h-5" />, section: 'Layanan' },
    { id: 'video', label: 'Video Call', icon: <Video className="w-5 h-5" /> },
    { id: 'pharmacy', label: 'Apotek Online', icon: <Pill className="w-5 h-5" />, badge: cart.length },
    { id: 'homecare', label: 'Home Care', icon: <Heart className="w-5 h-5" /> },
    { id: 'medical-records', label: 'Rekam Medis', icon: <FileText className="w-5 h-5" />, section: 'Kesehatan' },
    { id: 'doctor-panel', label: 'Panel Dokter', icon: <Stethoscope className="w-5 h-5" />, section: 'Panel' },
    { id: 'pharmacist-panel', label: 'Panel Apotek', icon: <Package className="w-5 h-5" /> },
    { id: 'homecare-staff-panel', label: 'Panel Petugas', icon: <Truck className="w-5 h-5" /> },
    { id: 'admin', label: 'Admin', icon: <Shield className="w-5 h-5" /> },
    { id: 'payments', label: 'Pembayaran', icon: <CreditCard className="w-5 h-5" />, section: 'Lainnya' },
    { id: 'reports', label: 'Laporan', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'notifications', label: 'Notifikasi', icon: <Bell className="w-5 h-5" />, badge: unreadCount },
    { id: 'profile', label: 'Profil', icon: <User className="w-5 h-5" /> },
  ];

  const handleNavClick = (id: ActivePanel) => {
    setActivePanel(id);
    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  let currentSection = '';

  return (
    <aside
      className={cn(
        'h-screen bg-card border-r border-border flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl medika-gradient flex items-center justify-center shrink-0 shadow-md">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-foreground whitespace-nowrap">MedikaLink</h1>
            <p className="text-[10px] text-muted-foreground whitespace-nowrap">Telemedicine Terintegrasi</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-2 px-2">
        {navItems.map((item) => {
          // Show section header
          let sectionHeader = null;
          if (item.section && item.section !== currentSection) {
            currentSection = item.section;
            if (!collapsed) {
              sectionHeader = (
                <div key={`section-${item.section}`} className="px-3 pt-4 pb-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {item.section}
                  </span>
                </div>
              );
            }
          } else if (!item.section) {
            currentSection = '';
          }

          const isActive = activePanel === item.id;

          return (
            <div key={item.id}>
              {sectionHeader}
              <button
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.label : undefined}
              >
                <span className={cn('shrink-0', isActive ? 'text-primary-foreground' : 'text-current')}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className={cn(
                        'min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] font-bold px-1.5',
                        isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                      )}>
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[9px] font-bold px-1">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-border">
          <div className="bg-medika-light rounded-lg p-3">
            <p className="text-xs font-semibold text-medika-dark">Butuh Bantuan?</p>
            <p className="text-[10px] text-muted-foreground mt-1">Hubungi customer service kami 24/7</p>
            <button className="mt-2 w-full text-xs bg-primary text-primary-foreground rounded-md py-1.5 font-medium hover:bg-primary/90 transition-colors">
              Hubungi CS
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
