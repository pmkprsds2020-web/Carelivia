import { NextRequest, NextResponse } from "next/server";
import { homecareService } from "@/services/supabase";

// GET: List home care services and bookings (Supabase-backed)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") ?? "services"; // "services" or "bookings"
    const status = searchParams.get("status") ?? "";
    const patientId = searchParams.get("patientId") ?? "";

    if (type === "bookings") {
      const bookings = await homecareService.getBookings({
        status: status || undefined,
        patientId: patientId || undefined,
      });
      return NextResponse.json({ bookings });
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
