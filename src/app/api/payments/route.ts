import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/services/supabase";

// GET /api/payments?userId=... — real payment/invoice history.
// Replaces the hardcoded `demoPayments` array that used to render the same
// 4 fake invoices for every account regardless of who was logged in.
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId") ?? "";
    if (!userId) {
      return NextResponse.json({ success: false, error: "userId wajib diisi" }, { status: 400 });
    }
    const payments = await paymentService.getForUser(userId);
    return NextResponse.json({ payments });
  } catch (error) {
    console.error("[payments] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat riwayat pembayaran", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
