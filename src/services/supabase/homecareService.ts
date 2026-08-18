// ───────────────────────────────────────────────────────────────────────────
// homecareService — Supabase CRUD for `homecare_services` + `homecare_bookings`
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, isValidUuid } from './_common';
import { notificationService } from './notificationService';
import { paymentService, type PaymentRecord } from './paymentService';

export interface HomecareServiceRecord {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  durationMinutes?: number;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface HomecareServiceInput {
  name: string;
  category: string;
  description?: string;
  price: number;
  durationMinutes?: number;
  isActive?: boolean;
  displayOrder?: number;
  updatedBy?: string;
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
  // Admin validation gate — see migration_homecare_admin_validation.sql.
  // A booking cannot be paid until this is true.
  adminValidated: boolean;
  validatedAt?: string;
  validatedBy?: string;
  patient?: { id: string; name: string; phone?: string };
  staff?: { id: string; name: string } | null;
  service?: HomecareServiceRecord;
}

function serviceFromDb(row: any): HomecareServiceRecord {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? 'Lainnya',
    description: row.description ?? undefined,
    price: Number(row.price ?? 0),
    durationMinutes: row.duration_minutes ?? undefined,
    isActive: row.is_active ?? true,
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
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
    adminValidated: row.admin_validated ?? false,
    validatedAt: row.validated_at ?? undefined,
    validatedBy: row.validated_by ?? undefined,
    patient: row.patient_profile ? { id: row.patient_id, name: row.patient_profile.full_name, phone: row.patient_profile.phone ?? undefined } : undefined,
    staff: row.staff_profile ? { id: row.staff_id, name: row.staff_profile.profiles?.full_name } : null,
    service: row.homecare_services ? serviceFromDb(row.homecare_services) : undefined,
  };
}

export const homecareService = {
  /** Public/patient-facing: only ACTIVE services, in display order. */
  async getServices(): Promise<HomecareServiceRecord[]> {
    const rows = await safeQuery(
      supabase.from('homecare_services').select('*').eq('is_active', true).order('display_order', { ascending: true }).order('name', { ascending: true }),
      [] as any[],
      'homecareService.getServices'
    );
    return (rows as any[]).map(serviceFromDb);
  },

  /** Admin-facing: ALL services (active + inactive), for the management table. */
  async getAllServicesForAdmin(): Promise<HomecareServiceRecord[]> {
    const rows = await safeQuery(
      supabase.from('homecare_services').select('*').order('display_order', { ascending: true }).order('name', { ascending: true }),
      [] as any[],
      'homecareService.getAllServicesForAdmin'
    );
    return (rows as any[]).map(serviceFromDb);
  },

  /** Admin: create a new master home care service. Source of truth for the patient catalog. */
  async createService(input: HomecareServiceInput): Promise<HomecareServiceRecord | null> {
    const { data: row, error } = await safeInsert<any>(
      supabase
        .from('homecare_services')
        .insert({
          name: input.name,
          category: input.category,
          description: input.description ?? null,
          price: input.price,
          duration_minutes: input.durationMinutes ?? null,
          is_active: input.isActive ?? true,
          display_order: input.displayOrder ?? 0,
          created_by: input.updatedBy ?? null,
          updated_by: input.updatedBy ?? null,
        })
        .select()
        .single(),
      'homecareService.createService'
    );
    if (error) throw new Error(error);
    return row ? serviceFromDb(row) : null;
  },

  /** Admin: update name/price/etc. Existing bookings keep their own price snapshot, unaffected. */
  async updateService(id: string, input: Partial<HomecareServiceInput>): Promise<HomecareServiceRecord | null> {
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) payload.name = input.name;
    if (input.category !== undefined) payload.category = input.category;
    if (input.description !== undefined) payload.description = input.description;
    if (input.price !== undefined) payload.price = input.price;
    if (input.durationMinutes !== undefined) payload.duration_minutes = input.durationMinutes;
    if (input.isActive !== undefined) payload.is_active = input.isActive;
    if (input.displayOrder !== undefined) payload.display_order = input.displayOrder;
    if (input.updatedBy !== undefined) payload.updated_by = input.updatedBy;

    // .maybeSingle() instead of .single(): if `id` doesn't match any row
    // (stale id, RLS denial, etc.) this returns { data: null, error: null }
    // instead of throwing the opaque "Cannot coerce the result to a single
    // JSON object" error — the caller can then say clearly "not found"
    // rather than showing a generic Supabase error to the admin.
    const { data: row, error } = await safeInsert<any>(
      supabase.from('homecare_services').update(payload).eq('id', id).select().maybeSingle(),
      'homecareService.updateService'
    );
    if (error) throw new Error(error);
    if (!row) throw new Error('Layanan tidak ditemukan (mungkin sudah dihapus oleh admin lain).');
    return serviceFromDb(row);
  },

  /**
   * Admin: delete a service.
   * - If it has never been used in a booking → hard delete.
   * - If it HAS been used → soft delete (is_active=false) so historical
   *   bookings/invoices keep showing the real service name/price.
   * Returns which kind of delete actually happened.
   */
  async deleteService(id: string): Promise<{ hardDeleted: boolean }> {
    let inUse = false;
    try {
      const { count, error: countError } = await supabase
        .from('homecare_bookings')
        .select('id', { head: true, count: 'exact' })
        .eq('service_id', id);
      if (countError) {
        console.warn('[Supabase:homecareService.deleteService(usage check)]', countError.message);
      } else {
        inUse = (count ?? 0) > 0;
      }
    } catch (e: any) {
      console.warn('[Supabase:homecareService.deleteService(usage check)] threw', e?.message ?? e);
    }

    if (inUse) {
      const { error } = await safeInsert<any>(
        supabase.from('homecare_services').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle(),
        'homecareService.deleteService(soft)'
      );
      if (error) throw new Error(error);
      return { hardDeleted: false };
    }

    try {
      const { error } = await supabase.from('homecare_services').delete().eq('id', id);
      if (error) throw new Error(error.message);
    } catch (e: any) {
      console.error('[Supabase:homecareService.deleteService(hard)]', e?.message ?? e);
      throw new Error(e?.message ?? 'Gagal menghapus layanan');
    }
    return { hardDeleted: true };
  },

  async getBookings(filters: { status?: string; patientId?: string; staffId?: string } = {}): Promise<HomecareBookingRecord[]> {
    let q = supabase
      .from('homecare_bookings')
      .select(
        `*,
         patient_profile:profiles!homecare_bookings_patient_id_fkey(full_name, phone),
         staff_profile:homecare_staff(profiles(full_name)),
         homecare_services(*)`
      )
      .order('created_at', { ascending: false });

    if (filters.status) q = q.eq('status', filters.status);
    if (filters.patientId && isValidUuid(filters.patientId)) q = q.eq('patient_id', filters.patientId);
    if (filters.staffId && isValidUuid(filters.staffId)) q = q.eq('staff_id', filters.staffId);

    const rows = await safeQuery(q, [] as any[], 'homecareService.getBookings');
    return (rows as any[]).map(bookingFromDb);
  },

  /**
   * Update a booking's status (e.g. staff checking in, marking on-the-way,
   * completing the visit). Replaces the old homecare-staff-panel.tsx flow,
   * which only fired a toast — check-in, "tiba di lokasi", and "selesai"
   * never touched the database, so a booking could sit at 'confirmed'
   * forever no matter what a staff member did in the app.
   */
  async updateBookingStatus(bookingId: string, status: string): Promise<HomecareBookingRecord | null> {
    if (!isValidUuid(bookingId)) throw new Error('bookingId tidak valid');
    const { data: row, error } = await safeInsert<any>(
      supabase
        .from('homecare_bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .select('*, patient_profile:profiles!homecare_bookings_patient_id_fkey(full_name, phone), staff_profile:homecare_staff(profiles(full_name)), homecare_services(*)')
        .maybeSingle(),
      'homecareService.updateBookingStatus'
    );
    if (error) throw new Error(error);
    if (!row) throw new Error(`Booking dengan id=${bookingId} tidak ditemukan.`);
    return bookingFromDb(row);
  },

  async createBooking(input: {
    patientId: string;
    serviceId: string;
    scheduledAt: string;
    address: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
  }): Promise<{ booking: HomecareBookingRecord; payment: PaymentRecord | null } | null> {
    const service = await safeQuery(
      supabase.from('homecare_services').select('*').eq('id', input.serviceId).eq('is_active', true).maybeSingle(),
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
          // Price/name SNAPSHOT at the moment of booking — if an admin later
          // edits this service's name or price, this booking (and its
          // invoice) keeps showing what the patient actually agreed to pay.
          service_name_snapshot: (service as any).name,
          unit_price: (service as any).price,
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
      body: `Layanan ${(service as any).name} telah dipesan untuk ${scheduledLabel}. Menunggu validasi admin sebelum pembayaran dapat dilakukan.`,
      type: 'homecare',
      data: { bookingId: row.id },
    });

    // NOTE: staff auto-assignment and pending-payment creation used to
    // happen right here at booking time — before any admin ever looked at
    // the booking. That's been moved into validateBooking() below: a
    // booking now stays 'pending' / admin_validated=false until an admin
    // explicitly approves it, and ONLY THEN does a payment appear and can
    // the patient pay. See migration_homecare_admin_validation.sql.
    return { booking: bookingFromDb(row), payment: null };
  },

  /**
   * List bookings still waiting on admin review (admin_validated=false,
   * not yet cancelled). Powers the admin "Validasi Home Care" queue.
   */
  async getPendingValidation(): Promise<HomecareBookingRecord[]> {
    const rows = await safeQuery(
      supabase
        .from('homecare_bookings')
        .select(
          `*,
           patient_profile:profiles!homecare_bookings_patient_id_fkey(full_name, phone),
           staff_profile:homecare_staff(profiles(full_name)),
           homecare_services(*)`
        )
        .eq('admin_validated', false)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true }),
      [] as any[],
      'homecareService.getPendingValidation'
    );
    return (rows as any[]).map(bookingFromDb);
  },

  /**
   * Admin approves a booking. This is the ONLY place a Home Care pending
   * payment gets created — a patient cannot pay for a booking an admin
   * hasn't validated yet. Also auto-assigns an available staff member and
   * moves the booking to 'confirmed', same as the old at-checkout behavior,
   * just moved to happen after admin approval instead of before it.
   */
  async validateBooking(bookingId: string, adminId?: string): Promise<{ booking: HomecareBookingRecord; payment: PaymentRecord | null }> {
    if (!isValidUuid(bookingId)) throw new Error('bookingId tidak valid');

    const existing = await safeQuery(
      supabase.from('homecare_bookings').select('*, homecare_services(*)').eq('id', bookingId).maybeSingle(),
      null as any,
      'homecareService.validateBooking(lookup)'
    );
    if (!existing) throw new Error('Booking tidak ditemukan.');
    const bookingRow = existing as any;
    if (bookingRow.admin_validated) {
      throw new Error('Booking ini sudah divalidasi sebelumnya.');
    }
    if (bookingRow.status === 'cancelled') {
      throw new Error('Booking ini sudah dibatalkan.');
    }

    const service = bookingRow.homecare_services;
    const scheduledLabel = new Date(bookingRow.scheduled_at).toLocaleDateString('id-ID');

    const updatePayload: Record<string, any> = {
      admin_validated: true,
      validated_at: new Date().toISOString(),
      validated_by: adminId && isValidUuid(adminId) ? adminId : null,
      updated_at: new Date().toISOString(),
    };

    // Try to auto-assign an available staff member, same as before — just
    // now happening at validation time instead of at checkout.
    const availableStaff = await safeQuery(
      supabase.from('homecare_staff').select('id').eq('is_available', true).eq('current_status', 'available').limit(1).maybeSingle(),
      null as any,
      'homecareService.validateBooking(staff lookup)'
    );
    if (availableStaff) {
      updatePayload.staff_id = (availableStaff as any).id;
      updatePayload.status = 'confirmed';
    }

    const { data: updatedRow, error } = await safeInsert<any>(
      supabase
        .from('homecare_bookings')
        .update(updatePayload)
        .eq('id', bookingId)
        .select('*, patient_profile:profiles!homecare_bookings_patient_id_fkey(full_name, phone), staff_profile:homecare_staff(profiles(full_name)), homecare_services(*)')
        .maybeSingle(),
      'homecareService.validateBooking(update)'
    );
    if (error) throw new Error(error);
    if (!updatedRow) throw new Error('Booking tidak ditemukan.');

    if (updatePayload.staff_id) {
      await notificationService.create({
        userId: updatePayload.staff_id,
        title: 'Home Care Baru',
        body: `Anda memiliki jadwal ${service?.name ?? 'Home Care'} pada ${scheduledLabel} di ${bookingRow.address}.`,
        type: 'homecare',
        data: { bookingId },
      });
    }

    // NOW create the pending payment — this is the gate the patient was
    // waiting on. Uses the price snapshotted at booking time so it matches
    // what the patient actually agreed to, even if the service's price has
    // since changed.
    let payment: PaymentRecord | null = null;
    try {
      const price = Number(bookingRow.unit_price ?? service?.price ?? 0);
      if (price > 0) {
        payment = await paymentService.createPending({
          userId: bookingRow.patient_id,
          referenceType: 'homecare_booking',
          referenceId: bookingId,
          amount: price,
        });
      }
    } catch (payErr) {
      console.error('[homecareService.validateBooking] failed to create pending payment:', payErr);
    }

    await notificationService.create({
      userId: bookingRow.patient_id,
      title: 'Home Care Divalidasi',
      body: payment
        ? `Booking ${service?.name ?? 'Home Care'} Anda telah divalidasi admin. Silakan lakukan pembayaran (${payment.invoiceNumber}).`
        : `Booking ${service?.name ?? 'Home Care'} Anda telah divalidasi admin.`,
      type: 'homecare',
      data: { bookingId, paymentId: payment?.id },
    });

    return { booking: bookingFromDb(updatedRow), payment };
  },

  /** Admin rejects a booking that hasn't been validated yet. */
  async rejectBooking(bookingId: string, reason?: string): Promise<HomecareBookingRecord> {
    if (!isValidUuid(bookingId)) throw new Error('bookingId tidak valid');
    const { data: row, error } = await safeInsert<any>(
      supabase
        .from('homecare_bookings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .select('*, patient_profile:profiles!homecare_bookings_patient_id_fkey(full_name, phone), staff_profile:homecare_staff(profiles(full_name)), homecare_services(*)')
        .maybeSingle(),
      'homecareService.rejectBooking'
    );
    if (error) throw new Error(error);
    if (!row) throw new Error('Booking tidak ditemukan.');

    await notificationService.create({
      userId: row.patient_id,
      title: 'Home Care Ditolak',
      body: reason
        ? `Booking ${row.homecare_services?.name ?? 'Home Care'} Anda ditolak admin: ${reason}`
        : `Booking ${row.homecare_services?.name ?? 'Home Care'} Anda ditolak admin.`,
      type: 'homecare',
      data: { bookingId },
    });

    return bookingFromDb(row);
  },
};
