import { NextRequest, NextResponse } from "next/server";
import { homecareService, paymentService } from "@/services/supabase";

// GET: List home care services and bookings (Supabase-backed)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") ?? "services"; // "services" or "bookings"
    const status = searchParams.get("status") ?? "";
    const patientId = searchParams.get("patientId") ?? "";
    const staffId = searchParams.get("staffId") ?? "";
    const validatedOnly = searchParams.get("validatedOnly") === "true";

    if (type === "bookings") {
      let bookings = await homecareService.getBookings({
        status: status || undefined,
        patientId: patientId || undefined,
        staffId: staffId || undefined,
      });

      if (validatedOnly) {
        bookings = bookings.filter((b) => b.adminValidated);
      }

      // Attach each booking's latest payment status — staff/admin need to
      // see "sudah dibayar" vs "belum dibayar" without a separate call per
      // booking, and the staff app gates "Menuju Lokasi" on it client-side
      // too (the real enforcement is server-side in updateBookingStatus).
      const paymentMap = await paymentService.getLatestForReferenceIds(
        "homecare_booking",
        bookings.map((b) => b.id)
      );
      const withPayment = bookings.map((b) => ({
        ...b,
        payment: paymentMap[b.id]
          ? { id: paymentMap[b.id].id, status: paymentMap[b.id].status, invoiceNumber: paymentMap[b.id].invoiceNumber }
          : null,
      }));

      return NextResponse.json({ bookings: withPayment });
    }

    const services = await homecareService.getServices();
    return NextResponse.json({ services });
  } catch (error) {
    console.error("Home care fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch home care data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: Create a new home care booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, serviceId, scheduledAt, address, latitude, longitude, notes } = body ?? {};

    if (!patientId || !serviceId || !scheduledAt || !address) {
      return NextResponse.json(
        { success: false, error: "patientId, serviceId, scheduledAt, and address are required" },
        { status: 400 }
      );
    }

    const result = await homecareService.createBooking({
      patientId,
      serviceId,
      scheduledAt,
      address,
      latitude,
      longitude,
      notes,
    });

    return NextResponse.json({ booking: result?.booking ?? null, payment: result?.payment ?? null }, { status: 201 });
  } catch (error) {
    console.error("Home care booking create error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg === "Home care service not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: "Failed to create home care booking", details: msg },
      { status }
    );
  }
}

// PUT: Update a booking's status (staff check-in / on-the-way / completed,
// or a patient/admin cancelling). Replaces the old staff panel flow that
// only showed a toast on check-in/complete/mark-arrived and never touched
// the database.
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, status } = body ?? {};
    const validStatuses = ["pending", "confirmed", "on_the_way", "in_progress", "completed", "cancelled"];

    if (!bookingId || !status) {
      return NextResponse.json({ success: false, error: "bookingId and status are required" }, { status: 400 });
    }
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: `status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const booking = await homecareService.updateBookingStatus(bookingId, status);
    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Home care booking status update error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const httpStatus = msg.includes("tidak ditemukan") ? 404 : (msg.includes("belum dibayar") || msg.includes("sedang berjalan")) ? 409 : 500;
    return NextResponse.json(
      { success: false, error: "Failed to update booking status", details: msg },
      { status: httpStatus }
    );
  }
}
