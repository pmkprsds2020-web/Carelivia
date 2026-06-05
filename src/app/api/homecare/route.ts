import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: List home care services and bookings
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") ?? "services"; // "services" or "bookings"
    const status = searchParams.get("status") ?? "";
    const patientId = searchParams.get("patientId") ?? "";

    if (type === "bookings") {
      const where: Record<string, unknown> = {};

      if (status) {
        where.status = status;
      }
      if (patientId) {
        where.patientId = patientId;
      }

      const bookings = await db.homeCareBooking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: { id: true, name: true, avatar: true, phone: true } },
          staff: {
            include: { user: { select: { id: true, name: true, avatar: true, phone: true } } },
          },
          service: true,
        },
      });

      return NextResponse.json({ bookings });
    }

    // Default: return services
    const services = await db.homeCareService.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error("Home care fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch home care data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: Create a new home care booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, serviceId, scheduledAt, address, latitude, longitude, notes } = body;

    if (!patientId || !serviceId || !scheduledAt || !address) {
      return NextResponse.json(
        { error: "patientId, serviceId, scheduledAt, and address are required" },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await db.user.findUnique({
      where: { id: patientId, role: "patient" },
    });
    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    // Verify service exists
    const service = await db.homeCareService.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      return NextResponse.json(
        { error: "Home care service not found" },
        { status: 404 }
      );
    }

    const booking = await db.homeCareBooking.create({
      data: {
        patientId,
        serviceId,
        scheduledAt: new Date(scheduledAt),
        address,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        notes: notes ?? null,
        status: "pending",
      },
      include: {
        patient: { select: { id: true, name: true, avatar: true, phone: true } },
        staff: {
          include: { user: { select: { id: true, name: true, avatar: true, phone: true } } },
        },
        service: true,
      },
    });

    // Create notification for patient
    await db.notification.create({
      data: {
        userId: patientId,
        title: "Home Care Dipesan",
        message: `Layanan ${service.name} telah dipesan untuk ${new Date(scheduledAt).toLocaleDateString("id-ID")}. Menunggu konfirmasi.`,
        type: "homecare",
        referenceId: booking.id,
      },
    });

    // Try to assign an available staff
    const availableStaff = await db.homeCareStaff.findFirst({
      where: { isAvailable: true, currentStatus: "available" },
    });

    if (availableStaff) {
      await db.homeCareBooking.update({
        where: { id: booking.id },
        data: { staffId: availableStaff.id, status: "confirmed" },
      });

      await db.notification.create({
        data: {
          userId: availableStaff.userId,
          title: "Home Care Baru",
          message: `Anda memiliki jadwal ${service.name} pada ${new Date(scheduledAt).toLocaleDateString("id-ID")} di ${address}.`,
          type: "homecare",
          referenceId: booking.id,
        },
      });
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Home care booking create error:", error);
    return NextResponse.json(
      { error: "Failed to create home care booking", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
