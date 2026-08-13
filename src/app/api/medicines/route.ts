import { NextRequest, NextResponse } from "next/server";
import { medicineService } from "@/services/supabase";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") ?? "";
    const category = searchParams.get("category") ?? "";

    const medicines = await medicineService.getAll({
      search: search || undefined,
      category: category || undefined,
    });

    return NextResponse.json({ medicines });
  } catch (error) {
    console.error("Medicines fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch medicines", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, price } = body ?? {};
    if (!name || !category || price === undefined) {
      return NextResponse.json(
        { success: false, error: "name, category, and price are required" },
        { status: 400 }
      );
    }
    const medicine = await medicineService.create(body);
    return NextResponse.json({ medicine }, { status: 201 });
  } catch (error) {
    console.error("Medicine create error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create medicine", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
