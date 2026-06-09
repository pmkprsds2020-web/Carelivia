import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: List medical records with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get("patientId") ?? "";
    const consultationId = searchParams.get("consultationId") ?? "";
    const doctorUserId = searchParams.get("doctorUserId") ?? "";

    const where: Record<string, unknown> = {};

    if (patientId) {
      where.patientId = patientId;
    }
    if (consultationId) {
      where.consultationId = consultationId;
    }
    // Filter by doctor's user ID via consultation relation
    if (doctorUserId) {
      where.consultation = {
        doctor: {
          userId: doctorUserId,
        },
      };
    }

    const medicalRecords = await db.medicalRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        patient: {
          select: { id: true, name: true, avatar: true, email: true },
        },
        consultation: {
          select: {
            id: true,
            doctorId: true,
            patientId: true,
            type: true,
            status: true,
            createdAt: true,
            doctor: {
              select: {
                id: true,
                userId: true,
                user: {
                  select: { id: true, name: true, avatar: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    // Ensure recordDate is always present (fallback to createdAt)
    const recordsWithDates = medicalRecords.map((mr) => ({
      ...mr,
      recordDate: mr.recordDate || mr.createdAt,
    }));

    return NextResponse.json({ medicalRecords: recordsWithDates });
  } catch (error) {
    console.error("Medical records fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch medical records", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
