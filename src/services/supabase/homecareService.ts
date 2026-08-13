// ───────────────────────────────────────────────────────────────────────────
// homecareService — Supabase CRUD for `homecare_services` + `homecare_bookings`
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, isValidUuid } from './_common';
import { notificationService } from './notificationService';

export interface HomecareServiceRecord {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes?: number;
  isActive: boolean;
}

export interface HomecareBookingRecord {
  id: string;
  patientId: string;
  serviceId: string;
  staffId?: string;
  scheduledAt: string;
  address: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  status: string;
  createdAt: string;
  patient?: { id: string; name: string };
  staff?: { id: string; name: string } | null;
  service?: HomecareServiceRecord;
}

function serviceFromDb(row: any): HomecareServiceRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    price: Number(row.price ?? 0),
    durationMinutes: row.duration_minutes ?? undefined,
    isActive: row.is_active ?? true,
  };
}

function bookingFromDb(row: any): HomecareBookingRecord {
  return {
    id: row.id,
    patientId: row.patient_id,
    serviceId: row.service_id,
    staffId: row.staff_id ?? undefined,
    scheduledAt: row.scheduled_at,
    address: row.address,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    patient: row.patient_profile ? { id: row.patient_id, name: row.patient_profile.full_name } : undefined,
    staff: row.staff_profile ? { id: row.staff_id, name: row.staff_profile.profiles?.full_name } : null,
    service: row.homecare_services ? serviceFromDb(row.homecare_services) : undefined,
  };
}

export const homecareService = {
  async getServices(): Promise<HomecareServiceRecord[]> {
    const rows = await safeQuery(
      supabase.from('homecare_services').select('*').eq('is_active', true).order('name', { ascending: true }),
      [] as any[],
      'homecareService.getServices'
    );
    return (rows as any[]).map(serviceFromDb);
  },

  async getBookings(filters: { status?: string; patientId?: string } = {}): Promise<HomecareBookingRecord[]> {
    let q = supabase
      .from('homecare_bookings')
      .select(
        `*,
         patient_profile:profiles!homecare_bookings_patient_id_fkey(full_name),
         staff_profile:homecare_staff(profiles(full_name)),
         homecare_services(*)`
      )
      .order('created_at', { ascending: false });

    if (filters.status) q = q.eq('status', filters.status);
    if (filters.patientId && isValidUuid(filters.patientId)) q = q.eq('patient_id', filters.patientId);

    const rows = await safeQuery(q, [] as any[], 'homecareService.getBookings');
    return (rows as any[]).map(bookingFromDb);
  },

  async createBooking(input: {
    patientId: string;
    serviceId: string;
    scheduledAt: string;
    address: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
  }): Promise<HomecareBookingRecord | null> {
    const service = await safeQuery(
      supabase.from('homecare_services').select('*').eq('id', input.serviceId).single(),
      null as any,
      'homecareService.createBooking(service lookup)'
    );
    if (!service) throw new Error('Home care service not found');

    const { data: row, error } = await safeInsert<any>(
      supabase
        .from('homecare_bookings')
        .insert({
          patient_id: input.patientId,
          service_id: input.serviceId,
          scheduled_at: input.scheduledAt,
          address: input.address,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          notes: input.notes ?? null,
          status: 'pending',
        })
        .select('*, patient_profile:profiles!homecare_bookings_patient_id_fkey(full_name), staff_profile:homecare_staff(profiles(full_name)), homecare_services(*)')
        .single(),
      'homecareService.createBooking'
    );
    if (error) throw new Error(error);
    if (!row) return null;

    const scheduledLabel = new Date(input.scheduledAt).toLocaleDateString('id-ID');
    await notificationService.create({
      userId: input.patientId,
      title: 'Home Care Dipesan',
      body: `Layanan ${(service as any).name} telah dipesan untuk ${scheduledLabel}. Menunggu konfirmasi.`,
      type: 'homecare',
      data: { bookingId: row.id },
    });

    // Try to auto-assign an available staff member.
    const availableStaff = await safeQuery(
      supabase.from('homecare_staff').select('id').eq('is_available', true).eq('current_status', 'available').limit(1).maybeSingle(),
      null as any,
      'homecareService.createBooking(staff lookup)'
    );
    if (availableStaff) {
      const staffId = (availableStaff as any).id;
      await safeQuery(
        supabase.from('homecare_bookings').update({ staff_id: staffId, status: 'confirmed' }).eq('id', row.id),
        null as any,
        'homecareService.createBooking(assign staff)'
      );
      await notificationService.create({
        userId: staffId,
        title: 'Home Care Baru',
        body: `Anda memiliki jadwal ${(service as any).name} pada ${scheduledLabel} di ${input.address}.`,
        type: 'homecare',
        data: { bookingId: row.id },
      });
      row.status = 'confirmed';
      row.staff_id = staffId;
    }

    return bookingFromDb(row);
  },
};
