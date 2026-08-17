import { NextRequest, NextResponse } from "next/server";
import { homecareService } from "@/services/supabase";

// ─────────────────────────────────────────────────────────────────────────
// Admin CRUD for the REAL home care service master catalog
// (public.homecare_services — the same table the patient Home Care page
// reads from via GET /api/homecare). This replaces the old admin UI that
// only edited a hardcoded in-browser array and never touched the database.
// ─────────────────────────────────────────────────────────────────────────

// GET: list ALL services (active + inactive) for the admin management table.
export async function GET() {
  try {
    const services = await homecareService.getAllServicesForAdmin();
    return NextResponse.json({ services });
  } catch (error) {
    console.error("[admin/homecare-services] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch home care services", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: create a new service. This is what patients will see immediately
// (no deploy needed — the patient page reads live from the same table).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, description, price, durationMinutes, isActive, displayOrder, updatedBy } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Nama layanan wajib diisi" }, { status: 400 });
    }
    if (!category || typeof category !== "string" || !category.trim()) {
      return NextResponse.json({ success: false, error: "Kategori wajib diisi" }, { status: 400 });
    }
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return NextResponse.json({ success: false, error: "Harga harus berupa angka >= 0" }, { status: 400 });
    }
    if (durationMinutes !== undefined && durationMinutes !== null && Number(durationMinutes) <= 0) {
      return NextResponse.json({ success: false, error: "Durasi harus lebih dari 0" }, { status: 400 });
    }

    const service = await homecareService.createService({
      name: name.trim(),
      category: category.trim(),
      description: description?.trim() || undefined,
      price: numericPrice,
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      isActive: isActive ?? true,
      displayOrder: displayOrder ?? 0,
      updatedBy: updatedBy || undefined,
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error("[admin/homecare-services] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menambah layanan", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PUT: update an existing service (name/price/category/duration/status).
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, category, description, price, durationMinutes, isActive, displayOrder, updatedBy } = body ?? {};

    if (!id || typeof id !== "string") {
      return NextResponse.json({ success: false, error: "id wajib diisi" }, { status: 400 });
    }
    if (price !== undefined && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
      return NextResponse.json({ success: false, error: "Harga harus berupa angka >= 0" }, { status: 400 });
    }
    if (durationMinutes !== undefined && durationMinutes !== null && Number(durationMinutes) <= 0) {
      return NextResponse.json({ success: false, error: "Durasi harus lebih dari 0" }, { status: 400 });
    }

    const service = await homecareService.updateService(id, {
      name: name !== undefined ? String(name).trim() : undefined,
      category: category !== undefined ? String(category).trim() : undefined,
      description: description !== undefined ? String(description).trim() : undefined,
      price: price !== undefined ? Number(price) : undefined,
      durationMinutes: durationMinutes !== undefined ? (durationMinutes ? Number(durationMinutes) : undefined) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined,
      updatedBy: updatedBy || undefined,
    });

    return NextResponse.json({ service });
  } catch (error) {
    console.error("[admin/homecare-services] PUT error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg.includes("tidak ditemukan") ? 404 : 500;
    return NextResponse.json(
      { success: false, error: "Gagal mengubah layanan", details: msg },
      { status }
    );
  }
}

// DELETE: hard-delete if never used in a booking, otherwise soft-delete
// (is_active=false) so historical bookings/invoices keep their real data.
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "id wajib diisi" }, { status: 400 });
    }

    const result = await homecareService.deleteService(id);
    return NextResponse.json({
      success: true,
      hardDeleted: result.hardDeleted,
      message: result.hardDeleted
        ? "Layanan berhasil dihapus."
        : "Layanan ini sudah digunakan dalam transaksi sehingga tidak dapat dihapus permanen. Layanan dinonaktifkan dan tidak lagi tersedia untuk pemesanan baru.",
    });
  } catch (error) {
    console.error("[admin/homecare-services] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus layanan", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
