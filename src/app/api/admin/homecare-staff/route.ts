import { NextResponse } from "next/server";
import { homecareService } from "@/services/supabase";

// GET: list every Home Care field staff account, with current
// availability and active-booking load — powers the admin "Tugaskan
// Petugas" picker in Kelola Petugas.
export async function GET() {
  try {
    const staff = await homecareService.getAllStaff();
    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Admin homecare-staff fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch home care staff", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
