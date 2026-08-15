import { NextRequest, NextResponse } from "next/server";
import { prescriptionService } from "@/services/supabase";

// GET /api/prescriptions?patientId=...  OR  ?doctorId=...
// (Supabase-backed — replaces the old Prisma-only version.)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get("patientId") ?? "";
    const doctorId = searchParams.get("doctorId") ?? "";

    let prescriptions;
    if (patientId) {
      prescriptions = await prescriptionService.listForPatient(patientId);
    } else if (doctorId) {
      prescriptions = await prescriptionService.listForDoctor(doctorId);
    } else {
      return NextResponse.json({ error: "patientId or doctorId is required" }, { status: 400 });
    }

    return NextResponse.json({ prescriptions });
  } catch (error) {
    console.error("Prescriptions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prescriptions", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/prescriptions — doctor sends an e-prescription to a patient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { consultationId, doctorId, patientId, notes, items } = body ?? {};

    if (!doctorId || !patientId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "doctorId, patientId, and a non-empty items array are required" }, { status: 400 });
    }

    const prescription = await prescriptionService.create({ consultationId, doctorId, patientId, notes, items });
    if (!prescription) {
      return NextResponse.json({ error: "Failed to create prescription" }, { status: 500 });
    }
    return NextResponse.json({ prescription }, { status: 201 });
  } catch (error) {
    console.error("Prescription create error:", error);
    return NextResponse.json(
      { error: "Failed to create prescription", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
