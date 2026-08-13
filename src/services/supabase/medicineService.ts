// ───────────────────────────────────────────────────────────────────────────
// medicineService — Supabase CRUD for `medicines`
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined } from './_common';

export interface MedicineRecord {
  id: string;
  name: string;
  genericName?: string;
  category: 'resep' | 'bebas' | 'vitamin' | 'alat_kesehatan';
  description?: string;
  price: number;
  stock: number;
  unit?: string;
  manufacturer?: string;
  image?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function fromDb(row: any): MedicineRecord {
  return {
    id: row.id,
    name: row.name,
    genericName: row.generic_name ?? undefined,
    category: row.category ?? 'bebas',
    description: row.description ?? undefined,
    price: Number(row.price ?? 0),
    stock: row.stock ?? 0,
    unit: row.unit ?? undefined,
    manufacturer: row.manufacturer ?? undefined,
    image: row.image ?? undefined,
    isActive: row.is_active ?? true,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<MedicineRecord>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.name !== undefined) out.name = data.name;
  if (data.genericName !== undefined) out.generic_name = data.genericName;
  if (data.category !== undefined) out.category = data.category;
  if (data.description !== undefined) out.description = data.description;
  if (data.price !== undefined) out.price = data.price;
  if (data.stock !== undefined) out.stock = data.stock;
  if (data.unit !== undefined) out.unit = data.unit;
  if (data.manufacturer !== undefined) out.manufacturer = data.manufacturer;
  if (data.image !== undefined) out.image = data.image;
  if (data.isActive !== undefined) out.is_active = data.isActive;
  return stripUndefined(out);
}

export interface MedicineFilters {
  search?: string;
  category?: string;
}

export const medicineService = {
  async getAll(filters: MedicineFilters = {}): Promise<MedicineRecord[]> {
    let q = supabase.from('medicines').select('*').eq('is_active', true).order('name', { ascending: true });

    if (filters.search) {
      const s = filters.search.replace(/[%,]/g, '');
      q = q.or(`name.ilike.%${s}%,generic_name.ilike.%${s}%,manufacturer.ilike.%${s}%`);
    }
    if (filters.category) q = q.eq('category', filters.category);

    const rows = await safeQuery(q, [] as any[], 'medicineService.getAll');
    return (rows as any[]).map(fromDb);
  },

  async create(data: Partial<MedicineRecord>): Promise<MedicineRecord | null> {
    const payload = toDb(data);
    const { data: row, error } = await safeInsert<any>(
      supabase.from('medicines').insert(payload).select().single(),
      'medicineService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },
};
