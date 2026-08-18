// ───────────────────────────────────────────────────────────────────────────
// homecareService — Supabase CRUD for `homecare_services` + `homecare_bookings`
// ───────────────────────────────────────────────────────────────────────────
import { safeQuery, safeInsert, isValidUuid, getDbClient } from './_common';
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

export interface HomecareStaffRecord {
  id: string;
  name: string;
  phone?: string;
  certification?: string;
  isAvailable: boolean;
  currentStatus: string;
  /** How many active (not completed/cancelled) bookings this staff member currently has. */
  activeBookingCount: number;
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
    const db = await getDbClient();
    const rows = await safeQuery(
      db.from('homecare_services').select('*').eq('is_active', true).order('display_order', { ascending: true }).order('name', { ascending: true }),
      [] as any[],
      'homecareService.getServices'
    );
    return (rows as any[]).map(serviceFromDb);
  },

  /** Admin-facing: ALL services (active + inactive), for the management table. */
  async getAllServicesForAdmin(): Promise<HomecareServiceRecord[]> {
    const db = await getDbClient();
    const rows = await safeQuery(
      db.from('homecare_services').select('*').order('display_order', { ascending: true }).order('name', { ascending: true }),
      [] as any[],
      'homecareService.getAllServicesForAdmin'
    );
    return (rows as any[]).map(serviceFromDb);
  },

  /** Admin: create a new master home care service. Source of truth for the patient catalog. */
  async createService(input: HomecareServiceInput): Promise<HomecareServiceRecord | null> {
    const db = await getDbClient();
    const { data: row, error } = await safeInsert<any>(
      db
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
    const db = await getDbClient();
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
      db.from('homecare_services').update(payload).eq('id', id).select().maybeSingle(),
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
    const db = await getDbClient();
    let inUse = false;
    try {
      const { count, error: countError } = await db
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
        db.from('homecare_services').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle(),
        'homecareService.deleteService(soft)'
      );
      if (error) throw new Error(error);
      return { hardDeleted: false };
    }

    try {
      const { error } = await db.from('homecare_services').delete().eq('id', id);
      if (error) throw new Error(error.message);
    } catch (e: any) {
      console.error('[Supabase:homecareService.deleteService(hard)]', e?.message ?? e);
      throw new Error(e?.message ?? 'Gagal menghapus layanan');
    }
    return { hardDeleted: true };
  },

  async getBookings(filters: { status?: string; patientId?: string; staffId?: string } = {}): Promise<HomecareBookingRecord[]> {
    const db = await getDbClient();
    let q = db
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
   * List every Home Care field staff account — every `profiles` row with
   * role Perawat/Caregiver, NOT just rows that already have a matching
   * `homecare_staff` row. This is deliberately more defensive than reading
   * `homecare_staff` alone: an account created before this feature existed,
   * or one whose signup-time `homecare_staff` upsert silently failed (e.g.
   * SUPABASE_SERVICE_ROLE_KEY wasn't set yet at the time), would otherwise
   * be a real registered nurse/caregiver who never shows up in the admin's
   * "Tugaskan Petugas" picker and can never receive a booking — which is
   * exactly the bug this fixes. Any staff-role profile missing its
   * `homecare_staff` row gets one created right here, on read, with safe
   * defaults — so the list is always complete regardless of how or when
   * the account was created.
   */
  async getAllStaff(): Promise<HomecareStaffRecord[]> {
    const db = await getDbClient();
    const profileRows = await safeQuery(
      db.from('profiles').select('id, full_name, phone, role').in('role', ['Perawat', 'Caregiver']),
      [] as any[],
      'homecareService.getAllStaff(profiles)'
    );
    if ((profileRows as any[]).length === 0) return [];

    const ids = (profileRows as any[]).map((p) => p.id);
    const staffRows = await safeQuery(
      db.from('homecare_staff').select('id, certification, is_available, current_status').in('id', ids),
      [] as any[],
      'homecareService.getAllStaff(homecare_staff)'
    );
    const staffMap = new Map<string, any>((staffRows as any[]).map((r) => [r.id, r]));

    const missing = (profileRows as any[]).filter((p) => !staffMap.has(p.id));
    for (const p of missing) {
      const { data: created, error } = await safeInsert<any>(
        db
          .from('homecare_staff')
          .insert({ id: p.id, certification: p.role, is_available: true, current_status: 'available' })
          .select()
          .maybeSingle(),
        'homecareService.getAllStaff(self-heal insert)'
      );
      if (error) {
        console.warn('[homecareService.getAllStaff] self-heal insert failed for', p.id, error);
      } else if (created) {
        staffMap.set(p.id, created);
      }
    }

    const staffList: Omit<HomecareStaffRecord, 'activeBookingCount'>[] = (profileRows as any[]).map((p) => {
      const s = staffMap.get(p.id);
      return {
        id: p.id,
        name: p.full_name ?? 'Petugas',
        phone: p.phone ?? undefined,
        certification: s?.certification ?? p.role,
        isAvailable: s?.is_available ?? true,
        currentStatus: s?.current_status ?? 'available',
      };
    });

    // Active-booking counts, so the admin can see at a glance who's already
    // loaded up versus who's free — a simple `count` group-by via Supabase's
    // query builder rather than an extra round trip per staff member.
    const counts = await safeQuery(
      db
        .from('homecare_bookings')
        .select('staff_id')
        .in('staff_id', staffList.map((s) => s.id))
        .neq('status', 'completed')
        .neq('status', 'cancelled'),
      [] as any[],
      'homecareService.getAllStaff(active counts)'
    );
    const countMap = new Map<string, number>();
    for (const row of counts as any[]) {
      countMap.set(row.staff_id, (countMap.get(row.staff_id) ?? 0) + 1);
    }

    return staffList.map((s) => ({ ...s, activeBookingCount: countMap.get(s.id) ?? 0 }));
  },

  /**
   * Admin manually assigns (or reassigns) a specific staff member to a
   * validated booking. This is the explicit control the auto-assign at
   * validation time doesn't give: if no staff was free when the booking was
   * validated, or the admin simply wants to route it to someone specific,
   * this is how they do it — instead of the booking sitting at "Belum
   * ditugaskan" forever.
   */
  async assignStaff(bookingId: string, staffId: string): Promise<HomecareBookingRecord> {
    if (!isValidUuid(bookingId)) throw new Error('bookingId tidak valid');
    if (!isValidUuid(staffId)) throw new Error('staffId tidak valid');
    const db = await getDbClient();

    const staff = await safeQuery(
      db.from('homecare_staff').select('id').eq('id', staffId).maybeSingle(),
      null as any,
      'homecareService.assignStaff(staff lookup)'
    );
    if (!staff) throw new Error('Petugas tidak ditemukan.');

    const existing = await safeQuery(
      db.from('homecare_bookings').select('status, admin_validated, homecare_services(name)').eq('id', bookingId).maybeSingle(),
      null as any,
      'homecareService.assignStaff(booking lookup)'
    );
    if (!existing) throw new Error('Booking tidak ditemukan.');
    const bookingRow = existing as any;
    if (bookingRow.status === 'cancelled') throw new Error('Booking ini sudah dibatalkan.');
    if (bookingRow.status === 'completed') throw new Error('Booking ini sudah selesai.');

    const updatePayload: Record<string, any> = { staff_id: staffId, updated_at: new Date().toISOString() };
    // A validated-but-unassigned booking is still sitting at 'pending' —
    // assigning staff is what actually moves it forward operationally.
    if (bookingRow.status === 'pending' && bookingRow.admin_validated) {
      updatePayload.status = 'confirmed';
    }

    const { data: row, error } = await safeInsert<any>(
      db
        .from('homecare_bookings')
        .update(updatePayload)
        .eq('id', bookingId)
        .select('*, patient_profile:profiles!homecare_bookings_patient_id_fkey(full_name, phone), staff_profile:homecare_staff(profiles(full_name)), homecare_services(*)')
        .maybeSingle(),
      'homecareService.assignStaff(update)'
    );
    if (error) throw new Error(error);
    if (!row) throw new Error('Booking tidak ditemukan.');

    await notificationService.create({
      userId: staffId,
      title: 'Home Care Baru Ditugaskan',
      body: `Anda ditugaskan untuk layanan ${row.homecare_services?.name ?? 'Home Care'} pada ${new Date(row.scheduled_at).toLocaleDateString('id-ID')} di ${row.address}.`,
      type: 'homecare',
      data: { bookingId },
    }).catch((e) => console.error('[homecareService.assignStaff] staff notification failed:', e));

    return bookingFromDb(row);
  },

  /**
   * Update a booking's status (e.g. staff heading to location, arriving,
   * completing the visit). Replaces the old homecare-staff-panel.tsx flow,
   * which only fired a toast — the transitions below never touched the
   * database, so a booking could sit at 'confirmed' forever no matter what
   * a staff member did in the app.
   *
   * Two behaviors added on top of the plain status update:
   *  - Moving to 'on_the_way' (petugas menuju lokasi pasien) is BLOCKED
   *    unless the booking's payment has actually succeeded — a staff
   *    member can't head out for a booking the patient hasn't paid for yet.
   *  - The patient gets a real-time notification on each meaningful
   *    transition (on the way / arrived / completed), so they know without
   *    needing to refresh.
   */
  async updateBookingStatus(bookingId: string, status: string): Promise<HomecareBookingRecord | null> {
    if (!isValidUuid(bookingId)) throw new Error('bookingId tidak valid');
    const db = await getDbClient();

    if (status === 'on_the_way') {
      const payment = await safeQuery(
        db
          .from('payments')
          .select('status')
          .eq('reference_type', 'homecare_booking')
          .eq('reference_id', bookingId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        null as any,
        'homecareService.updateBookingStatus(payment check)'
      );
      if (!payment || (payment as any).status !== 'success') {
        throw new Error('Booking ini belum dibayar oleh pasien. Petugas tidak dapat menuju lokasi sebelum pembayaran berhasil.');
      }
    }

    const { data: row, error } = await safeInsert<any>(
      db
        .from('homecare_bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .select('*, patient_profile:profiles!homecare_bookings_patient_id_fkey(full_name, phone), staff_profile:homecare_staff(profiles(full_name)), homecare_services(*)')
        .maybeSingle(),
      'homecareService.updateBookingStatus'
    );
    if (error) throw new Error(error);
    if (!row) throw new Error(`Booking dengan id=${bookingId} tidak ditemukan.`);

    // Let the patient know in real time — they were otherwise only ever
    // told "Menunggu konfirmasi" at booking time and never heard from the
    // app again until the visit was already over.
    const patientNotif: Record<string, { title: string; body: string }> = {
      on_the_way: {
        title: 'Petugas Menuju Lokasi Anda',
        body: `Petugas Home Care untuk layanan ${row.homecare_services?.name ?? ''} sedang dalam perjalanan menuju lokasi Anda.`,
      },
      in_progress: {
        title: 'Petugas Telah Tiba',
        body: `Petugas Home Care telah tiba di lokasi Anda untuk layanan ${row.homecare_services?.name ?? ''}.`,
      },
      completed: {
        title: 'Home Care Selesai',
        body: `Layanan ${row.homecare_services?.name ?? ''} telah selesai dilaksanakan. Terima kasih telah menggunakan CareLivia.`,
      },
      cancelled: {
        title: 'Home Care Dibatalkan',
        body: `Booking ${row.homecare_services?.name ?? ''} Anda telah dibatalkan.`,
      },
    };
    const notif = patientNotif[status];
    if (notif && row.patient_id) {
      await notificationService.create({
        userId: row.patient_id,
        title: notif.title,
        body: notif.body,
        type: 'homecare',
        data: { bookingId },
      }).catch((e) => console.error('[homecareService.updateBookingStatus] patient notification failed:', e));
    }

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
    const db = await getDbClient();
    const service = await safeQuery(
      db.from('homecare_services').select('*').eq('id', input.serviceId).eq('is_active', true).maybeSingle(),
      null as any,
      'homecareService.createBooking(service lookup)'
    );
    if (!service) throw new Error('Home care service not found');

    const { data: row, error } = await safeInsert<any>(
      db
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
    const db = await getDbClient();
    const rows = await safeQuery(
      db
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
    const db = await getDbClient();

    const existing = await safeQuery(
      db.from('homecare_bookings').select('*, homecare_services(*)').eq('id', bookingId).maybeSingle(),
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
      db.from('homecare_staff').select('id').eq('is_available', true).eq('current_status', 'available').limit(1).maybeSingle(),
      null as any,
      'homecareService.validateBooking(staff lookup)'
    );
    if (availableStaff) {
      updatePayload.staff_id = (availableStaff as any).id;
      updatePayload.status = 'confirmed';
    }

    const { data: updatedRow, error } = await safeInsert<any>(
      db
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
    const db = await getDbClient();
    const { data: row, error } = await safeInsert<any>(
      db
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
