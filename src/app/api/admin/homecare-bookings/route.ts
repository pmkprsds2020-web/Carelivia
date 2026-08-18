import { NextRequest, NextResponse } from "next/server";
import { homecareService } from "@/services/supabase";

// GET: list Home Care bookings still waiting on admin validation.
export async function GET() {
  try {
    const bookings = await homecareService.getPendingValidation();
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Admin homecare-bookings fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pending home care bookings", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: admin approves ("validate") or rejects a booking.
//   { bookingId, action: "validate" | "reject", adminId?, reason? }
// Approving is the only place a pending payment is created for a Home Care
// booking — see homecareService.validateBooking().
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, action, adminId, reason } = body ?? {};

    if (!bookingId || !action) {
      return NextResponse.json({ success: false, error: "bookingId and action are required" }, { status: 400 });
    }
    if (action !== "validate" && action !== "reject") {
      return NextResponse.json({ success: false, error: 'action must be "validate" or "reject"' }, { status: 400 });
    }

    if (action === "validate") {
      const result = await homecareService.validateBooking(bookingId, adminId);
      return NextResponse.json({ booking: result.booking, payment: result.payment });
    }

    const booking = await homecareService.rejectBooking(bookingId, reason);
    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Admin homecare-bookings validate/reject error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg.includes("tidak ditemukan") ? 404 : msg.includes("sudah divalidasi") || msg.includes("sudah dibatalkan") ? 409 : 500;
    return NextResponse.json(
      { success: false, error: "Failed to update home care booking", details: msg },
      { status }
    );
  }
}
