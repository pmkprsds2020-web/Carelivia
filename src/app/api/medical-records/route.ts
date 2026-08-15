import { NextRequest, NextResponse } from "next/server";
import { medicalRecordService } from "@/services/supabase";

// GET /api/medical-records?patientId=...&consultationId=...
// (Supabase-backed — replaces the old Prisma-only version, which read from
// a database this deployment never actually had configured.)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get("patientId") ?? "";
    const consultationId = searchParams.get("consultationId") ?? "";

    if (consultationId) {
      const record = await medicalRecordService.getByConsultation(consultationId);
      return NextResponse.json({ medicalRecords: record ? [record] : [] });
    }

    if (!patientId) {
      return NextResponse.json({ error: "patientId or consultationId is required" }, { status: 400 });
    }

    const medicalRecords = await medicalRecordService.listForPatient(patientId);
    return NextResponse.json({ medicalRecords });
  } catch (error) {
    console.error("Medical records fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch medical records", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/medical-records — doctor creates/opens a medical record for a consultation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, consultationId, rmNumber, diagnosis, symptoms, treatment, notes, status } = body ?? {};

    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    const record = await medicalRecordService.create({ patientId, consultationId, rmNumber, diagnosis, symptoms, treatment, notes, status });
    if (!record) {
      return NextResponse.json({ error: "Failed to create medical record" }, { status: 500 });
    }
    return NextResponse.json({ medicalRecord: record }, { status: 201 });
  } catch (error) {
    console.error("Medical record create error:", error);
    return NextResponse.json(
      { error: "Failed to create medical record", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
