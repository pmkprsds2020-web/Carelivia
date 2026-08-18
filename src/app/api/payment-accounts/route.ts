import { NextResponse } from "next/server";
import { paymentAccountService } from "@/services/supabase";

// GET: list active payment destination accounts (bank/VA/QRIS) — used by the
// patient-facing payment method dialog to show real account details instead
// of the old hardcoded placeholder.
export async function GET() {
  try {
    const accounts = await paymentAccountService.getActive();
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Payment accounts fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment accounts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
