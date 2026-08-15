import { NextRequest, NextResponse } from "next/server";
import { medicalRecordService } from "@/services/supabase";

// GET /api/medical-records/[id]
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const record = await medicalRecordService.getById(id);
    if (!record) return NextResponse.json({ error: "Medical record not found" }, { status: 404 });
    return NextResponse.json({ medicalRecord: record });
  } catch (error) {
    console.error("[GET /api/medical-records/[id]]", error);
    return NextResponse.json(
      { error: "Failed to fetch medical record", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH /api/medical-records/[id] — doctor edits diagnosis/symptoms/treatment/notes
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const patch = await request.json();
    const updated = await medicalRecordService.update(id, patch);
    if (!updated) return NextResponse.json({ error: "Medical record not found" }, { status: 404 });
    return NextResponse.json({ medicalRecord: updated });
  } catch (error) {
    console.error("[PATCH /api/medical-records/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update medical record", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
