import { NextResponse } from "next/server";
import { seedService } from "@/services/supabase/seedService";

// GET: Seed demo data into Supabase (dev only, disabled in production).
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, message: "Seed disabled in production" },
      { status: 403 }
    );
  }

  try {
    const result = await seedService.run();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to seed database", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
