import { NextRequest, NextResponse } from "next/server";
import { prescriptionService } from "@/services/supabase";

// GET /api/prescriptions/[id]
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const prescription = await prescriptionService.getById(id);
    if (!prescription) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    return NextResponse.json({ prescription });
  } catch (error) {
    console.error("[GET /api/prescriptions/[id]]", error);
    return NextResponse.json(
      { error: "Failed to fetch prescription", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH /api/prescriptions/[id] — status changes (processed/ready/delivered/cancelled), notes
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const patch = await request.json();
    const updated = await prescriptionService.update(id, patch);
    if (!updated) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    return NextResponse.json({ prescription: updated });
  } catch (error) {
    console.error("[PATCH /api/prescriptions/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update prescription", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
