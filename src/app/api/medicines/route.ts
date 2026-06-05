import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") ?? "";
    const category = searchParams.get("category") ?? "";

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { genericName: { contains: search } },
        { manufacturer: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    const medicines = await db.medicine.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ medicines });
  } catch (error) {
    console.error("Medicines fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch medicines", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
