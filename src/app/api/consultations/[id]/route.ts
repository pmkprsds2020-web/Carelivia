import { NextRequest, NextResponse } from "next/server";
import { consultationService } from "@/services/supabase";

// PATCH /api/consultations/[id]
// Body: { status?: 'waiting'|'active'|'completed'|'cancelled', startTime?: string, endTime?: string }
// Used by the doctor-initiated "Mulai Konsultasi" / "Akhiri Konsultasi" actions.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const patch = await request.json();
    const updated = await consultationService.updateStatus(id, patch);
    if (!updated) return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    return NextResponse.json({ consultation: updated });
  } catch (error) {
    console.error("[PATCH /api/consultations/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update consultation", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
