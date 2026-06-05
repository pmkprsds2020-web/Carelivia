'use client';

import { useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { Sidebar } from '@/components/telemedicine/sidebar';
import { HomeDashboard } from '@/components/telemedicine/home-dashboard';
import { ChatPanel } from '@/components/telemedicine/chat-panel';
import { VideoCallPanel } from '@/components/telemedicine/video-call-panel';
import { PharmacyPanel } from '@/components/telemedicine/pharmacy-panel';
import { HomeCarePanel } from '@/components/telemedicine/homecare-panel';
import { MedicalRecordsPanel } from '@/components/telemedicine/medical-records';
import { DoctorPanel } from '@/components/telemedicine/doctor-panel';
import { AdminDashboard } from '@/components/telemedicine/admin-dashboard';
import { AdminPricingPanel } from '@/components/telemedicine/admin-pricing-panel';
import { NotificationsPanel } from '@/components/telemedicine/notifications-panel';
import { PaymentsPanel } from '@/components/telemedicine/payments-panel';
import { ReportsPanel } from '@/components/telemedicine/reports-panel';
import { ProfilePanel } from '@/components/telemedicine/profile-panel';
import { PharmacistPanel } from '@/components/telemedicine/pharmacist-panel';
import { HomeCareStaffPanel } from '@/components/telemedicine/homecare-staff-panel';
import { LoginPage } from '@/components/telemedicine/login-page';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

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
      if (dashData?.doctors) setDoctors(dashData.doctors);
      if (dashData?.articles) setArticles(dashData.articles);
      if (medData?.medicines) setMedicines(medData.medicines);
      if (hcData?.services) setHomeCareServices(hcData.services);
      if (notifData?.notifications) setNotifications(notifData.notifications);
      if (consultData?.consultations) setConsultations(consultData.consultations);
      if (hcBookings?.bookings) setHomeCareBookings(hcBookings.bookings);
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
      case 'home': return <HomeDashboard />;
      case 'chat': return <ChatPanel />;
      case 'video': return <VideoCallPanel />;
      case 'pharmacy': return <PharmacyPanel />;
      case 'homecare': return <HomeCarePanel />;
      case 'medical-records': return <MedicalRecordsPanel />;
      case 'doctor-panel': return <DoctorPanel />;
      case 'pharmacist-panel': return <PharmacistPanel />;
      case 'homecare-staff-panel': return <HomeCareStaffPanel />;
      case 'admin': return <AdminDashboard />;
      case 'admin-pricing': return <AdminPricingPanel />;
      case 'notifications': return <NotificationsPanel />;
      case 'payments': return <PaymentsPanel />;
      case 'reports': return <ReportsPanel />;
      case 'profile': return <ProfilePanel />;
      default: return <HomeDashboard />;
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
              {activePanel === 'chat' && 'Chat Dokter'}
              {activePanel === 'video' && 'Video Call'}
              {activePanel === 'pharmacy' && 'Apotek Online'}
              {activePanel === 'homecare' && 'Home Care'}
              {activePanel === 'medical-records' && 'Rekam Medis'}
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
                {currentUser.name.charAt(0)}
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
