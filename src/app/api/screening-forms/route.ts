import { NextRequest, NextResponse } from 'next/server';
import { screeningFormService } from '@/services/supabase';

// GET /api/screening-forms?patientId=...  OR  ?doctorId=...
export async function GET(request: NextRequest) {
  try {
    const patientId = request.nextUrl.searchParams.get('patientId');
    const doctorId = request.nextUrl.searchParams.get('doctorId');

    let forms;
    if (patientId) {
      forms = await screeningFormService.listForPatient(patientId);
    } else if (doctorId) {
      forms = await screeningFormService.listForDoctor(doctorId);
    } else {
      return NextResponse.json({ error: 'patientId or doctorId is required' }, { status: 400 });
    }

    return NextResponse.json({ screeningForms: forms });
  } catch (error) {
    console.error('[GET /api/screening-forms]', error);
    return NextResponse.json(
      { error: 'Failed to fetch screening forms', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/screening-forms — doctor sends a new comprehensive screening form to a patient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { consultationId, doctorId, patientId, instructions, deadline, selectedModules } = body ?? {};

    if (!doctorId || !patientId || !Array.isArray(selectedModules) || selectedModules.length === 0) {
      return NextResponse.json(
        { error: 'doctorId, patientId, and a non-empty selectedModules array are required' },
        { status: 400 }
      );
    }

    const form = await screeningFormService.create({ consultationId, doctorId, patientId, instructions, deadline, selectedModules });
    if (!form) {
      return NextResponse.json({ error: 'Failed to create screening form' }, { status: 500 });
    }

    return NextResponse.json({ screeningForm: form }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/screening-forms]', error);
    return NextResponse.json(
      { error: 'Failed to create screening form', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
