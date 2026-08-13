// ───────────────────────────────────────────────────────────────────────────
// seedService — populate demo data for the telemedicine module (dev only)
// ───────────────────────────────────────────────────────────────────────────
// Replaces the Prisma-backed /api/seed. Creating a "doctor" or "patient" now
// means creating a real Supabase Auth user (so they can actually log in) plus
// a `profiles` row and, for doctors, a `doctor_profiles` row. This requires
// the service-role key (admin.createUser bypasses email confirmation), so
// this will return a clear error if SUPABASE_SERVICE_ROLE_KEY isn't set.
// ───────────────────────────────────────────────────────────────────────────
import { getSupabaseAdmin } from '@/supabaseClient';

const DEMO_PASSWORD = 'CareLivia2026!';

interface DemoDoctor {
  email: string;
  name: string;
  phone: string;
  gender: 'male' | 'female';
  specialization: string;
  licenseNumber: string;
  hospital: string;
  experienceYears: number;
  rating: number;
  reviewCount: number;
  consultationFee: number;
  isOnline: boolean;
  bio: string;
  education: string;
}

const DEMO_DOCTORS: DemoDoctor[] = [
  {
    email: 'sarah@carelivia.id', name: 'dr. Sarah Wijaya', phone: '081222220001', gender: 'female',
    specialization: 'umum', licenseNumber: 'STR-001', hospital: 'RS Medika Utama', experienceYears: 8,
    rating: 4.8, reviewCount: 124, consultationFee: 75000, isOnline: true,
    bio: 'Dokter umum berpengalaman dengan spesialisasi penanganan penyakit ringan hingga menengah.',
    education: 'Universitas Indonesia',
  },
  {
    email: 'ahmad@carelivia.id', name: 'dr. Ahmad Rizki', phone: '081222220002', gender: 'male',
    specialization: 'anak', licenseNumber: 'STR-002', hospital: 'RS Anak Harapan', experienceYears: 12,
    rating: 4.9, reviewCount: 203, consultationFee: 100000, isOnline: true,
    bio: 'Dokter spesialis anak dengan fokus tumbuh kembang balita.',
    education: 'Universitas Gadjah Mada',
  },
  {
    email: 'dewi@carelivia.id', name: 'dr. Dewi Lestari', phone: '081222220003', gender: 'female',
    specialization: 'penyakit_dalam', licenseNumber: 'STR-003', hospital: 'RS Paliatif Sejahtera', experienceYears: 10,
    rating: 4.7, reviewCount: 98, consultationFee: 120000, isOnline: false,
    bio: 'Dokter spesialis penyakit dalam dengan minat khusus perawatan paliatif.',
    education: 'Universitas Airlangga',
  },
];

const DEMO_PATIENTS = [
  { email: 'budi.patient@carelivia.id', name: 'Budi Santoso', phone: '081333330001' },
  { email: 'siti.patient@carelivia.id', name: 'Siti Aminah', phone: '081333330002' },
];

const DEMO_MEDICINES = [
  { name: 'Paracetamol 500mg', genericName: 'Paracetamol', category: 'bebas', price: 5000, stock: 500, unit: 'tablet', manufacturer: 'Kimia Farma' },
  { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'resep', price: 15000, stock: 200, unit: 'tablet', manufacturer: 'Kalbe Farma' },
  { name: 'Vitamin C 1000mg', genericName: 'Asam Askorbat', category: 'vitamin', price: 25000, stock: 300, unit: 'tablet', manufacturer: 'Sido Muncul' },
  { name: 'Masker Medis 3-Ply', genericName: undefined, category: 'alat_kesehatan', price: 35000, stock: 1000, unit: 'box', manufacturer: 'Sensi' },
  { name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'resep', price: 12000, stock: 150, unit: 'tablet', manufacturer: 'Dexa Medica' },
];

const DEMO_HOMECARE_SERVICES = [
  { name: 'Perawatan Luka di Rumah', description: 'Kunjungan perawat untuk perawatan luka dan ganti perban.', price: 150000, durationMinutes: 45 },
  { name: 'Pemeriksaan Tanda Vital', description: 'Cek tekanan darah, nadi, suhu, dan saturasi oksigen.', price: 100000, durationMinutes: 30 },
  { name: 'Fisioterapi Rumah', description: 'Sesi fisioterapi untuk pemulihan pasca sakit/operasi.', price: 200000, durationMinutes: 60 },
];

export interface SeedResult {
  message: string;
  counts: Record<string, number>;
}

export const seedService = {
  async run(): Promise<SeedResult> {
    const admin = await getSupabaseAdmin();
    if (!admin) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY belum diisi di .env — dibutuhkan untuk membuat akun demo (admin.createUser). ' +
        'Isi dulu dari Supabase Dashboard → Project Settings → API → service_role secret, lalu coba lagi.'
      );
    }

    // Idempotency check — bail out if doctors already exist.
    const { count: existingDoctors } = await admin
      .from('doctor_profiles')
      .select('*', { head: true, count: 'exact' });
    if ((existingDoctors ?? 0) > 0) {
      return { message: 'Database sudah pernah di-seed. Dilewati.', counts: { doctorProfiles: existingDoctors ?? 0 } };
    }

    const counts: Record<string, number> = { doctors: 0, patients: 0, medicines: 0, homecareServices: 0, homecareStaff: 0, consultations: 0, notifications: 0 };

    // ── Doctors: auth user → profiles → doctor_profiles ──────────────────
    const doctorProfileIds: string[] = [];
    for (const d of DEMO_DOCTORS) {
      const { data: created, error: authErr } = await admin.auth.admin.createUser({
        email: d.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: d.name, role: 'Dokter' },
      });
      if (authErr || !created?.user) {
        console.warn('[seedService] createUser (doctor) failed:', d.email, authErr?.message);
        continue;
      }
      const uid = created.user.id;
      await admin.from('profiles').upsert({
        id: uid, email: d.email, full_name: d.name, role: 'Dokter', phone: d.phone, status: 'Active',
      });
      await admin.from('doctor_profiles').upsert({
        id: uid,
        specialization: d.specialization,
        license_number: d.licenseNumber,
        hospital: d.hospital,
        experience_years: d.experienceYears,
        rating: d.rating,
        review_count: d.reviewCount,
        consultation_fee: d.consultationFee,
        is_online: d.isOnline,
        is_available: true,
        bio: d.bio,
        education: d.education,
      });
      doctorProfileIds.push(uid);
      counts.doctors++;
    }

    // ── Patients: auth user → profiles ────────────────────────────────────
    const patientIds: string[] = [];
    for (const p of DEMO_PATIENTS) {
      const { data: created, error: authErr } = await admin.auth.admin.createUser({
        email: p.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: p.name, role: 'Pasien' },
      });
      if (authErr || !created?.user) {
        console.warn('[seedService] createUser (patient) failed:', p.email, authErr?.message);
        continue;
      }
      const uid = created.user.id;
      await admin.from('profiles').upsert({
        id: uid, email: p.email, full_name: p.name, role: 'Pasien', phone: p.phone, status: 'Active',
      });
      patientIds.push(uid);
      counts.patients++;
    }

    // ── Medicines ──────────────────────────────────────────────────────────
    if (DEMO_MEDICINES.length) {
      const { error } = await admin.from('medicines').insert(
        DEMO_MEDICINES.map((m) => ({
          name: m.name, generic_name: m.genericName ?? null, category: m.category, price: m.price,
          stock: m.stock, unit: m.unit, manufacturer: m.manufacturer, is_active: true,
        }))
      );
      if (!error) counts.medicines = DEMO_MEDICINES.length;
    }

    // ── Home care services ─────────────────────────────────────────────────
    let homecareServiceIds: string[] = [];
    {
      const { data, error } = await admin
        .from('homecare_services')
        .insert(DEMO_HOMECARE_SERVICES.map((s) => ({ name: s.name, description: s.description, price: s.price, duration_minutes: s.durationMinutes, is_active: true })))
        .select('id');
      if (!error && data) {
        homecareServiceIds = data.map((r: any) => r.id);
        counts.homecareServices = data.length;
      }
    }

    // ── One home care staff member (reuse the second doctor's auth account
    //    would be wrong — create a dedicated staff account). ────────────────
    {
      const { data: created, error: authErr } = await admin.auth.admin.createUser({
        email: 'perawat.homecare@carelivia.id',
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: 'Ns. Rina Marlina', role: 'Perawat' },
      });
      if (!authErr && created?.user) {
        const uid = created.user.id;
        await admin.from('profiles').upsert({ id: uid, email: 'perawat.homecare@carelivia.id', full_name: 'Ns. Rina Marlina', role: 'Perawat', status: 'Active' });
        await admin.from('homecare_staff').upsert({ id: uid, certification: 'Perawat Homecare Bersertifikat', is_available: true, current_status: 'available' });
        counts.homecareStaff = 1;
      }
    }

    // ── A couple of sample consultations + notifications ──────────────────
    if (doctorProfileIds.length && patientIds.length) {
      const { data: consult } = await admin
        .from('consultations')
        .insert({ patient_id: patientIds[0], doctor_id: doctorProfileIds[0], type: 'chat', status: 'active', notes: 'Konsultasi demo.' })
        .select('id')
        .single();
      if (consult) {
        counts.consultations = 1;
        await admin.from('consultation_messages').insert([
          { consultation_id: consult.id, sender_id: patientIds[0], content: 'Selamat pagi dok, saya mau konsultasi.', type: 'text', status: 'read' },
          { consultation_id: consult.id, sender_id: doctorProfileIds[0], content: 'Selamat pagi, silakan ceritakan keluhannya.', type: 'text', status: 'delivered' },
        ]);
      }

      const { error: notifErr } = await admin.from('notifications').insert([
        { user_id: patientIds[0], title: 'Konsultasi Aktif', body: `Konsultasi Anda dengan ${DEMO_DOCTORS[0].name} sedang berlangsung.`, type: 'consultation', is_read: false },
        { user_id: doctorProfileIds[0], title: 'Pasien Baru', body: `${DEMO_PATIENTS[0].name} memulai konsultasi dengan Anda.`, type: 'consultation', is_read: false },
      ]);
      if (!notifErr) counts.notifications = 2;
    }

    return {
      message: `Seeding selesai. Password demo untuk semua akun: ${DEMO_PASSWORD}`,
      counts,
    };
  },
};
