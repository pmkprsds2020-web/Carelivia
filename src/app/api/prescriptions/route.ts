import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: List prescriptions with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get("patientId") ?? "";
    const doctorUserId = searchParams.get("doctorUserId") ?? "";
    const status = searchParams.get("status") ?? "";
    const consultationId = searchParams.get("consultationId") ?? "";

    const where: Record<string, unknown> = {};

    if (patientId) {
      where.patientId = patientId;
    }
    if (consultationId) {
      where.consultationId = consultationId;
    }
    if (status) {
      where.status = status;
    }
    // Filter by doctor's user ID via DoctorProfile relation
    if (doctorUserId) {
      where.doctor = {
        userId: doctorUserId,
      };
    }

    const prescriptions = await db.prescription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
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

    // Look up prices from medicines table for each prescription item
    const allMedicines = await db.medicine.findMany({
      select: { id: true, name: true, price: true },
    });

    const prescriptionsWithPrices = prescriptions.map((rx) => ({
      ...rx,
      items: rx.items.map((item) => {
        // Find matching medicine by name
        const matchingMedicine = allMedicines.find((m) =>
          m.name.toLowerCase().includes(item.medicineName.toLowerCase().split(" ")[0])
        );
        return {
          ...item,
          price: matchingMedicine?.price || 0,
        };
      }),
    }));

    return NextResponse.json({ prescriptions: prescriptionsWithPrices });
  } catch (error) {
    console.error("Prescriptions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prescriptions", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
