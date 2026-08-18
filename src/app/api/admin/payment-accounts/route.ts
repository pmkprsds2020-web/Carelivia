import { NextRequest, NextResponse } from "next/server";
import { paymentAccountService } from "@/services/supabase";

// GET: list every payment account (admin — active and inactive).
export async function GET() {
  try {
    const accounts = await paymentAccountService.getAll();
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Admin payment-accounts fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment accounts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: create a new payment account.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method, bankName, accountNumber, accountHolder, qrisImageUrl, isActive, displayOrder } = body ?? {};

    if (!method || !["bank_transfer", "va", "qris"].includes(method)) {
      return NextResponse.json({ success: false, error: 'method must be "bank_transfer", "va", or "qris"' }, { status: 400 });
    }
    if (method === "qris" && !qrisImageUrl) {
      return NextResponse.json({ success: false, error: "qrisImageUrl is required for method qris" }, { status: 400 });
    }
    if (method !== "qris" && (!bankName || !accountNumber || !accountHolder)) {
      return NextResponse.json({ success: false, error: "bankName, accountNumber, and accountHolder are required" }, { status: 400 });
    }

    const account = await paymentAccountService.create({
      method, bankName, accountNumber, accountHolder, qrisImageUrl, isActive, displayOrder,
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error("Admin payment-accounts create error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create payment account", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PUT: update an existing payment account.
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body ?? {};
    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    }
    const account = await paymentAccountService.update(id, updates);
    return NextResponse.json({ account });
  } catch (error) {
    console.error("Admin payment-accounts update error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "Failed to update payment account", details: msg },
      { status: msg.includes("tidak ditemukan") ? 404 : 500 }
    );
  }
}

// DELETE: remove a payment account. ?id=<uuid>
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "id query param is required" }, { status: 400 });
    }
    await paymentAccountService.remove(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin payment-accounts delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete payment account", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
