'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import type { User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, Heart, Shield, ChevronRight, ArrowLeft, Lock, Mail, Phone, User as UserIcon, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Briefcase } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import {
  signUpWithEmail,
  signInWithEmail,
  roleToUserRole,
  roleToActivePanel,
  type CareLiviaRole,
} from '@/lib/supabaseAuth';

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
  careliviaRole: CareLiviaRole;
}> = {
  dokter: {
    label: 'Dokter',
    description: 'Kelola pasien dan layanan paliatif',
    icon: Stethoscope,
    gradient: 'from-[#2D8C7A] to-[#1F6B5C]',
    accentColor: '#2D8C7A',
    hoverShadow: '0 8px 30px rgba(45,140,122,0.25)',
    careliviaRole: 'Dokter',
  },
  pasien: {
    label: 'Pasien',
    description: 'Akses layanan kesehatan dan pendampingan',
    icon: Heart,
    gradient: 'from-[#6DB8A8] to-[#2D8C7A]',
    accentColor: '#6DB8A8',
    hoverShadow: '0 8px 30px rgba(109,184,168,0.25)',
    careliviaRole: 'Pasien',
  },
  admin: {
    label: 'Admin',
    description: 'Kelola sistem dan laporan',
    icon: Shield,
    gradient: 'from-[#D9B26F] to-[#C49A52]',
    accentColor: '#D9B26F',
    hoverShadow: '0 8px 30px rgba(217,178,111,0.25)',
    careliviaRole: 'Admin',
  },
};

// Demo accounts kept for backward-compat (used by quick-login button)
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

// Extra roles available in the Sign Up form (beyond the 3 main cards)
const ALL_SIGNUP_ROLES: { value: CareLiviaRole; label: string }[] = [
  { value: 'Dokter', label: 'Dokter' },
  { value: 'Perawat', label: 'Perawat' },
  { value: 'Caregiver', label: 'Caregiver' },
  { value: 'Pasien', label: 'Pasien' },
  { value: 'Admin', label: 'Admin' },
];

export function LoginPage() {
  const { setCurrentUser, setActivePanel } = useStore();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);

  // Auth form state
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  // ── SYNCHRONOUS double-click guard ──────────────────────────────────────
  // React state (`isLoading`) is async — clicking twice in the same React tick
  // would fire two auth requests before the button gets disabled. This ref is
  // flipped synchronously on the first click so the second click is a no-op.
  // This is the PRIMARY fix for the Supabase 429 (Too Many Requests) issue.
  const isSubmittingRef = useRef(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Sign In fields
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');

  // Sign Up fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupProfession, setSignupProfession] = useState('');
  const [signupRole, setSignupRole] = useState<CareLiviaRole>('Pasien');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');

  // ── Demo quick-login (preserved for dev convenience) ───────────────────
  const handleDemoLogin = (account: DemoAccount) => {
    setIsLoading(true);
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
    setTimeout(() => {
      setCurrentUser(user);
      toast({ title: `Selamat datang, ${account.name}` });
    }, 400);
  };

  // ── Validation helpers ─────────────────────────────────────────────────
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const validateSignIn = (): string | null => {
    if (!signinEmail.trim()) return 'Email wajib diisi.';
    if (!isValidEmail(signinEmail)) return 'Format email tidak valid.';
    if (!signinPassword) return 'Password wajib diisi.';
    return null;
  };

  const validateSignUp = (): string | null => {
    if (!signupName.trim()) return 'Nama lengkap wajib diisi.';
    if (!signupEmail.trim()) return 'Email wajib diisi.';
    if (!isValidEmail(signupEmail)) return 'Format email tidak valid.';
    if (signupPassword.length < 8) return 'Password minimal 8 karakter.';
    if (signupPassword !== signupConfirm) return 'Konfirmasi password tidak sama.';
    if (!signupRole) return 'Role wajib dipilih.';
    return null;
  };

  // ── Apply successful auth → store + redirect by role ───────────────────
  const applyAuthSuccess = (
    authUser: { id: string; email: string; fullName: string; role: CareLiviaRole; phone?: string; profession?: string },
    welcomeTitle: string
  ) => {
    const now = new Date().toISOString();
    const storeUser: User = {
      id: authUser.id,
      email: authUser.email,
      phone: authUser.phone,
      name: authUser.fullName,
      role: roleToUserRole(authUser.role),
      avatar: '',
      isVerified: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as User;
    setCurrentUser(storeUser);
    // Single-route app: "redirect" = switch activePanel based on role
    setActivePanel(roleToActivePanel(authUser.role));
    toast({ title: welcomeTitle });
  };

  // ── Sign In submit ─────────────────────────────────────────────────────
  const handleSignIn = async () => {
    // SYNCHRONOUS guard: blocks duplicate clicks that happen before React
    // has a chance to re-render with `disabled={isLoading}`. This is what
    // stops the second `/auth/v1/token` request that was triggering Supabase 429.
    if (isSubmittingRef.current) {
      console.warn('[auth][handleSignIn] duplicate click BLOCKED by ref guard');
      return;
    }
    isSubmittingRef.current = true;
    console.info('[auth][handleSignIn] click', {
      email: signinEmail.trim(),
      ts: new Date().toISOString(),
    });

    setAuthError(null);
    setAuthInfo(null);
    const v = validateSignIn();
    if (v) {
      setAuthError(v);
      isSubmittingRef.current = false;
      return;
    }
    setIsLoading(true);
    try {
      const res = await signInWithEmail({ email: signinEmail.trim(), password: signinPassword });
      if (!res.ok || !res.user) {
        setAuthError(res.error ?? 'Login gagal.');
        return;
      }
      applyAuthSuccess(res.user, `Selamat datang kembali, ${res.user.fullName}.`);
    } catch (err) {
      console.error('[auth][handleSignIn] threw', err);
      setAuthError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      // Reset BOTH the async state and the sync ref so the next legitimate
      // submit can proceed. (On success the component unmounts anyway, but
      // resetting here is safe and defensive.)
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // ── Sign Up submit ─────────────────────────────────────────────────────
  const handleSignUp = async () => {
    // SYNCHRONOUS guard: blocks duplicate clicks that happen before React
    // has a chance to re-render with `disabled={isLoading}`. This is what
    // stops the second `/auth/v1/signup` request that was triggering Supabase 429.
    if (isSubmittingRef.current) {
      console.warn('[auth][handleSignUp] duplicate click BLOCKED by ref guard');
      return;
    }
    isSubmittingRef.current = true;
    console.info('[auth][handleSignUp] click', {
      email: signupEmail.trim(),
      role: signupRole,
      ts: new Date().toISOString(),
    });

    setAuthError(null);
    setAuthInfo(null);
    const v = validateSignUp();
    if (v) {
      setAuthError(v);
      isSubmittingRef.current = false;
      return;
    }
    setIsLoading(true);
    try {
      const res = await signUpWithEmail({
        email: signupEmail.trim(),
        password: signupPassword,
        fullName: signupName.trim(),
        role: signupRole,
        phone: signupPhone.trim() || undefined,
        profession: signupProfession.trim() || undefined,
      });
      if (!res.ok) {
        setAuthError(res.error ?? 'Registrasi gagal.');
        return;
      }
      if (res.needsEmailConfirm) {
        // Email confirmation required — don't auto-login. Show success message.
        setAuthInfo('Registrasi berhasil. Silakan cek email untuk verifikasi akun.');
        toast({ title: 'Registrasi berhasil', description: 'Silakan cek email untuk verifikasi akun.' });
        // Switch to sign-in mode so the user can login after confirming
        setAuthMode('signin');
        setSigninEmail(signupEmail.trim());
        setSigninPassword('');
      } else {
        // No email confirmation required → auto-login
        if (res.user) {
          applyAuthSuccess(res.user, `Selamat datang, ${res.user.fullName}.`);
        } else {
          setAuthInfo('Registrasi berhasil. Silakan masuk.');
          setAuthMode('signin');
          setSigninEmail(signupEmail.trim());
        }
      }
      // Clear signup form
      setSignupName(''); setSignupEmail(''); setSignupPhone(''); setSignupProfession(''); setSignupPassword(''); setSignupConfirm('');
    } catch (err) {
      console.error('[auth][handleSignUp] threw', err);
      setAuthError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      // Reset BOTH the async state and the sync ref so the next legitimate
      // submit can proceed. (On success the component unmounts anyway, but
      // resetting here is safe and defensive.)
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleBack = () => {
    setSelectedRole(null);
    setAuthError(null);
    setAuthInfo(null);
    setAuthMode('signin');
  };

  // When a role card is clicked, pre-fill the signup role + switch to sign-in mode
  const handleRoleSelect = (role: RoleType) => {
    setSelectedRole(role);
    setSignupRole(roleConfig[role].careliviaRole);
    setAuthMode('signin');
    setAuthError(null);
    setAuthInfo(null);
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
                      {authMode === 'signin' ? `Masuk sebagai ${roleConfig[selectedRole].label}` : `Daftar akun ${roleConfig[selectedRole].label}`}
                    </h2>
                    <p className="text-[11px] text-white/40">
                      {authMode === 'signin' ? 'Masuk dengan email & password' : 'Lengkapi data untuk membuat akun'}
                    </p>
                  </div>
                  {/* Mode toggle */}
                  <div className="ml-auto flex items-center gap-1 p-0.5 rounded-full bg-white/5 border border-white/8">
                    <button
                      onClick={() => { setAuthMode('signin'); setAuthError(null); setAuthInfo(null); }}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${authMode === 'signin' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'}`}
                    >
                      Masuk
                    </button>
                    <button
                      onClick={() => { setAuthMode('signup'); setAuthError(null); setAuthInfo(null); }}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${authMode === 'signup' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'}`}
                    >
                      Daftar
                    </button>
                  </div>
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
                        handleRoleSelect(role);
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

            {/* ── AUTH FORM / ACCOUNT LIST ── */}
            <AnimatePresence mode="wait">
              {selectedRole && (
                <motion.div
                  key={`auth-${selectedRole}-${authMode}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 pt-5 border-t border-white/8">
                    {/* ── SIGN IN FORM ── */}
                    {authMode === 'signin' && (
                      <div className="space-y-3 max-w-md mx-auto">
                        {/* Email */}
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                          <input
                            type="email"
                            autoComplete="email"
                            placeholder="Email"
                            value={signinEmail}
                            onChange={(e) => { setSigninEmail(e.target.value); setAuthError(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSignIn(); }}
                            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/8 border border-white/10 text-white placeholder:text-white/35 text-sm focus:outline-none focus:border-white/30 focus:bg-white/12 transition-colors"
                            disabled={isLoading}
                          />
                        </div>
                        {/* Password */}
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="Password"
                            value={signinPassword}
                            onChange={(e) => { setSigninPassword(e.target.value); setAuthError(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSignIn(); }}
                            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/8 border border-white/10 text-white placeholder:text-white/35 text-sm focus:outline-none focus:border-white/30 focus:bg-white/12 transition-colors"
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-white/30 hover:text-white/60 transition-colors"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Error / Info banner */}
                        <AuthBanner error={authError} info={authInfo} />

                        {/* Submit */}
                        <button
                          onClick={handleSignIn}
                          disabled={isLoading}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#2D8C7A] to-[#1F6B5C] text-white text-sm font-semibold shadow-lg hover:shadow-xl hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</> : <>Masuk <ChevronRight className="w-4 h-4" /></>}
                        </button>

                        {/* Switch to signup */}
                        <p className="text-center text-[11px] text-white/40 pt-1">
                          Belum punya akun?{' '}
                          <button onClick={() => { setAuthMode('signup'); setAuthError(null); setAuthInfo(null); }} className="text-white/70 hover:text-white underline underline-offset-2">
                            Daftar di sini
                          </button>
                        </p>
                      </div>
                    )}

                    {/* ── SIGN UP FORM ── */}
                    {authMode === 'signup' && (
                      <div className="space-y-3 max-w-md mx-auto">
                        {/* Full Name */}
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                          <input
                            type="text"
                            placeholder="Nama Lengkap"
                            value={signupName}
                            onChange={(e) => { setSignupName(e.target.value); setAuthError(null); }}
                            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/8 border border-white/10 text-white placeholder:text-white/35 text-sm focus:outline-none focus:border-white/30 focus:bg-white/12 transition-colors"
                            disabled={isLoading}
                          />
                        </div>
                        {/* Email */}
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                          <input
                            type="email"
                            autoComplete="email"
                            placeholder="Email"
                            value={signupEmail}
                            onChange={(e) => { setSignupEmail(e.target.value); setAuthError(null); }}
                            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/8 border border-white/10 text-white placeholder:text-white/35 text-sm focus:outline-none focus:border-white/30 focus:bg-white/12 transition-colors"
                            disabled={isLoading}
                          />
                        </div>
                        {/* Phone + Profession */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                            <input
                              type="tel"
                              placeholder="No. HP"
                              value={signupPhone}
                              onChange={(e) => setSignupPhone(e.target.value)}
                              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/8 border border-white/10 text-white placeholder:text-white/35 text-sm focus:outline-none focus:border-white/30 focus:bg-white/12 transition-colors"
                              disabled={isLoading}
                            />
                          </div>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                            <input
                              type="text"
                              placeholder="Profesi"
                              value={signupProfession}
                              onChange={(e) => setSignupProfession(e.target.value)}
                              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/8 border border-white/10 text-white placeholder:text-white/35 text-sm focus:outline-none focus:border-white/30 focus:bg-white/12 transition-colors"
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                        {/* Role selector (all 5 roles) */}
                        <div className="relative">
                          <Shield className="absolute left-3 top-3 w-4 h-4 text-white/30 pointer-events-none" />
                          <select
                            value={signupRole}
                            onChange={(e) => setSignupRole(e.target.value as CareLiviaRole)}
                            disabled={isLoading}
                            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/8 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 focus:bg-white/12 transition-colors appearance-none cursor-pointer [&>option]:text-black"
                          >
                            {ALL_SIGNUP_ROLES.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                        {/* Password */}
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Password (min. 8 karakter)"
                            value={signupPassword}
                            onChange={(e) => { setSignupPassword(e.target.value); setAuthError(null); }}
                            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/8 border border-white/10 text-white placeholder:text-white/35 text-sm focus:outline-none focus:border-white/30 focus:bg-white/12 transition-colors"
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-white/30 hover:text-white/60 transition-colors"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {/* Confirm Password */}
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                          <input
                            type={showConfirm ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Konfirmasi Password"
                            value={signupConfirm}
                            onChange={(e) => { setSignupConfirm(e.target.value); setAuthError(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSignUp(); }}
                            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/8 border border-white/10 text-white placeholder:text-white/35 text-sm focus:outline-none focus:border-white/30 focus:bg-white/12 transition-colors"
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-3 text-white/30 hover:text-white/60 transition-colors"
                            tabIndex={-1}
                          >
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Error / Info banner */}
                        <AuthBanner error={authError} info={authInfo} />

                        {/* Submit */}
                        <button
                          onClick={handleSignUp}
                          disabled={isLoading}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#2D8C7A] to-[#1F6B5C] text-white text-sm font-semibold shadow-lg hover:shadow-xl hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Mendaftarkan...</> : <>Daftar <ChevronRight className="w-4 h-4" /></>}
                        </button>

                        {/* Switch to signin */}
                        <p className="text-center text-[11px] text-white/40 pt-1">
                          Sudah punya akun?{' '}
                          <button onClick={() => { setAuthMode('signin'); setAuthError(null); setAuthInfo(null); }} className="text-white/70 hover:text-white underline underline-offset-2">
                            Masuk di sini
                          </button>
                        </p>
                      </div>
                    )}

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
                          <strong className="text-white/45">Supabase Auth</strong> — Autentikasi aman dengan email & password
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

// ── Auth error/info banner (glass style, matches UI) ────────────────────────
function AuthBanner({ error, info }: { error: string | null; info: string | null }) {
  if (!error && !info) return null;
  return (
    <AnimatePresence>
      {(error || info) && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className={`flex items-start gap-2 p-2.5 rounded-xl text-[11px] leading-relaxed ${
            error
              ? 'bg-red-500/15 border border-red-400/30 text-red-100'
              : 'bg-green-500/15 border border-green-400/30 text-green-100'
          }`}
        >
          {error ? <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
          <span>{error ?? info}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
