import { NextResponse } from "next/server";
import { adminDashboardService } from "@/services/supabase";

export async function GET() {
  try {
    const stats = await adminDashboardService.getStats();
    // NOTE: the frontend (page.tsx) reads `dashData?.stats`, so the payload
    // must be wrapped — returning the stats object directly at the top level
    // (as the old Prisma route did) meant this integration was silently
    // broken even before the DATABASE_URL issue.
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard stats", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
