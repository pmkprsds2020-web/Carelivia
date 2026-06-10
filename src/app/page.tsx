'use client';

import { useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { Sidebar } from '@/components/telemedicine/sidebar';
import { LoginPage } from '@/components/telemedicine/login-page';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

// Dynamic imports to reduce initial bundle size and memory usage
const HomeDashboard = dynamic(() => import('@/components/telemedicine/home-dashboard').then(m => ({ default: m.HomeDashboard })), { ssr: false });
const ChatPanel = dynamic(() => import('@/components/telemedicine/chat-panel').then(m => ({ default: m.ChatPanel })), { ssr: false });
const VideoCallPanel = dynamic(() => import('@/components/telemedicine/video-call-panel').then(m => ({ default: m.VideoCallPanel })), { ssr: false });
const PharmacyPanel = dynamic(() => import('@/components/telemedicine/pharmacy-panel').then(m => ({ default: m.PharmacyPanel })), { ssr: false });
const HomeCarePanel = dynamic(() => import('@/components/telemedicine/homecare-panel').then(m => ({ default: m.HomeCarePanel })), { ssr: false });
const MedicalRecordsPanel = dynamic(() => import('@/components/telemedicine/medical-records').then(m => ({ default: m.MedicalRecordsPanel })), { ssr: false });
const DoctorPanel = dynamic(() => import('@/components/telemedicine/doctor-panel').then(m => ({ default: m.DoctorPanel })), { ssr: false });
const AdminDashboard = dynamic(() => import('@/components/telemedicine/admin-dashboard').then(m => ({ default: m.AdminDashboard })), { ssr: false });
const AdminPricingPanel = dynamic(() => import('@/components/telemedicine/admin-pricing-panel').then(m => ({ default: m.AdminPricingPanel })), { ssr: false });
const NotificationsPanel = dynamic(() => import('@/components/telemedicine/notifications-panel').then(m => ({ default: m.NotificationsPanel })), { ssr: false });
const PaymentsPanel = dynamic(() => import('@/components/telemedicine/payments-panel').then(m => ({ default: m.PaymentsPanel })), { ssr: false });
const ReportsPanel = dynamic(() => import('@/components/telemedicine/reports-panel').then(m => ({ default: m.ReportsPanel })), { ssr: false });
const ProfilePanel = dynamic(() => import('@/components/telemedicine/profile-panel').then(m => ({ default: m.ProfilePanel })), { ssr: false });
const PharmacistPanel = dynamic(() => import('@/components/telemedicine/pharmacist-panel').then(m => ({ default: m.PharmacistPanel })), { ssr: false });
const HomeCareStaffPanel = dynamic(() => import('@/components/telemedicine/homecare-staff-panel').then(m => ({ default: m.HomeCareStaffPanel })), { ssr: false });
const ScreeningPanel = dynamic(() => import('@/components/telemedicine/screening-panel').then(m => ({ default: m.ScreeningPanel })), { ssr: false });
const PalliativeScreeningPanel = dynamic(() => import('@/components/telemedicine/palliative-screening-panel').then(m => ({ default: m.PalliativeScreeningPanel })), { ssr: false });
const PalliativeMonitoringPanel = dynamic(() => import('@/components/telemedicine/palliative-monitoring-panel').then(m => ({ default: m.PalliativeMonitoringPanel })), { ssr: false });
const RvsmPanel = dynamic(() => import('@/components/telemedicine/rvsm-panel').then(m => ({ default: m.RvsmPanel })), { ssr: false });

function PanelLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-t-transparent border-primary rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Memuat...</span>
      </div>
    </div>
  );
}

export default function TelemedicineApp() {
  const { 
    activePanel, 
    setCurrentUser, 
    setDoctors, 
    setMedicines, 
    setHomeCareServices,
    setHomeCareBookings,
    setConsultations,
    setNotifications,
    setArticles,
    setDashboardStats,
    sidebarOpen, 
    setSidebarOpen,
    currentUser,
  } = useStore();

  // Load data from API in the background (non-blocking)
  const loadDataInBackground = useCallback(async () => {
    try {
      // Seed data first (ignore errors)
      await fetch('/api/seed').catch(() => {});
      
      // Load all data in parallel (ignore individual failures)
      const results = await Promise.allSettled([
        fetch('/api/dashboard').then(r => r.json()),
        fetch('/api/medicines').then(r => r.json()),
        fetch('/api/homecare').then(r => r.json()),
        fetch('/api/notifications?userId=default').then(r => r.json()),
        fetch('/api/consultations').then(r => r.json()),
        fetch('/api/homecare?type=bookings').then(r => r.json()),
      ]);

      const [dashData, medData, hcData, notifData, consultData, hcBookings] = results.map(r => 
        r.status === 'fulfilled' ? r.value : null
      );

      if (dashData?.stats) setDashboardStats(dashData.stats);
      if (dashData?.doctors && dashData.doctors.length > 0) setDoctors(dashData.doctors);
      if (dashData?.articles && dashData.articles.length > 0) setArticles(dashData.articles);
      if (medData?.medicines && medData.medicines.length > 0) setMedicines(medData.medicines);
      if (hcData?.services && hcData.services.length > 0) setHomeCareServices(hcData.services);
      if (notifData?.notifications && notifData.notifications.length > 0) setNotifications(notifData.notifications);
      if (consultData?.consultations && consultData.consultations.length > 0) setConsultations(consultData.consultations);
      if (hcBookings?.bookings && hcBookings.bookings.length > 0) setHomeCareBookings(hcBookings.bookings);
    } catch (error) {
      // Silently fail - components have their own demo data
      console.log('Background data load skipped:', error);
    }
  }, [setDashboardStats, setDoctors, setArticles, setMedicines, setHomeCareServices, setNotifications, setConsultations, setHomeCareBookings]);

  useEffect(() => {
    loadDataInBackground();
  }, [loadDataInBackground]);

  // Show login page if no user is logged in
  if (!currentUser) {
    return <LoginPage />;
  }

  const renderPanel = () => {
    switch (activePanel) {
      case 'home': return <Suspense fallback={<PanelLoader />}><HomeDashboard /></Suspense>;
      case 'chat': return <Suspense fallback={<PanelLoader />}><ChatPanel /></Suspense>;
      case 'video': return <Suspense fallback={<PanelLoader />}><VideoCallPanel /></Suspense>;
      case 'pharmacy': return <Suspense fallback={<PanelLoader />}><PharmacyPanel /></Suspense>;
      case 'homecare': return <Suspense fallback={<PanelLoader />}><HomeCarePanel /></Suspense>;
      case 'medical-records': return <Suspense fallback={<PanelLoader />}><MedicalRecordsPanel /></Suspense>;
      case 'screening': return <Suspense fallback={<PanelLoader />}><ScreeningPanel /></Suspense>;
      case 'palliative-screening': return <Suspense fallback={<PanelLoader />}><PalliativeScreeningPanel /></Suspense>;
      case 'palliative-monitoring': return <Suspense fallback={<PanelLoader />}><PalliativeMonitoringPanel /></Suspense>;
      case 'rvsm': return <Suspense fallback={<PanelLoader />}><RvsmPanel /></Suspense>;
      case 'doctor-panel': return <Suspense fallback={<PanelLoader />}><DoctorPanel /></Suspense>;
      case 'pharmacist-panel': return <Suspense fallback={<PanelLoader />}><PharmacistPanel /></Suspense>;
      case 'homecare-staff-panel': return <Suspense fallback={<PanelLoader />}><HomeCareStaffPanel /></Suspense>;
      case 'admin': return <Suspense fallback={<PanelLoader />}><AdminDashboard /></Suspense>;
      case 'admin-pricing': return <Suspense fallback={<PanelLoader />}><AdminPricingPanel /></Suspense>;
      case 'notifications': return <Suspense fallback={<PanelLoader />}><NotificationsPanel /></Suspense>;
      case 'payments': return <Suspense fallback={<PanelLoader />}><PaymentsPanel /></Suspense>;
      case 'reports': return <Suspense fallback={<PanelLoader />}><ReportsPanel /></Suspense>;
      case 'profile': return <Suspense fallback={<PanelLoader />}><ProfilePanel /></Suspense>;
      default: return <Suspense fallback={<PanelLoader />}><HomeDashboard /></Suspense>;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-16'
      }`}>
        <Sidebar collapsed={!sidebarOpen} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">
              {activePanel === 'home' && 'Dashboard'}
              {activePanel === 'chat' && (currentUser?.role === 'doctor' ? 'Chat Pasien' : 'Chat Dokter')}
              {activePanel === 'video' && 'Video Call'}
              {activePanel === 'pharmacy' && 'Apotek Online'}
              {activePanel === 'homecare' && 'Home Care'}
              {activePanel === 'medical-records' && 'Rekam Medis'}
              {activePanel === 'screening' && (currentUser?.role === 'doctor' ? 'Skrining Pasien' : 'Skrining Kesehatan')}
              {activePanel === 'palliative-screening' && 'Skrining Paliatif'}
              {activePanel === 'palliative-monitoring' && 'Monitoring Paliatif'}
              {activePanel === 'rvsm' && 'Remote Vital Sign Monitoring'}
              {activePanel === 'doctor-panel' && 'Panel Dokter'}
              {activePanel === 'pharmacist-panel' && 'Panel Apotek'}
              {activePanel === 'homecare-staff-panel' && 'Panel Petugas'}
              {activePanel === 'admin' && 'Admin Dashboard'}
              {activePanel === 'admin-pricing' && 'Kelola Harga & Tarif'}
              {activePanel === 'notifications' && 'Notifikasi'}
              {activePanel === 'payments' && 'Pembayaran'}
              {activePanel === 'reports' && 'Laporan & Analitik'}
              {activePanel === 'profile' && 'Profil Saya'}
            </h1>
          </div>
          {currentUser && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {currentUser.name.replace(/^(dr\.|drg\.)\s*/i, '').charAt(0)}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{currentUser.name}</span>
            </div>
          )}
        </header>

        {/* Panel content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {renderPanel()}
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-background/80 backdrop-blur-md px-4 py-2 text-center">
          <p className="text-xs text-muted-foreground">
            © 2025 MedikaLink — Telemedicine Terintegrasi · Sesuai Standar SATUSEHAT Kemenkes
          </p>
        </footer>
      </div>
    </div>
  );
}
