import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/pricing?type=homecare|doctor|all
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    if (!['homecare', 'doctor', 'all'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type parameter. Must be "homecare", "doctor", or "all"' },
        { status: 400 }
      );
    }

    const result: {
      services?: Awaited<ReturnType<typeof db.homeCareService.findMany>>;
      doctors?: Awaited<ReturnType<typeof db.doctorProfile.findMany>>;
    } = {};

    if (type === 'homecare' || type === 'all') {
      result.services = await db.homeCareService.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    if (type === 'doctor' || type === 'all') {
      result.doctors = await db.doctorProfile.findMany({
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[PRICING_GET_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing data' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/pricing
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, price, consultationFee, duration, isActive, isAvailable } = body;

    // Validate required fields
    if (!type || !id) {
      return NextResponse.json(
        { error: 'Missing required fields: type and id' },
        { status: 400 }
      );
    }

    if (!['homecare', 'doctor'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "homecare" or "doctor"' },
        { status: 400 }
      );
    }

    if (type === 'homecare') {
      // Validate that at least one updatable field is provided
      if (price === undefined && duration === undefined && isActive === undefined) {
        return NextResponse.json(
          { error: 'At least one of price, duration, or isActive must be provided' },
          { status: 400 }
        );
      }

      // Fetch the existing record for audit log
      const existingService = await db.homeCareService.findUnique({ where: { id } });

      if (!existingService) {
        return NextResponse.json(
          { error: 'HomeCareService not found' },
          { status: 404 }
        );
      }

      // Build update data
      const updateData: { price?: number; duration?: number; isActive?: boolean } = {};
      if (price !== undefined) updateData.price = price;
      if (duration !== undefined) updateData.duration = duration;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Update the record
      const updatedService = await db.homeCareService.update({
        where: { id },
        data: updateData,
      });

      // Create audit log entry
      await db.auditLog.create({
        data: {
          action: 'UPDATE_PRICE',
          entity: 'homecare',
          entityId: id,
          details: JSON.stringify({
            oldValue: {
              price: existingService.price,
              duration: existingService.duration,
              isActive: existingService.isActive,
            },
            newValue: updateData,
          }),
        },
      });

      return NextResponse.json(updatedService);
    }

    if (type === 'doctor') {
      // Validate that at least one updatable field is provided
      if (consultationFee === undefined && isAvailable === undefined) {
        return NextResponse.json(
          { error: 'At least one of consultationFee or isAvailable must be provided' },
          { status: 400 }
        );
      }

      // Fetch the existing record for audit log
      const existingDoctor = await db.doctorProfile.findUnique({ where: { id } });

      if (!existingDoctor) {
        return NextResponse.json(
          { error: 'DoctorProfile not found' },
          { status: 404 }
        );
      }

      // Build update data
      const updateData: { consultationFee?: number; isAvailable?: boolean } = {};
      if (consultationFee !== undefined) updateData.consultationFee = consultationFee;
      if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

      // Update the record
      const updatedDoctor = await db.doctorProfile.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      // Create audit log entry
      await db.auditLog.create({
        data: {
          action: 'UPDATE_PRICE',
          entity: 'doctor',
          entityId: id,
          details: JSON.stringify({
            oldValue: {
              consultationFee: existingDoctor.consultationFee,
              isAvailable: existingDoctor.isAvailable,
            },
            newValue: updateData,
          }),
        },
      });

      return NextResponse.json(updatedDoctor);
    }

    // This should never be reached due to the validation above
    return NextResponse.json(
      { error: 'Invalid type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[PRICING_PUT_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to update pricing' },
      { status: 500 }
    );
  }
}
