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
  hoverShadow: string;
}> = {
  dokter: {
    label: 'Dokter',
    description: 'Kelola pasien dan layanan paliatif',
    icon: Stethoscope,
    gradient: 'from-[#2D8C7A] to-[#1F6B5C]',
    accentColor: '#2D8C7A',
    hoverShadow: '0 8px 30px rgba(45,140,122,0.25)',
  },
  pasien: {
    label: 'Pasien',
    description: 'Akses layanan kesehatan dan pendampingan',
    icon: Heart,
    gradient: 'from-[#6DB8A8] to-[#2D8C7A]',
    accentColor: '#6DB8A8',
    hoverShadow: '0 8px 30px rgba(109,184,168,0.25)',
  },
  admin: {
    label: 'Admin',
    description: 'Kelola sistem dan laporan',
    icon: Shield,
    gradient: 'from-[#D9B26F] to-[#C49A52]',
    accentColor: '#D9B26F',
    hoverShadow: '0 8px 30px rgba(217,178,111,0.25)',
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
    { id: 'admin-carelivia', name: 'Admin CareLivia', email: 'admin@carelivia.id', role: 'admin', phone: '081200000000', gender: 'Laki-laki' },
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
      {/* ═══ BACKGROUND LAYERS ═══ */}

      {/* Layer 1: Sage green gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1B6B5A] via-[#2D8C7A] to-[#1A5C4F]" />

      {/* Layer 2: AI-generated nature/family illustration */}
      <div className="absolute inset-0 opacity-25">
        <Image
          src="/carelivia-bg.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Layer 3: Gradient overlay for readability */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(rgba(45,140,122,0.45), rgba(109,184,168,0.35))',
        }}
      />

      {/* Layer 4: Decorative botanical leaves */}
      <svg
        className="absolute top-0 left-0 w-full h-full leaf-decoration pointer-events-none"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top-left leaf cluster */}
        <g className="animate-leaf-sway">
          <path d="M0 0C120 60 200 140 220 290C160 210 90 120 0 80V0Z" fill="white" />
          <path d="M25 12C100 50 160 105 180 210C135 140 80 70 25 48V12Z" fill="white" opacity="0.4" />
        </g>
        {/* Bottom-right leaf cluster */}
        <g className="animate-leaf-sway" style={{ animationDelay: '-4s' }}>
          <path d="M1440 900C1320 840 1240 760 1220 610C1280 690 1350 780 1440 820V900Z" fill="white" />
          <path d="M1415 888C1340 850 1280 795 1260 690C1305 760 1360 830 1415 852V888Z" fill="white" opacity="0.4" />
        </g>
        {/* Top-right small leaf */}
        <g className="animate-leaf-sway" style={{ animationDelay: '-8s' }}>
          <path d="M1440 0C1390 25 1350 75 1340 150C1360 100 1400 45 1440 25V0Z" fill="white" />
        </g>
        {/* Bottom-left small leaf */}
        <g className="animate-leaf-sway" style={{ animationDelay: '-2s' }}>
          <path d="M0 900C50 875 90 825 100 750C70 800 35 850 0 875V900Z" fill="white" />
        </g>
        {/* Center subtle leaf detail */}
        <g className="animate-leaf-sway" style={{ animationDelay: '-6s' }}>
          <path d="M720 0C740 40 745 90 730 140C725 95 715 45 720 0Z" fill="white" opacity="0.15" />
        </g>
      </svg>

      {/* Layer 5: Floating ambient orbs */}
      <motion.div
        className="absolute top-[-10%] right-[-5%] w-[450px] h-[450px] rounded-full bg-white/4 blur-3xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-12%] left-[-6%] w-[550px] h-[550px] rounded-full bg-[#6DB8A8]/6 blur-3xl"
        animate={{ scale: [1.06, 1, 1.06], opacity: [0.08, 0.2, 0.08] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[30%] right-[15%] w-[180px] h-[180px] rounded-full bg-[#D9B26F]/5 blur-2xl"
        animate={{ y: [-12, 12, -12], opacity: [0.06, 0.15, 0.06] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-8">

        {/* ── HERO: Logo + Branding ── */}
        <motion.div
          className="text-center mb-5 sm:mb-7"
          initial={{ opacity: 0, y: -25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          {/* Logo with floating effect */}
          <motion.div
            className="mx-auto mb-4 w-20 h-20 sm:w-24 sm:h-24 relative"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.2 }}
          >
            <motion.div
              className="w-full h-full relative"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl shadow-black/20">
                <Image
                  src="/carelivia-icon.png"
                  alt="CareLivia"
                  width={96}
                  height={96}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
            </motion.div>
          </motion.div>

          {/* Brand Name — Dominant */}
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
          >
            Care<span className="text-[#6DB8A8]">Livia</span>
          </motion.h1>

          {/* Subtitle — Lighter, smaller */}
          <motion.p
            className="mt-2.5 text-xs sm:text-sm text-white/55 font-light max-w-md mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            Perawatan Paliatif Digital untuk Meningkatkan Kualitas Hidup Pasien dan Keluarga
          </motion.p>

          {/* Tagline — Italic gold with letter spacing */}
          <motion.p
            className="mt-2.5 text-sm sm:text-base font-medium italic tracking-wider"
            style={{ color: '#D9B26F' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            &ldquo;Caring for Life, Preserving Human Dignity&rdquo;
          </motion.p>
        </motion.div>

        {/* ── GLASS CONTAINER ── */}
        <motion.div
          className="w-full max-w-[900px]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
        >
          <div
            className="p-6"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            }}
          >
            {/* Section header */}
            <AnimatePresence mode="wait">
              {selectedRole ? (
                <motion.div
                  key="account-header"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 mb-5"
                >
                  <button
                    onClick={handleBack}
                    className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-200"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Pilih Akun {roleConfig[selectedRole].label}
                    </h2>
                    <p className="text-[11px] text-white/40">
                      Masuk sebagai {roleConfig[selectedRole].label.toLowerCase()}
                    </p>
                  </div>
                  <Badge className="ml-auto bg-white/8 text-white/50 border-0 text-[10px]">
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
                  <p className="text-[13px] text-white/40 font-light tracking-wide">
                    Pilih peran untuk melanjutkan
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── ROLE CARDS ── */}
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
                    transition={{ delay: 0.6 + index * 0.12, duration: 0.5 }}
                    whileHover={{
                      scale: 1.03,
                      y: -3,
                      transition: { duration: 0.3, ease: 'easeOut' },
                    }}
                    whileTap={{ scale: 0.97 }}
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
                      className={`flex flex-col items-center justify-center text-center gap-3 p-5 h-[180px] transition-all duration-300 ${
                        isSelected
                          ? 'border-[rgba(255,255,255,0.35)]'
                          : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)]'
                      }`}
                      style={{
                        background: isSelected
                          ? 'rgba(255, 255, 255, 0.18)'
                          : 'rgba(255, 255, 255, 0.12)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        borderRadius: '20px',
                        border: isSelected
                          ? `1px solid rgba(255,255,255,0.35)`
                          : undefined,
                        boxShadow: isSelected
                          ? `0 0 25px ${config.accentColor}20, inset 0 1px 0 rgba(255,255,255,0.15)`
                          : `inset 0 1px 0 rgba(255,255,255,0.06)`,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.boxShadow = config.hoverShadow;
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                          e.currentTarget.style.border = `1px solid ${config.accentColor}40`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.06)';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                          e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
                        }
                      }}
                    >
                      {/* Icon */}
                      <div
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}
                        style={{ boxShadow: `0 4px 15px ${config.accentColor}30` }}
                      >
                        <Icon className="w-7 h-7 text-white" />
                      </div>

                      {/* Label + Description */}
                      <div>
                        <h3 className="font-semibold text-white text-sm tracking-wide">
                          {config.label}
                        </h3>
                        <p className="text-[11px] text-white/45 mt-0.5 leading-tight max-w-[160px]">
                          {config.description}
                        </p>
                      </div>

                      {/* Account count */}
                      <span className="text-[10px] text-white/30 font-medium">
                        {accountCount} akun
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* ── ACCOUNT LIST ── */}
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
                  <div className="mt-5 pt-5 border-t border-white/8">
                    <div className="space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                      {demoAccounts[selectedRole].map((account, index) => {
                        const isThisSelected = selectedAccountId === account.id;
                        const config = roleConfig[selectedRole];
                        const initials = getInitials(account.name);

                        return (
                          <motion.div
                            key={account.id}
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                            whileHover={{ x: 3 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <div
                              className={`cursor-pointer transition-all duration-200 ${
                                isThisSelected ? 'border-white/25' : 'border-white/6 hover:border-white/12'
                              } ${isLoggingIn && isThisSelected ? 'opacity-50' : ''}`}
                              style={{
                                background: isThisSelected
                                  ? 'rgba(255,255,255,0.12)'
                                  : 'rgba(255,255,255,0.04)',
                                backdropFilter: 'blur(6px)',
                                WebkitBackdropFilter: 'blur(6px)',
                                borderRadius: '14px',
                                border: isThisSelected ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
                                boxShadow: isThisSelected
                                  ? `0 0 12px ${config.accentColor}12`
                                  : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                              }}
                              onClick={() => handleLogin(account)}
                            >
                              <div className="p-3 flex items-center gap-3">
                                {/* Avatar */}
                                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                                  <span className="text-white font-semibold text-xs">
                                    {initials}
                                  </span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-white text-sm truncate">
                                      {account.name}
                                    </h4>
                                    {account.specialization && (
                                      <Badge className="hidden sm:inline-flex text-[9px] px-1.5 py-0 border-0 bg-white/8 text-white/55">
                                        {specializationLabels[account.specialization] || account.specialization}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-white/35 truncate mt-0.5">
                                    {account.email}
                                  </p>
                                </div>

                                {/* Action */}
                                <div className="shrink-0">
                                  {isThisSelected && isLoggingIn ? (
                                    <motion.div
                                      className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                                      style={{ borderColor: 'rgba(255,255,255,0.25)', borderTopColor: 'transparent' }}
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/8 text-white/40">
                                      <ChevronRight className="w-3 h-3" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Demo hint */}
                    <motion.div
                      className="mt-3 p-2.5 rounded-xl border border-white/6"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="flex items-center gap-2 text-[11px] text-white/30">
                        <Lock className="w-3 h-3 shrink-0" />
                        <span>
                          <strong className="text-white/45">Demo Mode</strong> — Klik akun untuk langsung masuk
                        </span>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── FOOTER ── */}
        <motion.footer
          className="mt-5 sm:mt-7 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.7 }}
        >
          <p className="text-[11px] text-white/30 font-medium">
            &copy; 2025 CareLivia
          </p>
          <p className="text-[9px] text-white/20 mt-0.5">
            Telepalliative Care Platform
          </p>
          <p className="text-[9px] text-white/15 mt-0.5 italic">
            Caring for Life, Preserving Human Dignity
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
