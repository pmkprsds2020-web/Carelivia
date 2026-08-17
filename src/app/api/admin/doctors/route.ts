import { NextRequest, NextResponse } from "next/server";
import { doctorService } from "@/services/supabase";

// ─────────────────────────────────────────────────────────────────────────
// Admin: update a doctor's consultation fee / availability.
// Replaces the old "Tarif Dokter" save which POSTed to /api/admin/pricing
// (a dead Prisma/SQLite route with no working connection in production —
// every save silently fell back to a local-only toast that never reached
// the database, doctor list, or patient booking flow).
// ─────────────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, consultationFee, isAvailable } = body ?? {};

    if (!id || typeof id !== "string") {
      return NextResponse.json({ success: false, error: "id wajib diisi" }, { status: 400 });
    }
    if (consultationFee !== undefined) {
      const fee = Number(consultationFee);
      if (!Number.isFinite(fee) || fee < 0) {
        return NextResponse.json({ success: false, error: "Tarif konsultasi harus berupa angka >= 0" }, { status: 400 });
      }
    }

    const doctor = await doctorService.updatePricing(id, {
      consultationFee: consultationFee !== undefined ? Number(consultationFee) : undefined,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : undefined,
    });

    return NextResponse.json({ doctor });
  } catch (error) {
    console.error("[admin/doctors] PUT error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg.includes("tidak ditemukan") ? 404 : 500;
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui tarif dokter", details: msg },
      { status }
    );
  }
}
