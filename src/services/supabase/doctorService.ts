// ───────────────────────────────────────────────────────────────────────────
// doctorService — Supabase CRUD for `doctor_profiles` (joined with `profiles`)
// ───────────────────────────────────────────────────────────────────────────
//
// Replaces the old Prisma-backed /api/doctors route. A "doctor" is a
// `profiles` row with role='Dokter' that has a matching `doctor_profiles`
// row holding telemedicine-specific fields (specialization, fee, rating…).
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, isValidUuid } from './_common';

export interface DoctorRecord {
  id: string; // profiles.id (= auth.users.id)
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  role: 'doctor';
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  doctorProfile: {
    id: string;
    userId: string;
    specialization: string;
    licenseNumber?: string;
    hospital?: string;
    experience?: number;
    rating: number;
    reviewCount: number;
    consultationFee: number;
    isOnline: boolean;
    isAvailable: boolean;
    bio?: string;
    education?: string;
  };
}

// `doctor_profiles` row with its parent `profiles` row nested under `profiles`.
function fromDb(row: any): DoctorRecord {
  const p = row.profiles ?? {};
  return {
    id: row.id,
    email: p.email ?? '',
    name: p.full_name ?? '',
    avatar: undefined,
    phone: p.phone ?? undefined,
    role: 'doctor',
    isVerified: p.status === 'Active',
    isActive: p.status !== 'Suspended',
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    doctorProfile: {
      id: row.id,
      userId: row.id,
      specialization: row.specialization ?? 'umum',
      licenseNumber: row.license_number ?? undefined,
      hospital: row.hospital ?? undefined,
      experience: row.experience_years ?? undefined,
      rating: Number(row.rating ?? 0),
      reviewCount: row.review_count ?? 0,
      consultationFee: Number(row.consultation_fee ?? 0),
      isOnline: !!row.is_online,
      isAvailable: !!row.is_available,
      bio: row.bio ?? undefined,
      education: row.education ?? undefined,
    },
  };
}

export interface DoctorFilters {
  specialization?: string;
  isOnline?: boolean;
}

export const doctorService = {
  async getAll(filters: DoctorFilters = {}): Promise<DoctorRecord[]> {
    let q = supabase
      .from('doctor_profiles')
      .select('*, profiles(email, full_name, phone, status)')
      .order('rating', { ascending: false });

    if (filters.specialization) q = q.eq('specialization', filters.specialization);
    if (filters.isOnline) q = q.eq('is_online', true);

    const rows = await safeQuery(q, [] as any[], 'doctorService.getAll');
    return (rows as any[]).map(fromDb);
  },

  async getById(id: string): Promise<DoctorRecord | null> {
    if (!isValidUuid(id)) return null;
    const row = await safeQuery(
      supabase
        .from('doctor_profiles')
        .select('*, profiles(email, full_name, phone, status)')
        .eq('id', id)
        .single(),
      null as any,
      'doctorService.getById'
    );
    return row ? fromDb(row) : null;
  },

  /**
   * Get the internal `doctor_profiles.id` for a given `profiles.id` (they're
   * the same UUID by design, but this also confirms the doctor profile
   * exists before we let a caller reference it as a foreign key).
   */
  async resolveDoctorProfileId(profileId: string): Promise<string | null> {
    if (!isValidUuid(profileId)) return null;
    const row = await safeQuery(
      supabase.from('doctor_profiles').select('id').eq('id', profileId).single(),
      null as any,
      'doctorService.resolveDoctorProfileId'
    );
    return row ? (row as any).id : null;
  },

  async upsert(profileId: string, data: Record<string, any>): Promise<DoctorRecord | null> {
    if (!isValidUuid(profileId)) return null;
    const payload = { id: profileId, ...data };
    const { data: row, error } = await safeInsert<any>(
      supabase.from('doctor_profiles').upsert(payload).select('*, profiles(email, full_name, phone, status)').single(),
      'doctorService.upsert'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },
};
