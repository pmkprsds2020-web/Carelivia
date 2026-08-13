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
        { error: "senderId and content are required" },
        { status: 400 }
      );
    }

    const consultation = await db.consultation.findUnique({
      where: { id },
      include: { doctor: { select: { userId: true } } },
    });

    if (!consultation) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    // Only the two participants of this consultation may post into it.
    const isParticipant =
      senderId === consultation.patientId || senderId === consultation.doctor.userId;
    if (!isParticipant) {
      return NextResponse.json(
        { error: "Not a participant in this consultation" },
        { status: 403 }
      );
    }

    const message = await db.message.create({
      data: {
        consultationId: id,
        senderId,
        content,
        type: type ?? "text",
        fileUrl: fileUrl ?? null,
        status: "sent",
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true, role: true } },
      },
    });

    // Notify the other participant.
    const recipientId =
      senderId === consultation.patientId ? consultation.doctor.userId : consultation.patientId;
    await db.notification.create({
      data: {
        userId: recipientId,
        title: "Pesan Baru",
        message: `${message.sender.name}: ${content.slice(0, 80)}`,
        type: "message",
        referenceId: id,
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Message create error:", error);
    return NextResponse.json(
      {
        error: "Failed to send message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
