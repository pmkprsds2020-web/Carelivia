import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/services/supabase";

// GET: List notifications for a user (Supabase-backed)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId") ?? "";
    const type = searchParams.get("type") ?? "";
    const isRead = searchParams.get("isRead") ?? "";

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId query parameter is required" },
        { status: 400 }
      );
    }

    let notifications = await notificationService.getByUser(userId);

    if (type) {
      notifications = notifications.filter((n) => n.type === type);
    }
    if (isRead !== "") {
      const wantRead = isRead === "true";
      notifications = notifications.filter((n) => n.isRead === wantRead);
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH: mark one (?id=) or all (?userId=&all=true) notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id") ?? "";
    const userId = searchParams.get("userId") ?? "";
    const all = searchParams.get("all") === "true";

    if (all && userId) {
      const ok = await notificationService.markAllRead(userId);
      return NextResponse.json({ success: ok });
    }
    if (id) {
      const ok = await notificationService.markRead(id);
      return NextResponse.json({ success: ok });
    }
    return NextResponse.json(
      { success: false, error: "Provide either ?id= or ?userId=&all=true" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Notification update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update notification", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
