import { NextRequest, NextResponse } from "next/server";
import { revenueService } from "@/services/supabase";

// GET /api/doctors/revenue?doctorId=... — real earnings computed from the
// revenue_ledger (which is only ever populated from an ACTUALLY successful
// payment — see paymentService.markPaid). Replaces the hardcoded
// `monthlyEarnings` demo array in doctor-panel.tsx, including the fake
// "+12% dari bulan lalu" indicator that was never computed from anything.
export async function GET(request: NextRequest) {
  try {
    const doctorId = request.nextUrl.searchParams.get("doctorId") ?? "";
    if (!doctorId) {
      return NextResponse.json({ success: false, error: "doctorId wajib diisi" }, { status: 400 });
    }
    const stats = await revenueService.getDoctorStats(doctorId);
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("[doctors/revenue] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat data pendapatan", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
