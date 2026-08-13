import { NextRequest, NextResponse } from "next/server";
import { consultationService, doctorService } from "@/services/supabase";

// GET: List consultations with optional filters (Supabase-backed)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") ?? "";
    const patientId = searchParams.get("patientId") ?? "";
    const doctorId = searchParams.get("doctorId") ?? ""; // this is the doctor's profiles.id
    const type = searchParams.get("type") ?? "";

    // `doctorId` here is the doctor's profiles.id, which is the same value as
    // doctor_profiles.id in this schema — no extra resolution step needed.
    const consultations = await consultationService.getAll({
      status: status || undefined,
      patientId: patientId || undefined,
      doctorProfileId: doctorId || undefined,
      type: type || undefined,
    });

    return NextResponse.json({ consultations });
  } catch (error) {
    console.error("Consultations fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch consultations", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: Create a new consultation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, doctorId, type, notes } = body ?? {};

    if (!patientId || !doctorId) {
      return NextResponse.json(
        { success: false, error: "patientId and doctorId are required" },
        { status: 400 }
      );
    }

    const doctorProfile = await doctorService.resolveDoctorProfileId(doctorId);
    if (!doctorProfile) {
      return NextResponse.json(
        { success: false, error: "Doctor profile not found" },
        { status: 404 }
      );
    }

    const consultation = await consultationService.create({
      patientId,
      doctorProfileId: doctorProfile,
      type,
      notes,
    });

    return NextResponse.json({ consultation }, { status: 201 });
  } catch (error) {
    console.error("Consultation create error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create consultation", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
