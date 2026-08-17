import { NextRequest, NextResponse } from "next/server";
import { pharmacyService } from "@/services/supabase";

// POST: real Apotek Online checkout — creates order + order_items + a
// pending payment. Replaces the old fake handleCheckout() that only showed
// a toast and cleared the cart.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, items, shippingAddress, shippingFee } = body ?? {};

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ success: false, error: "userId wajib diisi" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Keranjang kosong" }, { status: 400 });
    }
    for (const item of items) {
      if (!item?.medicineId || !Number.isFinite(Number(item?.quantity)) || Number(item.quantity) <= 0) {
        return NextResponse.json({ success: false, error: "Item keranjang tidak valid" }, { status: 400 });
      }
    }

    const result = await pharmacyService.checkout({
      userId,
      items: items.map((i: any) => ({ medicineId: i.medicineId, quantity: Number(i.quantity) })),
      shippingAddress: shippingAddress || undefined,
      shippingFee: shippingFee !== undefined ? Number(shippingFee) : undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[pharmacy/checkout] error:", error);
    return NextResponse.json(
      { success: false, error: "Checkout gagal", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
