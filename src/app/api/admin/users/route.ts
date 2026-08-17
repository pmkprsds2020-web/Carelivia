import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/services/supabase";

// GET /api/admin/users — real registered profiles. Replaces the hardcoded
// `demoUsers` array in admin-users-panel.tsx (13 fake people, including
// placeholder doctors that don't exist).
export async function GET() {
  try {
    const users = await userService.getAll();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("[admin/users] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat daftar pengguna", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users — toggle Active/Suspended.
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body ?? {};
    if (!id) {
      return NextResponse.json({ success: false, error: "id wajib diisi" }, { status: 400 });
    }
    const user = await userService.toggleStatus(id);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("[admin/users] PUT error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg.includes("tidak ditemukan") ? 404 : 500;
    return NextResponse.json(
      { success: false, error: "Gagal mengubah status pengguna", details: msg },
      { status }
    );
  }
}
