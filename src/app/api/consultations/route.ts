import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: List consultations with optional status filter
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") ?? "";
    const patientId = searchParams.get("patientId") ?? "";
    const doctorId = searchParams.get("doctorId") ?? "";
    const type = searchParams.get("type") ?? "";

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (patientId) {
      where.patientId = patientId;
    }
    if (doctorId) {
      // `doctorId` param is the doctor's User.id (Supabase Auth UUID), but
      // Consultation.doctorId is a foreign key to DoctorProfile.id — resolve first.
      const doctorProfile = await db.doctorProfile.findUnique({
        where: { userId: doctorId },
        select: { id: true },
      });
      // No matching profile → this user has no consultations as a doctor.
      where.doctorId = doctorProfile?.id ?? "__no_match__";
    }
    if (type) {
      where.type = type;
    }

    const consultations = await db.consultation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { id: true, name: true, avatar: true, email: true } },
        doctor: {
          include: { user: { select: { id: true, name: true, avatar: true, email: true } } },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { content: true, createdAt: true },
        },
        prescription: {
          select: { id: true, status: true },
        },
      },
    });

    return NextResponse.json({ consultations });
  } catch (error) {
    console.error("Consultations fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch consultations", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: Create a new consultation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, doctorId, type, notes } = body;

    if (!patientId || !doctorId) {
      return NextResponse.json(
        { error: "patientId and doctorId are required" },
        { status: 400 }
      );
    }

    // Verify patient exists and is a patient
    const patient = await db.user.findUnique({
      where: { id: patientId, role: "patient" },
    });
    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    // `doctorId` here is the doctor's User.id (matches Supabase Auth UUID and
    // what /api/doctors returns as each doctor's public `id`). Consultation.doctorId
    // is a foreign key to DoctorProfile.id, which is a different id — so resolve via
    // the userId column rather than assuming the caller already knows DoctorProfile.id.
    const doctorProfile = await db.doctorProfile.findUnique({
      where: { userId: doctorId },
    });
    if (!doctorProfile) {
      return NextResponse.json(
        { error: "Doctor profile not found" },
        { status: 404 }
      );
    }

    const consultation = await db.consultation.create({
      data: {
        patientId,
        doctorId: doctorProfile.id,
        type: type ?? "chat",
        status: "waiting",
        notes: notes ?? null,
      },
      include: {
        patient: { select: { id: true, name: true, avatar: true, email: true } },
        doctor: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });

    // Create notification for doctor
    await db.notification.create({
      data: {
        userId: doctorProfile.userId,
        title: "Konsultasi Baru",
        message: `Anda memiliki permintaan konsultasi baru dari ${patient.name}.`,
        type: "consultation",
        referenceId: consultation.id,
      },
    });

    return NextResponse.json({ consultation }, { status: 201 });
  } catch (error) {
    console.error("Consultation create error:", error);
    return NextResponse.json(
      { error: "Failed to create consultation", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
