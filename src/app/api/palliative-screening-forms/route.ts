import { NextRequest, NextResponse } from 'next/server';
import { palliativeScreeningFormService } from '@/services/supabase';

// GET /api/palliative-screening-forms?patientId=...  OR  ?doctorId=...
export async function GET(request: NextRequest) {
  try {
    const patientId = request.nextUrl.searchParams.get('patientId');
    const doctorId = request.nextUrl.searchParams.get('doctorId');

    let forms;
    if (patientId) {
      forms = await palliativeScreeningFormService.listForPatient(patientId);
    } else if (doctorId) {
      forms = await palliativeScreeningFormService.listForDoctor(doctorId);
    } else {
      return NextResponse.json({ error: 'patientId or doctorId is required' }, { status: 400 });
    }

    return NextResponse.json({ palliativeScreeningForms: forms });
  } catch (error) {
    console.error('[GET /api/palliative-screening-forms]', error);
    return NextResponse.json(
      { error: 'Failed to fetch palliative screening forms', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/palliative-screening-forms — doctor sends a new palliative screening bundle to a patient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { consultationId, doctorId, patientId, instructions, selectedTools } = body ?? {};

    if (!doctorId || !patientId || !Array.isArray(selectedTools) || selectedTools.length === 0) {
      return NextResponse.json(
        { error: 'doctorId, patientId, and a non-empty selectedTools array are required' },
        { status: 400 }
      );
    }

    const form = await palliativeScreeningFormService.create({ consultationId, doctorId, patientId, instructions, selectedTools });
    if (!form) {
      return NextResponse.json({ error: 'Failed to create palliative screening form' }, { status: 500 });
    }

    return NextResponse.json({ palliativeScreeningForm: form }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/palliative-screening-forms]', error);
    return NextResponse.json(
      { error: 'Failed to create palliative screening form', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
