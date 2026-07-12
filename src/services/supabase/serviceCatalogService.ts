// ───────────────────────────────────────────────────────────────────────────
// serviceCatalogService — CRUD for the Admin "Kelola Harga → Tambah Layanan"
// ───────────────────────────────────────────────────────────────────────────
//
// STORAGE STRATEGY
// ─────────────────
// DDL access is unavailable in this runtime (no service-role key), so we
// cannot create a dedicated `services` table. Instead we reuse the existing
// `notifications` table, which has the perfect shape for a generic catalog:
//
//   notifications(
//     id          uuid PK,
//     user_id     text NOT NULL,      -- we use the marker '__service_catalog__'
//     patient_id  uuid  NULLABLE,     -- NULL for catalog rows
//     title       text  NOT NULL,     -- nama_layanan
//     body        text,               -- deskripsi
//     type        text  DEFAULT 'info', -- we use 'service'
//     is_read     bool  DEFAULT false,  -- unused for catalog rows
//     data        jsonb,              -- { kategori, harga, durasi, status, created_by, updated_at }
//     created_at  timestamptz
//   )
//
// The `notifications` table is already marked [REALTIME] in schema.sql and
// has permissive RLS policies, so CRUD + realtime work out-of-the-box.
//
// The DDL for a future dedicated `services` table is documented in
// supabase/schema.sql for when DDL access becomes available.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, isValidUuid, validUuidOrUndefined } from './_common';

// ── Types ───────────────────────────────────────────────────────────────────

export type ServiceStatus = 'Aktif' | 'Nonaktif';

export interface ServiceItem {
  id: string;
  namaLayanan: string;
  kategori: string;
  harga: number;
  durasi: number;
  status: ServiceStatus;
  deskripsi?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceInput {
  namaLayanan: string;
  kategori: string;
  harga: number;
  durasi: number;
  status: ServiceStatus;
  deskripsi?: string;
  createdBy?: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

const CATALOG_USER_ID = '__service_catalog__';
const CATALOG_TYPE = 'service';

export const SERVICE_CATEGORIES = [
  'Konsultasi',
  'Home Care',
  'Telemedicine',
  'Pemeriksaan Penunjang',
  'Laboratorium',
  'Radiologi',
  'Keperawatan',
  'Tindakan Medis',
  'Paket Paliatif',
  'Lainnya',
] as const;

// ── Row mapping ─────────────────────────────────────────────────────────────

function fromDb(row: any): ServiceItem {
  const data = (row.data ?? {}) as Record<string, any>;
  return {
    id: row.id,
    namaLayanan: row.title ?? '',
    kategori: data.kategori ?? 'Lainnya',
    harga: Number(data.harga ?? 0),
    durasi: Number(data.durasi ?? 0),
    status: (data.status as ServiceStatus) ?? 'Aktif',
    deskripsi: row.body ?? undefined,
    createdBy: data.createdBy ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? row.created_at ?? new Date().toISOString(),
  };
}

function toDb(input: Partial<ServiceInput>): Record<string, any> {
  const data: Record<string, any> = {};
  if (input.kategori !== undefined) data.kategori = input.kategori;
  if (input.harga !== undefined) data.harga = input.harga;
  if (input.durasi !== undefined) data.durasi = input.durasi;
  if (input.status !== undefined) data.status = input.status;
  if (input.createdBy !== undefined) data.createdBy = input.createdBy;
  data.updatedAt = new Date().toISOString();

  const out: Record<string, any> = {
    user_id: CATALOG_USER_ID,
    type: CATALOG_TYPE,
    is_read: false,
    data,
  };
  if (input.namaLayanan !== undefined) out.title = input.namaLayanan;
  if (input.deskripsi !== undefined) out.body = input.deskripsi;
  return stripUndefined(out);
}

// ── Service ─────────────────────────────────────────────────────────────────

export const serviceCatalogService = {
  /**
   * Get all services, newest first.
   */
  async getAll(): Promise<ServiceItem[]> {
    const rows = await safeQuery(
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', CATALOG_USER_ID)
        .eq('type', CATALOG_TYPE)
        .order('created_at', { ascending: false }),
      [] as any[],
      'serviceCatalogService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  /**
   * Get a single service by id.
   */
  async getById(id: string): Promise<ServiceItem | null> {
    if (!isValidUuid(id)) return null;
    const row = await safeQuery(
      supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .eq('user_id', CATALOG_USER_ID)
        .eq('type', CATALOG_TYPE)
        .single(),
      null as any,
      'serviceCatalogService.getById'
    );
    return row ? fromDb(row) : null;
  },

  /**
   * Create a new service.
   */
  async create(input: ServiceInput): Promise<ServiceItem | null> {
    const payload = toDb(input);
    const { data: row, error } = await safeInsert<any>(
      supabase.from('notifications').insert(payload).select().single(),
      'serviceCatalogService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  /**
   * Update an existing service.
   */
  async update(id: string, input: Partial<ServiceInput>): Promise<ServiceItem | null> {
    if (!isValidUuid(id)) {
      console.error('[serviceCatalogService.update] ABORTED — id is not a valid UUID.', { received: id });
      return null;
    }
    const payload = toDb(input);
    const { data: row, error } = await safeInsert<any>(
      supabase
        .from('notifications')
        .update(payload)
        .eq('id', id)
        .eq('user_id', CATALOG_USER_ID)
        .eq('type', CATALOG_TYPE)
        .select()
        .single(),
      'serviceCatalogService.update'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  /**
   * Toggle a service's status between Aktif and Nonaktif.
   */
  async toggleStatus(id: string, currentStatus: ServiceStatus): Promise<ServiceItem | null> {
    const newStatus: ServiceStatus = currentStatus === 'Aktif' ? 'Nonaktif' : 'Aktif';
    return this.update(id, { status: newStatus });
  },

  /**
   * Permanently delete a service.
   */
  async remove(id: string): Promise<boolean> {
    if (!isValidUuid(id)) {
      console.error('[serviceCatalogService.remove] ABORTED — id is not a valid UUID.', { received: id });
      return false;
    }
    const res = await safeQuery(
      supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', CATALOG_USER_ID)
        .eq('type', CATALOG_TYPE),
      null as any,
      'serviceCatalogService.remove'
    );
    return res !== null;
  },
};

// ── Helpers for detecting realtime events meant for the catalog ─────────────

/**
 * Returns true if a `notifications` row payload belongs to the service
 * catalog (i.e. user_id === '__service_catalog__'). Used by the realtime
 * sync provider to route events to the correct handler.
 */
export function isServiceCatalogRow(row: any): boolean {
  return !!row && row.user_id === CATALOG_USER_ID && row.type === CATALOG_TYPE;
}
