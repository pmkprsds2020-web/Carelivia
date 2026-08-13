import { NextRequest, NextResponse } from "next/server";
import { consultationService } from "@/services/supabase";

// GET: Fetch messages for a specific consultation (Supabase-backed)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const consultation = await consultationService.getById(id);
    if (!consultation) {
      return NextResponse.json(
        { success: false, error: "Consultation not found" },
        { status: 404 }
      );
    }

    const messages = await consultationService.getMessages(id);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Messages fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch messages", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: Send a message in a consultation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const { senderId, content, type, fileUrl } = body ?? {};

    if (!senderId || !content) {
      return NextResponse.json(
        { success: false, error: "senderId and content are required" },
        { status: 400 }
      );
    }

    const message = await consultationService.sendMessage(id, { senderId, content, type, fileUrl });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Message create error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg === "Consultation not found" ? 404 : msg === "Not a participant in this consultation" ? 403 : 500;
    return NextResponse.json(
      { success: false, error: "Failed to send message", details: msg },
      { status }
    );
  }
}
