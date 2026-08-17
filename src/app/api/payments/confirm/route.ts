import { NextRequest, NextResponse } from "next/server";
import { paymentService, pharmacyService } from "@/services/supabase";

// POST /api/payments/confirm — marks a payment as paid.
// Replaces the old "Bayar" button flow, which used `setTimeout()` to fake
// processing and only ever mutated local Zustand state (never touched the
// database, so a page refresh lost the "payment").
//
// Idempotent: calling this twice for the same paymentId (e.g. a
// double-click, or a retried request) does NOT create a second success or
// double-deduct stock — see paymentService.markPaid()'s compare-and-swap
// update and pharmacyService.confirmPayment()'s `alreadyPaid` guard.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, method } = body ?? {};
    if (!paymentId || typeof paymentId !== "string") {
      return NextResponse.json({ success: false, error: "paymentId wajib diisi" }, { status: 400 });
    }

    const payment = await paymentService.getById(paymentId);
    if (!payment) {
      return NextResponse.json({ success: false, error: "Pembayaran tidak ditemukan" }, { status: 404 });
    }

    // Dispatch to the domain service that owns side effects for this
    // reference type (stock deduction for pharmacy orders, etc.). Home
    // care / consultation payments have no extra side effects yet, so they
    // go through the generic markPaid path.
    if (payment.referenceType === "pharmacy_order") {
      const result = await pharmacyService.confirmPayment(paymentId, method);
      return NextResponse.json({ payment: await paymentService.getById(paymentId), order: result.order, alreadyPaid: result.alreadyPaid });
    }

    const result = await paymentService.markPaid(paymentId, method);
    return NextResponse.json({ payment: result.payment, alreadyPaid: result.alreadyPaid });
  } catch (error) {
    console.error("[payments/confirm] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memproses pembayaran", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
