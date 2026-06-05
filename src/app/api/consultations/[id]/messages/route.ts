import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Fetch messages for a specific consultation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const consultation = await db.consultation.findUnique({
      where: { id },
    });

    if (!consultation) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    const messages = await db.message.findMany({
      where: { consultationId: id },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      consultationId: msg.consultationId,
      senderId: msg.senderId,
      content: msg.content,
      type: msg.type,
      fileUrl: msg.fileUrl ?? undefined,
      status: msg.status,
      createdAt: msg.createdAt.toISOString(),
      sender: {
        id: msg.sender.id,
        name: msg.sender.name,
        avatar: msg.sender.avatar,
        role: msg.sender.role,
      },
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (error) {
    console.error("Messages fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch messages",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
