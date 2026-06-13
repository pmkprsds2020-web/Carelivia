'use client';

import { useStore } from '@/lib/store';
import type { ActivePanel, UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
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
  Package,
  Truck,
  DollarSign,
  LogOut,
  Users,
  Activity,
  ClipboardCheck,
  HeartPulse,
  Monitor,
  Watch,
  ClipboardList,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
}

interface NavItem {
  id: ActivePanel;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  roles: UserRole[]; // which roles can see this item
  section?: string;
}

// Define all possible nav items with role restrictions
const allNavItems: NavItem[] = [
  // ─── PATIENT NAV ITEMS ────────────────────────────────
  { id: 'home', label: 'Dashboard', icon: <Home className="w-5 h-5" />, roles: ['patient'] },
  { id: 'chat', label: 'Chat Dokter', icon: <MessageCircle className="w-5 h-5" />, roles: ['patient'], section: 'Layanan' },
  { id: 'video', label: 'Video Call', icon: <Video className="w-5 h-5" />, roles: ['patient'] },
  { id: 'pharmacy', label: 'Apotek Online', icon: <Pill className="w-5 h-5" />, roles: ['patient'] },
  { id: 'homecare', label: 'Home Care', icon: <Heart className="w-5 h-5" />, roles: ['patient'] },
  { id: 'medical-records', label: 'Rekam Medis', icon: <FileText className="w-5 h-5" />, roles: ['patient'], section: 'Kesehatan' },
  { id: 'screening', label: 'Skrining Kesehatan', icon: <ClipboardCheck className="w-5 h-5" />, roles: ['patient'], section: 'Kesehatan' },
  { id: 'patient-paliatif', label: 'Pelayanan Paliatif', icon: <HeartPulse className="w-5 h-5" />, roles: ['patient'], section: 'Kesehatan' },
  { id: 'social-needs-screening', label: 'Skrining Sosial', icon: <ClipboardList className="w-5 h-5" />, roles: ['patient'], section: 'Kesehatan' },
  { id: 'payments', label: 'Pembayaran', icon: <CreditCard className="w-5 h-5" />, roles: ['patient'], section: 'Lainnya' },
  { id: 'notifications', label: 'Notifikasi', icon: <Bell className="w-5 h-5" />, roles: ['patient'] },
  { id: 'profile', label: 'Profil', icon: <User className="w-5 h-5" />, roles: ['patient'] },

  // ─── DOCTOR NAV ITEMS ─────────────────────────────────
  { id: 'doctor-panel', label: 'Dashboard', icon: <Stethoscope className="w-5 h-5" />, roles: ['doctor'] },
  { id: 'chat', label: 'Chat Pasien', icon: <MessageCircle className="w-5 h-5" />, roles: ['doctor'], section: 'Layanan' },
  { id: 'video', label: 'Video Call', icon: <Video className="w-5 h-5" />, roles: ['doctor'] },
  { id: 'medical-records', label: 'Rekam Medis', icon: <FileText className="w-5 h-5" />, roles: ['doctor'], section: 'Kesehatan' },
  { id: 'screening', label: 'Skrining Pasien', icon: <ClipboardCheck className="w-5 h-5" />, roles: ['doctor'], section: 'Kesehatan' },
  { id: 'palliative-screening', label: 'Skrining Paliatif', icon: <HeartPulse className="w-5 h-5" />, roles: ['doctor'], section: 'Kesehatan' },
  { id: 'palliative-monitoring', label: 'Monitoring Paliatif', icon: <Monitor className="w-5 h-5" />, roles: ['doctor'], section: 'Kesehatan' },
  { id: 'rvsm', label: 'Remote Vital Sign', icon: <Watch className="w-5 h-5" />, roles: ['doctor'], section: 'Kesehatan' },
  { id: 'social-needs-screening', label: 'Skrining Kebutuhan Sosial', icon: <ClipboardList className="w-5 h-5" />, roles: ['doctor'], section: 'Kesehatan' },
  { id: 'payments', label: 'Pendapatan', icon: <CreditCard className="w-5 h-5" />, roles: ['doctor'], section: 'Lainnya' },
  { id: 'notifications', label: 'Notifikasi', icon: <Bell className="w-5 h-5" />, roles: ['doctor'] },
  { id: 'profile', label: 'Profil', icon: <User className="w-5 h-5" />, roles: ['doctor'] },

  // ─── ADMIN NAV ITEMS ──────────────────────────────────
  { id: 'admin', label: 'Dashboard', icon: <Shield className="w-5 h-5" />, roles: ['admin'] },
  { id: 'admin-pricing', label: 'Kelola Harga', icon: <DollarSign className="w-5 h-5" />, roles: ['admin'], section: 'Manajemen' },
  { id: 'doctor-panel', label: 'Kelola Dokter', icon: <Stethoscope className="w-5 h-5" />, roles: ['admin'] },
  { id: 'homecare', label: 'Home Care', icon: <Heart className="w-5 h-5" />, roles: ['admin'] },
  { id: 'pharmacist-panel', label: 'Kelola Apotek', icon: <Package className="w-5 h-5" />, roles: ['admin'] },
  { id: 'homecare-staff-panel', label: 'Kelola Petugas', icon: <Truck className="w-5 h-5" />, roles: ['admin'] },
  { id: 'admin-users', label: 'Kelola Pengguna', icon: <Users className="w-5 h-5" />, roles: ['admin'] },
  { id: 'reports', label: 'Laporan', icon: <BarChart3 className="w-5 h-5" />, roles: ['admin'], section: 'Lainnya' },
  { id: 'payments', label: 'Pembayaran', icon: <CreditCard className="w-5 h-5" />, roles: ['admin'] },
  { id: 'notifications', label: 'Notifikasi', icon: <Bell className="w-5 h-5" />, roles: ['admin'] },
  { id: 'profile', label: 'Profil', icon: <User className="w-5 h-5" />, roles: ['admin'] },

  // ─── PHARMACIST NAV ITEMS ─────────────────────────────
  { id: 'pharmacist-panel', label: 'Dashboard', icon: <Package className="w-5 h-5" />, roles: ['pharmacist'] },
  { id: 'notifications', label: 'Notifikasi', icon: <Bell className="w-5 h-5" />, roles: ['pharmacist'] },
  { id: 'profile', label: 'Profil', icon: <User className="w-5 h-5" />, roles: ['pharmacist'] },

  // ─── HOMECARE STAFF NAV ITEMS ─────────────────────────
  { id: 'homecare-staff-panel', label: 'Dashboard', icon: <Activity className="w-5 h-5" />, roles: ['homecare_staff'] },
  { id: 'notifications', label: 'Notifikasi', icon: <Bell className="w-5 h-5" />, roles: ['homecare_staff'] },
  { id: 'profile', label: 'Profil', icon: <User className="w-5 h-5" />, roles: ['homecare_staff'] },
];

// Role display configuration
const roleConfig: Record<UserRole, { label: string; color: string; bgColor: string }> = {
  patient: { label: 'Pasien', color: 'text-[#2D8C7A]', bgColor: 'bg-[#2D8C7A]/8' },
  doctor: { label: 'Dokter', color: 'text-[#2D8C7A]', bgColor: 'bg-[#2D8C7A]/8' },
  admin: { label: 'Admin', color: 'text-[#D9B26F]', bgColor: 'bg-[#D9B26F]/8' },
  pharmacist: { label: 'Apoteker', color: 'text-[#2D8C7A]', bgColor: 'bg-[#2D8C7A]/8' },
  homecare_staff: { label: 'Petugas HC', color: 'text-[#6DB8A8]', bgColor: 'bg-[#6DB8A8]/8' },
};

export function Sidebar({ collapsed }: SidebarProps) {
  const { activePanel, setActivePanel, setSidebarOpen, unreadCount, cart, currentUser, setCurrentUser, setActivePanel: setPanel } = useStore();

  const userRole = currentUser?.role || 'patient';
  const roleInfo = roleConfig[userRole];

  // Filter nav items based on user role
  const navItems = allNavItems.filter((item) => item.roles.includes(userRole));

  const handleNavClick = (id: ActivePanel) => {
    setActivePanel(id);
    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPanel('home');
  };

  return (
    <aside
      className={cn(
        'h-screen bg-card border-r border-border flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl carelivia-gradient flex items-center justify-center shrink-0 shadow-md overflow-hidden">
          <Image
            src="/carelivia-icon.png"
            alt="CareLivia"
            width={40}
            height={40}
            className="w-8 h-8 object-contain p-0.5"
          />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-foreground whitespace-nowrap">CareLivia</h1>
            <p className="text-[10px] text-muted-foreground whitespace-nowrap">Telepalliative Care</p>
          </div>
        )}
      </div>

      {/* User Role Badge */}
      {!collapsed && currentUser && (
        <div className="px-3 pt-3">
          <div className={cn('rounded-lg px-3 py-2 flex items-center gap-2', roleInfo.bgColor)}>
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0', 
              userRole === 'patient' ? 'bg-[#6DB8A8]' :
              userRole === 'doctor' ? 'bg-[#2D8C7A]' :
              userRole === 'admin' ? 'bg-[#D9B26F]' :
              userRole === 'pharmacist' ? 'bg-[#2D8C7A]' :
              'bg-[#6DB8A8]'
            )}>
              {currentUser.name.replace(/^(dr\.|drg\.)\s*/i, '').charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{currentUser.name}</p>
              <p className={cn('text-[10px] font-medium', roleInfo.color)}>{roleInfo.label}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-2 px-2">
        {navItems.map((item, index) => {
          // Show section header if this is the first item with this section
          const prevItem = index > 0 ? navItems[index - 1] : null;
          const isNewSection = item.section && item.section !== (prevItem?.section ?? null);
          const sectionHeader = isNewSection && !collapsed ? (
            <div key={`section-${item.section}`} className="px-3 pt-4 pb-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {item.section}
              </span>
            </div>
          ) : null;

          const isActive = activePanel === item.id;
          
          // For cart badge on pharmacy item
          const badgeCount = item.id === 'pharmacy' ? cart.length : 
                            item.id === 'notifications' ? unreadCount : 0;

          return (
            <div key={`${item.id}-${item.roles.join(',')}-${index}`}>
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
                    {badgeCount > 0 && (
                      <span className={cn(
                        'min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] font-bold px-1.5',
                        isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                      )}>
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </>
                )}
                {collapsed && badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[9px] font-bold px-1">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Footer with Logout */}
      <div className="border-t border-border">
        {!collapsed && (
          <div className="p-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span>Keluar</span>
            </button>
          </div>
        )}
        {collapsed && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-2 py-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            title="Keluar"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Help Card (only when expanded) */}
      {!collapsed && (
        <div className="p-3 border-t border-border">
          <div className="bg-[#2D8C7A]/5 rounded-lg p-3">
            <p className="text-xs font-semibold text-[#2D8C7A]">Butuh Bantuan?</p>
            <p className="text-[10px] text-muted-foreground mt-1">Hubungi customer service kami 24/7</p>
            <button className="mt-2 w-full text-xs bg-[#2D8C7A] text-white rounded-md py-1.5 font-medium hover:bg-[#1F6B5C] transition-colors">
              Hubungi CS
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
