import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Total counts
    const [
      totalPatients,
      totalDoctors,
      totalConsultations,
      totalOrders,
      totalHomeCareBookings,
      totalRevenueResult,
    ] = await Promise.all([
      db.user.count({ where: { role: "patient" } }),
      db.user.count({ where: { role: "doctor" } }),
      db.consultation.count(),
      db.order.count(),
      db.homeCareBooking.count(),
      db.payment.aggregate({
        _sum: { amount: true },
        where: { status: "success" },
      }),
    ]);

    const totalRevenue = totalRevenueResult._sum.amount ?? 0;

    // Recent consultations (last 10)
    const recentConsultations = await db.consultation.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { id: true, name: true, avatar: true } },
        doctor: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });

    // Recent payments (last 10)
    const recentPayments = await db.payment.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Monthly stats - consultations per month for last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const consultations = await db.consultation.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });

    const monthlyStats: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthDate.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
      });
      const count = consultations.filter(
        (c) => c.createdAt >= monthDate && c.createdAt <= monthEnd
      ).length;
      monthlyStats.push({ month: monthName, count });
    }

    // Doctor specialization distribution
    const doctorProfiles = await db.doctorProfile.findMany({
      select: { specialization: true },
    });
    const specializationMap: Record<string, number> = {};
    for (const dp of doctorProfiles) {
      specializationMap[dp.specialization] =
        (specializationMap[dp.specialization] || 0) + 1;
    }
    const doctorSpecializationDistribution = Object.entries(specializationMap).map(
      ([specialization, count]) => ({ specialization, count })
    );

    // Top doctors by consultation count
    const topDoctorsRaw = await db.consultation.groupBy({
      by: ["doctorId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    const topDoctors = await Promise.all(
      topDoctorsRaw.map(async (td) => {
        const profile = await db.doctorProfile.findUnique({
          where: { id: td.doctorId },
          include: { user: { select: { name: true, avatar: true } } },
        });
        return {
          doctorId: td.doctorId,
          name: profile?.user.name ?? "Unknown",
          specialization: profile?.specialization ?? "",
          avatar: profile?.user.avatar ?? null,
          consultationCount: td._count.id,
          rating: profile?.rating ?? 0,
        };
      })
    );

    return NextResponse.json({
      totalPatients,
      totalDoctors,
      totalConsultations,
      totalOrders,
      totalHomeCareBookings,
      totalRevenue,
      recentConsultations,
      recentPayments,
      monthlyStats,
      doctorSpecializationDistribution,
      topDoctors,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
