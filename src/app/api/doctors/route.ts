import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: List all doctors with their profiles
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const specialization = searchParams.get("specialization") ?? "";
    const isOnline = searchParams.get("isOnline") ?? "";

    const where: Record<string, unknown> = {};

    if (specialization) {
      where.specialization = specialization;
    }
    if (isOnline === "true") {
      where.isOnline = true;
    }

    const doctorProfiles = await db.doctorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            phone: true,
            role: true,
            isVerified: true,
            isActive: true,
          },
        },
      },
      orderBy: { rating: "desc" },
    });

    const doctors = doctorProfiles.map((dp) => ({
      id: dp.userId,
      email: dp.user.email,
      name: dp.user.name,
      avatar: dp.user.avatar,
      phone: dp.user.phone,
      role: "doctor" as const,
      isVerified: dp.user.isVerified,
      isActive: dp.user.isActive,
      createdAt: dp.createdAt.toISOString(),
      updatedAt: dp.updatedAt.toISOString(),
      doctorProfile: {
        id: dp.id,
        userId: dp.userId,
        specialization: dp.specialization,
        licenseNumber: dp.licenseNumber ?? undefined,
        hospital: dp.hospital ?? undefined,
        experience: dp.experience ?? undefined,
        rating: dp.rating,
        reviewCount: dp.reviewCount,
        consultationFee: dp.consultationFee,
        isOnline: dp.isOnline,
        isAvailable: dp.isAvailable,
        bio: dp.bio ?? undefined,
        education: dp.education ?? undefined,
      },
    }));

    return NextResponse.json({ doctors });
  } catch (error) {
    console.error("Doctors fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch doctors",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
