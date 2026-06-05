import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: List notifications for a user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId") ?? "";
    const type = searchParams.get("type") ?? "";
    const isRead = searchParams.get("isRead") ?? "";

    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter is required" },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { userId };

    if (type) {
      where.type = type;
    }

    if (isRead !== "") {
      where.isRead = isRead === "true";
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
