import { NextRequest, NextResponse } from "next/server";
import { pharmacyService } from "@/services/supabase";

// GET /api/pharmacy/orders?userId=... — real purchase history (replaces
// nothing existing, since there was no order history before: checkout
// never persisted anything to look up).
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId") ?? "";
    if (!userId) {
      return NextResponse.json({ success: false, error: "userId wajib diisi" }, { status: 400 });
    }
    const orders = await pharmacyService.getOrdersForUser(userId);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[pharmacy/orders] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat riwayat pesanan", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
