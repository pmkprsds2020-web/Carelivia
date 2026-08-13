import { NextRequest, NextResponse } from "next/server";
import { doctorService } from "@/services/supabase";

// GET: List all doctors with their profiles (Supabase-backed)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const specialization = searchParams.get("specialization") ?? "";
    const isOnline = searchParams.get("isOnline") ?? "";

    const doctors = await doctorService.getAll({
      specialization: specialization || undefined,
      isOnline: isOnline === "true",
    });

    return NextResponse.json({ doctors });
  } catch (error) {
    console.error("Doctors fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch doctors",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
