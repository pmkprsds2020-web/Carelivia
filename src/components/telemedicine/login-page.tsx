'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import type { User, DoctorProfile } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Stethoscope, Heart, Shield, ChevronRight, ArrowLeft, Activity, Lock } from 'lucide-react';

type RoleType = 'dokter' | 'pasien' | 'admin';

interface DemoAccount {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  specialization?: string;
  consultationFee?: number;
  phone?: string;
  gender?: string;
}

const roleConfig: Record<RoleType, {
  label: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  gradientFrom: string;
  gradientTo: string;
  badgeColor: string;
  iconBg: string;
  hoverBorder: string;
  selectedBg: string;
}> = {
  dokter: {
    label: 'Dokter',
    description: 'Konsultasi & kelola pasien',
    icon: Stethoscope,
    gradient: 'from-teal-500 to-emerald-600',
    gradientFrom: 'from-teal-500',
    gradientTo: 'to-emerald-600',
    badgeColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    iconBg: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400',
    hoverBorder: 'hover:border-teal-300 dark:hover:border-teal-700',
    selectedBg: 'bg-teal-50 border-teal-300 dark:bg-teal-950/30 dark:border-teal-700',
  },
  pasien: {
    label: 'Pasien',
    description: 'Layanan kesehatan untuk Anda',
    icon: Heart,
    gradient: 'from-rose-400 to-pink-500',
    gradientFrom: 'from-rose-400',
    gradientTo: 'to-pink-500',
    badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    iconBg: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',
    hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-700',
    selectedBg: 'bg-rose-50 border-rose-300 dark:bg-rose-950/30 dark:border-rose-700',
  },
  admin: {
    label: 'Admin',
    description: 'Kelola sistem & laporan',
    icon: Shield,
    gradient: 'from-amber-500 to-orange-500',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-orange-500',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
    hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700',
    selectedBg: 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700',
  },
};

const demoAccounts: Record<RoleType, DemoAccount[]> = {
  dokter: [
    { id: 'doc-sarah', name: 'dr. Sarah Wijaya', email: 'sarah@medikalinku.id', role: 'doctor', specialization: 'umum', consultationFee: 150000, gender: 'Perempuan' },
    { id: 'doc-ahmad', name: 'dr. Ahmad Rizki', email: 'ahmad@medikalinku.id', role: 'doctor', specialization: 'anak', consultationFee: 175000, gender: 'Laki-laki' },
    { id: 'doc-lisa', name: 'dr. Lisa Permata', email: 'lisa@medikalinku.id', role: 'doctor', specialization: 'penyakit_dalam', consultationFee: 200000, gender: 'Perempuan' },
    { id: 'doc-dewi', name: 'dr. Dewi Sartika', email: 'dewi@medikalinku.id', role: 'doctor', specialization: 'kebidanan', consultationFee: 175000, gender: 'Perempuan' },
    { id: 'doc-budi', name: 'drg. Budi Santoso', email: 'budi@medikalinku.id', role: 'doctor', specialization: 'gigi', consultationFee: 200000, gender: 'Laki-laki' },
  ],
  pasien: [
    { id: 'pat-rina', name: 'Rina Wulandari', email: 'rina@mail.com', role: 'patient', phone: '081234567890', gender: 'Perempuan' },
    { id: 'pat-doni', name: 'Doni Pratama', email: 'doni@mail.com', role: 'patient', phone: '081234567891', gender: 'Laki-laki' },
    { id: 'pat-maya', name: 'Maya Sari', email: 'maya@mail.com', role: 'patient', phone: '081234567892', gender: 'Perempuan' },
    { id: 'pat-siti', name: 'Siti Aminah', email: 'siti@mail.com', role: 'patient', phone: '081234567893', gender: 'Perempuan' },
    { id: 'pat-joko', name: 'Joko Widodo', email: 'joko@mail.com', role: 'patient', phone: '081234567894', gender: 'Laki-laki' },
  ],
  admin: [
    { id: 'admin-medika', name: 'Admin MedikaLink', email: 'admin@medikalinku.id', role: 'admin', phone: '081200000000', gender: 'Laki-laki' },
  ],
};

const specializationLabels: Record<string, string> = {
  umum: 'Dokter Umum',
  anak: 'Spesialis Anak',
  penyakit_dalam: 'Spesialis Penyakit Dalam',
  kebidanan: 'Spesialis Kebidanan',
  gigi: 'Dokter Gigi',
};

function getInitials(name: string): string {
  const parts = name.replace(/^(dr\.|drg\.)\s*/i, '').split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

export function LoginPage() {
  const { setCurrentUser } = useStore();
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const handleLogin = (account: DemoAccount) => {
    setIsLoggingIn(true);
    setSelectedAccountId(account.id);

    const now = new Date().toISOString();

    const user: User = {
      id: account.id,
      email: account.email,
      phone: account.phone,
      name: account.name,
      role: account.role,
      avatar: '',
      isVerified: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      gender: account.gender,
    };

    if (account.role === 'doctor' && account.specialization) {
      user.doctorProfile = {
        id: `dp-${account.id}`,
        userId: account.id,
        specialization: account.specialization,
        rating: 4.8,
        reviewCount: Math.floor(Math.random() * 200) + 50,
        consultationFee: account.consultationFee || 150000,
        isOnline: true,
        isAvailable: true,
      } as DoctorProfile;
    }

    // Simulate brief loading for animation
    setTimeout(() => {
      setCurrentUser(user);
    }, 600);
  };

  const handleBack = () => {
    setSelectedRole(null);
    setSelectedAccountId(null);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700" />
      
      {/* Decorative floating circles */}
      <motion.div
        className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-400/10 blur-3xl"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-teal-300/8 blur-2xl"
        animate={{ y: [-20, 20, -20], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        {/* Logo & Branding */}
        <motion.div
          className="text-center mb-8 sm:mb-10"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          {/* Logo icon */}
          <motion.div
            className="mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          >
            <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </motion.div>
          
          <motion.h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Medika<span className="text-emerald-200">Link</span>
          </motion.h1>
          
          <motion.p
            className="mt-2 text-sm sm:text-base text-teal-100/80 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Platform Telemedicine Terintegrasi
          </motion.p>

          <motion.div
            className="mt-3 flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <Badge className="bg-white/15 text-white border-white/20 backdrop-blur-sm hover:bg-white/20 text-xs">
              <Lock className="w-3 h-3 mr-1" />
              Demo Mode
            </Badge>
          </motion.div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          className="w-full max-w-4xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
        >
          <Card className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-0 shadow-2xl shadow-black/20 rounded-2xl overflow-hidden">
            <CardContent className="p-4 sm:p-6 md:p-8">
              {/* Section title */}
              <AnimatePresence mode="wait">
                {selectedRole ? (
                  <motion.div
                    key="account-header"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-3 mb-6"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleBack}
                      className="shrink-0 h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Pilih Akun {roleConfig[selectedRole].label}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Masuk sebagai {roleConfig[selectedRole].label.toLowerCase()}
                      </p>
                    </div>
                    <Badge className={`ml-auto ${roleConfig[selectedRole].badgeColor} border-0 text-xs`}>
                      {demoAccounts[selectedRole].length} akun
                    </Badge>
                  </motion.div>
                ) : (
                  <motion.div
                    key="role-header"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="text-center mb-6 sm:mb-8"
                  >
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                      Masuk ke Akun Anda
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pilih peran untuk melanjutkan
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Role selection cards */}
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
                layout
              >
                {(['dokter', 'pasien', 'admin'] as RoleType[]).map((role, index) => {
                  const config = roleConfig[role];
                  const Icon = config.icon;
                  const isSelected = selectedRole === role;
                  const accountCount = demoAccounts[role].length;

                  return (
                    <motion.div
                      key={role}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`cursor-pointer rounded-xl border-2 transition-colors duration-200 ${
                        isSelected
                          ? config.selectedBg
                          : `bg-card border-border ${config.hoverBorder}`
                      }`}
                      onClick={() => {
                        if (isSelected) {
                          handleBack();
                        } else {
                          setSelectedRole(role);
                          setSelectedAccountId(null);
                        }
                      }}
                    >
                      <div className="p-4 sm:p-5 flex flex-col items-center text-center gap-3">
                        {/* Icon with gradient background */}
                        <div
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}
                        >
                          <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                        </div>

                        <div>
                          <h3 className="font-semibold text-foreground text-sm sm:text-base">
                            {config.label}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {config.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {accountCount} akun
                          </Badge>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                              <ChevronRight className={`w-4 h-4 ${
                                role === 'dokter' ? 'text-teal-500' :
                                role === 'pasien' ? 'text-rose-500' : 'text-amber-500'
                              } rotate-90`} />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Demo accounts list */}
              <AnimatePresence mode="wait">
                {selectedRole && (
                  <motion.div
                    key={`accounts-${selectedRole}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-6 pt-6 border-t border-border">
                      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                        {demoAccounts[selectedRole].map((account, index) => {
                          const isThisSelected = selectedAccountId === account.id;
                          const config = roleConfig[selectedRole];
                          const initials = getInitials(account.name);

                          return (
                            <motion.div
                              key={account.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.07, duration: 0.3 }}
                              whileHover={{ scale: 1.01, x: 4 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <Card
                                className={`cursor-pointer border transition-all duration-200 ${
                                  isThisSelected
                                    ? `${config.selectedBg} shadow-md`
                                    : 'hover:shadow-md border-border'
                                } ${isLoggingIn && isThisSelected ? 'opacity-70' : ''}`}
                                onClick={() => handleLogin(account)}
                              >
                                <CardContent className="p-3 sm:p-4">
                                  <div className="flex items-center gap-3 sm:gap-4">
                                    {/* Avatar */}
                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                                      <span className="text-white font-semibold text-sm sm:text-base">
                                        {initials}
                                      </span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-foreground text-sm sm:text-base truncate">
                                          {account.name}
                                        </h4>
                                        {account.specialization && (
                                          <Badge
                                            className={`hidden sm:inline-flex text-[10px] px-1.5 py-0 border-0 ${config.badgeColor}`}
                                          >
                                            {specializationLabels[account.specialization] || account.specialization}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                                        {account.email}
                                      </p>
                                      {account.specialization && (
                                        <Badge className={`sm:hidden text-[10px] px-1.5 py-0 border-0 mt-1 ${config.badgeColor}`}>
                                          {specializationLabels[account.specialization] || account.specialization}
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Login action */}
                                    <div className="shrink-0 flex items-center gap-2">
                                      {account.consultationFee && (
                                        <span className="hidden md:block text-xs text-muted-foreground">
                                          Rp {account.consultationFee.toLocaleString('id-ID')}
                                        </span>
                                      )}
                                      {isThisSelected && isLoggingIn ? (
                                        <motion.div
                                          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                                          style={{ borderColor: selectedRole === 'dokter' ? '#14b8a6' : selectedRole === 'pasien' ? '#f43f5e' : '#f59e0b', borderTopColor: 'transparent' }}
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                        />
                                      ) : (
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                          selectedRole === 'dokter' ? 'bg-teal-50 text-teal-600 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400 dark:hover:bg-teal-900/50' :
                                          selectedRole === 'pasien' ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50' :
                                          'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
                                        }`}>
                                          <ChevronRight className="w-4 h-4" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Password hint */}
                      <motion.div
                        className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            <strong>Demo Mode</strong> — Klik akun untuk langsung masuk. 
                            Tidak perlu kata sandi.
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.footer
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <p className="text-xs text-white/50">
            © 2025 MedikaLink — Demo Telemedicine Platform
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
