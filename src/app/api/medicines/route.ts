import { NextRequest, NextResponse } from "next/server";
import { medicineService } from "@/services/supabase";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") ?? "";
    const category = searchParams.get("category") ?? "";
    const admin = searchParams.get("admin") === "true";

    const medicines = admin
      ? await medicineService.getAllForAdmin()
      : await medicineService.getAll({ search: search || undefined, category: category || undefined });

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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body ?? {};
    if (!id) {
      return NextResponse.json({ success: false, error: "id wajib diisi" }, { status: 400 });
    }
    if (data.price !== undefined && (!Number.isFinite(Number(data.price)) || Number(data.price) < 0)) {
      return NextResponse.json({ success: false, error: "Harga harus berupa angka >= 0" }, { status: 400 });
    }
    if (data.stock !== undefined && (!Number.isInteger(Number(data.stock)) || Number(data.stock) < 0)) {
      return NextResponse.json({ success: false, error: "Stok harus berupa bilangan bulat >= 0" }, { status: 400 });
    }
    const medicine = await medicineService.update(id, data);
    return NextResponse.json({ medicine });
  } catch (error) {
    console.error("Medicine update error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg.includes("tidak ditemukan") ? 404 : 500;
    return NextResponse.json(
      { success: false, error: "Failed to update medicine", details: msg },
      { status }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "id wajib diisi" }, { status: 400 });
    }
    const result = await medicineService.remove(id);
    return NextResponse.json({
      success: true,
      hardDeleted: result.hardDeleted,
      message: result.hardDeleted
        ? "Obat berhasil dihapus."
        : "Obat ini sudah pernah dibeli sehingga tidak dapat dihapus permanen. Obat dinonaktifkan dan tidak lagi tersedia untuk pembelian baru.",
    });
  } catch (error) {
    console.error("Medicine delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete medicine", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
