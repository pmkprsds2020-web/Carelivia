'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import type { User, DoctorProfile } from '@/lib/types';
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
  accentColor: string;
  iconGlow: string;
}> = {
  dokter: {
    label: 'Dokter',
    description: 'Kelola pasien dan layanan paliatif',
    icon: Stethoscope,
    gradient: 'from-[#2A9D8F] to-[#1A7A6E]',
    accentColor: '#2A9D8F',
    iconGlow: 'shadow-[#2A9D8F]/30',
  },
  pasien: {
    label: 'Pasien',
    description: 'Akses layanan kesehatan dan pendampingan',
    icon: Heart,
    gradient: 'from-[#6DB8A8] to-[#2A9D8F]',
    accentColor: '#6DB8A8',
    iconGlow: 'shadow-[#6DB8A8]/30',
  },
  admin: {
    label: 'Admin',
    description: 'Kelola sistem dan laporan',
    icon: Shield,
    gradient: 'from-[#D4A857] to-[#B8903E]',
    accentColor: '#D4A857',
    iconGlow: 'shadow-[#D4A857]/30',
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
    { id: 'admin-carelivia', name: "Admin CARE'Livia", email: 'admin@carelivia.id', role: 'admin', phone: '081200000000', gender: 'Laki-laki' },
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
      {/* Background - Deep teal gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1A6B5C] via-[#2A9D8F] to-[#1A5C50]" />

      {/* Background image overlay */}
      <div className="absolute inset-0 opacity-20">
        <Image
          src="/carelivia-bg.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Green transparent overlay for readability */}
      <div className="absolute inset-0" style={{ background: 'rgba(0, 128, 110, 0.25)' }} />

      {/* Decorative botanical SVG elements */}
      <svg className="absolute top-0 left-0 w-full h-full leaf-decoration" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g className="animate-leaf-sway">
          <path d="M0 0C100 50 180 120 200 250C150 180 80 100 0 70V0Z" fill="white" />
          <path d="M20 10C90 40 140 90 160 180C120 120 70 60 20 40V10Z" fill="white" opacity="0.5" />
        </g>
        <g className="animate-leaf-sway" style={{ animationDelay: '-4s' }}>
          <path d="M1440 900C1340 850 1260 780 1240 650C1290 720 1360 800 1440 830V900Z" fill="white" />
          <path d="M1420 890C1350 860 1300 810 1280 720C1320 780 1370 840 1420 860V890Z" fill="white" opacity="0.5" />
        </g>
        <g className="animate-leaf-sway" style={{ animationDelay: '-8s' }}>
          <path d="M1440 0C1380 30 1340 80 1330 150C1360 100 1400 50 1440 30V0Z" fill="white" />
        </g>
        <g className="animate-leaf-sway" style={{ animationDelay: '-2s' }}>
          <path d="M0 900C60 870 100 820 110 750C80 800 40 850 0 870V900Z" fill="white" />
        </g>
      </svg>

      {/* Floating decorative orbs */}
      <motion.div
        className="absolute top-[-8%] right-[-3%] w-[400px] h-[400px] rounded-full bg-white/5 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-[#6DB8A8]/8 blur-3xl"
        animate={{ scale: [1.05, 1, 1.05], opacity: [0.1, 0.25, 0.1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[35%] right-[20%] w-[200px] h-[200px] rounded-full bg-[#D4A857]/6 blur-2xl"
        animate={{ y: [-15, 15, -15], opacity: [0.08, 0.18, 0.08] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-10">
        {/* Logo & Branding */}
        <motion.div
          className="text-center mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Logo */}
          <motion.div
            className="mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20 relative"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          >
            <div className="w-full h-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg overflow-hidden">
              <Image
                src="/carelivia-icon.png"
                alt="CARE'Livia"
                width={64}
                height={64}
                className="w-10 h-10 sm:w-14 sm:h-14 object-contain p-0.5"
                priority
              />
            </div>
          </motion.div>

          {/* Brand Name - Dominant */}
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            CARE<span className="text-white/60">&apos;</span><span className="text-[#6DB8A8]">Livia</span>
          </motion.h1>

          {/* Subtitle - Lighter, smaller */}
          <motion.p
            className="mt-2 text-xs sm:text-sm text-white/60 font-normal max-w-sm mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            Perawatan Paliatif Digital untuk Meningkatkan Kualitas Hidup Pasien dan Keluarga
          </motion.p>

          {/* Tagline - Italic gold */}
          <motion.p
            className="mt-2 text-sm sm:text-base text-[#D4A857] font-medium italic tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            &ldquo;Caring for Life, Preserving Human Dignity&rdquo;
          </motion.p>
        </motion.div>

        {/* Transparent Glass Container - No big white card */}
        <motion.div
          className="w-full max-w-[900px]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7, ease: 'easeOut' }}
        >
          <div
            className="rounded-3xl border border-white/15 p-6"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            }}
          >
            {/* Section title */}
            <AnimatePresence mode="wait">
              {selectedRole ? (
                <motion.div
                  key="account-header"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 mb-5"
                >
                  <button
                    onClick={handleBack}
                    className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Pilih Akun {roleConfig[selectedRole].label}
                    </h2>
                    <p className="text-xs text-white/50">
                      Masuk sebagai {roleConfig[selectedRole].label.toLowerCase()}
                    </p>
                  </div>
                  <Badge className="ml-auto bg-white/10 text-white/70 border-white/10 text-[10px] border-0">
                    {demoAccounts[selectedRole].length} akun
                  </Badge>
                </motion.div>
              ) : (
                <motion.div
                  key="role-header"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center mb-5"
                >
                  <p className="text-sm text-white/50 font-light">
                    Pilih peran untuk melanjutkan
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Role selection cards - Compact modern design */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 justify-items-center"
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
                    transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="cursor-pointer w-full max-w-[220px]"
                    onClick={() => {
                      if (isSelected) {
                        handleBack();
                      } else {
                        setSelectedRole(role);
                        setSelectedAccountId(null);
                      }
                    }}
                  >
                    <div
                      className={`rounded-2xl border transition-all duration-300 h-[180px] flex flex-col items-center justify-center text-center gap-3 p-4 ${
                        isSelected
                          ? 'border-white/40 bg-white/15'
                          : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10 hover:shadow-lg'
                      }`}
                      style={{
                        backdropFilter: isSelected ? 'blur(12px)' : 'blur(4px)',
                        WebkitBackdropFilter: isSelected ? 'blur(12px)' : 'blur(4px)',
                        boxShadow: isSelected
                          ? `0 0 20px ${config.accentColor}20, inset 0 1px 0 rgba(255,255,255,0.15)`
                          : 'inset 0 1px 0 rgba(255,255,255,0.08)',
                      }}
                    >
                      {/* Icon */}
                      <div
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg ${config.iconGlow}`}
                      >
                        <Icon className="w-7 h-7 text-white" />
                      </div>

                      {/* Label & Description */}
                      <div>
                        <h3 className="font-semibold text-white text-sm">
                          {config.label}
                        </h3>
                        <p className="text-[11px] text-white/50 mt-0.5 leading-tight max-w-[160px]">
                          {config.description}
                        </p>
                      </div>

                      {/* Account count */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-white/40 font-medium">
                          {accountCount} akun
                        </span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-white/60 rotate-90" />
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
                  <div className="mt-5 pt-5 border-t border-white/10">
                    <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                      {demoAccounts[selectedRole].map((account, index) => {
                        const isThisSelected = selectedAccountId === account.id;
                        const config = roleConfig[selectedRole];
                        const initials = getInitials(account.name);

                        return (
                          <motion.div
                            key={account.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.06, duration: 0.3 }}
                            whileHover={{ scale: 1.01, x: 4 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <div
                              className={`cursor-pointer rounded-xl border transition-all duration-300 ${
                                isThisSelected
                                  ? 'border-white/30 bg-white/15'
                                  : 'border-white/8 bg-white/5 hover:bg-white/10 hover:border-white/15'
                              } ${isLoggingIn && isThisSelected ? 'opacity-60' : ''}`}
                              style={{
                                backdropFilter: 'blur(4px)',
                                WebkitBackdropFilter: 'blur(4px)',
                                boxShadow: isThisSelected
                                  ? `0 0 12px ${config.accentColor}15`
                                  : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                              }}
                              onClick={() => handleLogin(account)}
                            >
                              <div className="p-3 sm:p-3.5">
                                <div className="flex items-center gap-3">
                                  {/* Avatar */}
                                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                                    <span className="text-white font-semibold text-xs sm:text-sm">
                                      {initials}
                                    </span>
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-semibold text-white text-sm truncate">
                                        {account.name}
                                      </h4>
                                      {account.specialization && (
                                        <Badge
                                          className="hidden sm:inline-flex text-[9px] px-1.5 py-0 border-0 bg-white/10 text-white/70"
                                        >
                                          {specializationLabels[account.specialization] || account.specialization}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-white/45 truncate mt-0.5">
                                      {account.email}
                                    </p>
                                  </div>

                                  {/* Login action */}
                                  <div className="shrink-0 flex items-center gap-2">
                                    {isThisSelected && isLoggingIn ? (
                                      <motion.div
                                        className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                                        style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'transparent' }}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80 transition-colors">
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Demo hint */}
                    <motion.div
                      className="mt-3 p-2.5 rounded-lg border border-white/8 bg-white/5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="flex items-center gap-2 text-[11px] text-white/40">
                        <Lock className="w-3 h-3 shrink-0 text-white/30" />
                        <span>
                          <strong className="text-white/50">Demo Mode</strong> — Klik akun untuk langsung masuk.
                        </span>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.footer
          className="mt-6 sm:mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <p className="text-[11px] text-white/35 font-medium">
            &copy; 2026 CARE&apos;Livia
          </p>
          <p className="text-[9px] text-white/25 mt-0.5">
            Telepalliative Care Platform &middot; Caring for Life, Preserving Human Dignity
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
