import { NextRequest, NextResponse } from "next/server";
import { consultationService, doctorService, paymentService, type PaymentRecord } from "@/services/supabase";

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

    // Create a pending payment for this consultation right away, at the
    // doctor's CURRENT consultation fee (never trust a client-supplied
    // amount — see master repair item #9). The chat itself isn't gated on
    // payment (patients can start chatting immediately, matching the
    // existing UX), but the invoice now exists for real from the moment
    // the consultation starts, instead of never existing at all. Once
    // paid, this is what makes real money show up in the doctor's
    // Pendapatan tab via revenueService.
    let payment: PaymentRecord | null = null;
    try {
      const doctorRecord = await doctorService.getById(doctorProfile);
      const fee = doctorRecord?.doctorProfile?.consultationFee ?? 0;
      if (fee > 0) {
        payment = await paymentService.createPending({
          userId: patientId,
          referenceType: 'consultation',
          referenceId: consultation.id,
          amount: fee,
        });
      }
    } catch (payErr) {
      // Don't fail consultation creation just because invoicing hiccuped —
      // log it loudly so it's visible, but the chat can still proceed.
      console.error("[consultations] failed to create pending payment:", payErr);
    }

    return NextResponse.json({ consultation, payment }, { status: 201 });
  } catch (error) {
    console.error("Consultation create error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create consultation", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
