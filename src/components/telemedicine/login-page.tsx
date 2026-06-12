'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import type { User, DoctorProfile } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, Heart, Shield, ChevronRight, ArrowLeft, Lock } from 'lucide-react';
import Image from 'next/image';

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
  badgeColor: string;
  iconBg: string;
  hoverBorder: string;
  selectedBg: string;
  accentColor: string;
}> = {
  dokter: {
    label: 'Dokter',
    description: 'Kelola pasien dan layanan paliatif',
    icon: Stethoscope,
    gradient: 'from-[#2D8C7A] to-[#1F6B5C]',
    badgeColor: 'bg-[#2D8C7A]/10 text-[#2D8C7A] dark:bg-[#2D8C7A]/20 dark:text-[#6DB8A8]',
    iconBg: 'bg-[#2D8C7A]/10 text-[#2D8C7A] dark:bg-[#2D8C7A]/20 dark:text-[#6DB8A8]',
    hoverBorder: 'hover:border-[#2D8C7A]/40 dark:hover:border-[#2D8C7A]/60',
    selectedBg: 'bg-[#2D8C7A]/5 border-[#2D8C7A]/40 dark:bg-[#2D8C7A]/10 dark:border-[#2D8C7A]/50',
    accentColor: '#2D8C7A',
  },
  pasien: {
    label: 'Pasien',
    description: 'Akses layanan kesehatan dan pendampingan',
    icon: Heart,
    gradient: 'from-[#6DB8A8] to-[#2D8C7A]',
    badgeColor: 'bg-[#6DB8A8]/10 text-[#2D8C7A] dark:bg-[#6DB8A8]/20 dark:text-[#6DB8A8]',
    iconBg: 'bg-[#6DB8A8]/10 text-[#2D8C7A] dark:bg-[#6DB8A8]/20 dark:text-[#6DB8A8]',
    hoverBorder: 'hover:border-[#6DB8A8]/40 dark:hover:border-[#6DB8A8]/60',
    selectedBg: 'bg-[#6DB8A8]/5 border-[#6DB8A8]/40 dark:bg-[#6DB8A8]/10 dark:border-[#6DB8A8]/50',
    accentColor: '#6DB8A8',
  },
  admin: {
    label: 'Admin',
    description: 'Kelola sistem dan laporan',
    icon: Shield,
    gradient: 'from-[#D9B26F] to-[#C49A52]',
    badgeColor: 'bg-[#D9B26F]/10 text-[#9A7B3F] dark:bg-[#D9B26F]/20 dark:text-[#D9B26F]',
    iconBg: 'bg-[#D9B26F]/10 text-[#9A7B3F] dark:bg-[#D9B26F]/20 dark:text-[#D9B26F]',
    hoverBorder: 'hover:border-[#D9B26F]/40 dark:hover:border-[#D9B26F]/60',
    selectedBg: 'bg-[#D9B26F]/5 border-[#D9B26F]/40 dark:bg-[#D9B26F]/10 dark:border-[#D9B26F]/50',
    accentColor: '#D9B26F',
  },
};

const demoAccounts: Record<RoleType, DemoAccount[]> = {
  dokter: [
    { id: 'doc-sarah', name: 'dr. Sarah Wijaya', email: 'sarah@carelivia.id', role: 'doctor', specialization: 'umum', consultationFee: 150000, gender: 'Perempuan' },
    { id: 'doc-ahmad', name: 'dr. Ahmad Rizki', email: 'ahmad@carelivia.id', role: 'doctor', specialization: 'anak', consultationFee: 175000, gender: 'Laki-laki' },
    { id: 'doc-lisa', name: 'dr. Lisa Permata', email: 'lisa@carelivia.id', role: 'doctor', specialization: 'penyakit_dalam', consultationFee: 200000, gender: 'Perempuan' },
    { id: 'doc-dewi', name: 'dr. Dewi Sartika', email: 'dewi@carelivia.id', role: 'doctor', specialization: 'kebidanan', consultationFee: 175000, gender: 'Perempuan' },
    { id: 'doc-budi', name: 'drg. Budi Santoso', email: 'budi@carelivia.id', role: 'doctor', specialization: 'gigi', consultationFee: 200000, gender: 'Laki-laki' },
  ],
  pasien: [
    { id: 'pat-rina', name: 'Rina Wulandari', email: 'rina@mail.com', role: 'patient', phone: '081234567890', gender: 'Perempuan' },
    { id: 'pat-doni', name: 'Doni Pratama', email: 'doni@mail.com', role: 'patient', phone: '081234567891', gender: 'Laki-laki' },
    { id: 'pat-maya', name: 'Maya Sari', email: 'maya@mail.com', role: 'patient', phone: '081234567892', gender: 'Perempuan' },
    { id: 'pat-siti', name: 'Siti Aminah', email: 'siti@mail.com', role: 'patient', phone: '081234567893', gender: 'Perempuan' },
    { id: 'pat-joko', name: 'Joko Widodo', email: 'joko@mail.com', role: 'patient', phone: '081234567894', gender: 'Laki-laki' },
  ],
  admin: [
    { id: 'admin-carelivia', name: 'Admin CARE\'Livia', email: 'admin@carelivia.id', role: 'admin', phone: '081200000000', gender: 'Laki-laki' },
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
      {/* Background - Soft sage gradient with nature imagery */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2D8C7A] via-[#3A9D8B] to-[#1F6B5C]" />
      
      {/* Background image overlay */}
      <div className="absolute inset-0 opacity-15">
        <Image
          src="/carelivia-bg.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
      </div>
      
      {/* Decorative botanical SVG elements */}
      <svg className="absolute top-0 left-0 w-full h-full leaf-decoration" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Top-left leaf cluster */}
        <g className="animate-leaf-sway">
          <path d="M0 0C100 50 180 120 200 250C150 180 80 100 0 70V0Z" fill="white" />
          <path d="M20 10C90 40 140 90 160 180C120 120 70 60 20 40V10Z" fill="white" opacity="0.5" />
        </g>
        {/* Bottom-right leaf cluster */}
        <g className="animate-leaf-sway" style={{ animationDelay: '-4s' }}>
          <path d="M1440 900C1340 850 1260 780 1240 650C1290 720 1360 800 1440 830V900Z" fill="white" />
          <path d="M1420 890C1350 860 1300 810 1280 720C1320 780 1370 840 1420 860V890Z" fill="white" opacity="0.5" />
        </g>
        {/* Top-right small leaf */}
        <g className="animate-leaf-sway" style={{ animationDelay: '-8s' }}>
          <path d="M1440 0C1380 30 1340 80 1330 150C1360 100 1400 50 1440 30V0Z" fill="white" />
        </g>
        {/* Bottom-left small leaf */}
        <g className="animate-leaf-sway" style={{ animationDelay: '-2s' }}>
          <path d="M0 900C60 870 100 820 110 750C80 800 40 850 0 870V900Z" fill="white" />
        </g>
      </svg>

      {/* Floating decorative circles */}
      <motion.div
        className="absolute top-[-8%] right-[-3%] w-[400px] h-[400px] rounded-full bg-white/5 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-[#6DB8A8]/10 blur-3xl"
        animate={{ scale: [1.05, 1, 1.05], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[35%] right-[20%] w-[200px] h-[200px] rounded-full bg-[#D9B26F]/8 blur-2xl"
        animate={{ y: [-15, 15, -15], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[60%] left-[10%] w-[250px] h-[250px] rounded-full bg-[#6DB8A8]/5 blur-2xl"
        animate={{ y: [10, -10, 10], opacity: [0.08, 0.18, 0.08] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        {/* Logo & Branding */}
        <motion.div
          className="text-center mb-8 sm:mb-10"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Logo */}
          <motion.div
            className="mx-auto mb-5 w-20 h-20 sm:w-24 sm:h-24 relative"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          >
            <div className="w-full h-full rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-lg overflow-hidden">
              <Image
                src="/carelivia-icon.png"
                alt="CARE'Livia"
                width={80}
                height={80}
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain p-1"
                priority
              />
            </div>
          </motion.div>
          
          {/* Brand Name */}
          <motion.h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            CARE<span className="text-[#6DB8A8]">&apos;</span>Livia
          </motion.h1>
          
          {/* Subtitle */}
          <motion.p
            className="mt-3 text-sm sm:text-base text-white/80 font-medium max-w-md mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            Perawatan Paliatif Digital untuk Meningkatkan Kualitas Hidup Pasien dan Keluarga
          </motion.p>

          {/* Tagline */}
          <motion.p
            className="mt-2 text-xs sm:text-sm text-[#D9B26F]/90 font-medium italic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            &ldquo;Caring for Life, Preserving Human Dignity&rdquo;
          </motion.p>
        </motion.div>

        {/* Main Card - Glassmorphism */}
        <motion.div
          className="w-full max-w-4xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7, ease: 'easeOut' }}
        >
          <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl shadow-black/15 rounded-2xl overflow-hidden">
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
                      className="shrink-0 h-9 w-9 rounded-full hover:bg-[#2D8C7A]/10 dark:hover:bg-[#2D8C7A]/20"
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
                      transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
                      whileHover={{ scale: 1.03, y: -3 }}
                      whileTap={{ scale: 0.98 }}
                      className={`cursor-pointer rounded-xl border-2 transition-all duration-300 ${
                        isSelected
                          ? config.selectedBg
                          : `bg-card border-border/60 ${config.hoverBorder} hover:shadow-lg`
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
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg transition-transform duration-300`}
                        >
                          <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                        </div>

                        <div>
                          <h3 className="font-semibold text-foreground text-sm sm:text-base">
                            {config.label}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-[180px]">
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
                              <ChevronRight className="w-4 h-4 rotate-90" style={{ color: config.accentColor }} />
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
                    <div className="mt-6 pt-6 border-t border-border/60">
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
                                className={`cursor-pointer border transition-all duration-300 ${
                                  isThisSelected
                                    ? `${config.selectedBg} shadow-md`
                                    : 'hover:shadow-md border-border/60 hover:border-border'
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
                                          style={{ borderColor: config.accentColor, borderTopColor: 'transparent' }}
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                        />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                          style={{ backgroundColor: `${config.accentColor}12`, color: config.accentColor }}
                                        >
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
                        className="mt-4 p-3 rounded-lg bg-[#2D8C7A]/5 dark:bg-[#2D8C7A]/10 border border-[#2D8C7A]/10 dark:border-[#2D8C7A]/20"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Lock className="w-3.5 h-3.5 shrink-0 text-[#2D8C7A]" />
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
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <p className="text-xs text-white/40 font-medium">
            &copy; 2026 CARE&apos;Livia
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">
            Telepalliative Care Platform
          </p>
          <p className="text-[10px] text-white/25 mt-0.5 italic">
            Caring for Life, Preserving Human Dignity
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
