import { NextRequest, NextResponse } from 'next/server';
import { screeningFormService } from '@/services/supabase';

// GET /api/screening-forms/[id]
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const form = await screeningFormService.getById(id);
    if (!form) return NextResponse.json({ error: 'Screening form not found' }, { status: 404 });
    return NextResponse.json({ screeningForm: form });
  } catch (error) {
    console.error('[GET /api/screening-forms/[id]]', error);
    return NextResponse.json(
      { error: 'Failed to fetch screening form', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH /api/screening-forms/[id]
// Body: { patch: Partial<ScreeningForm>, audit?: { action, performedBy, details? } }
// Used both by the patient (answering modules, saving drafts, completing)
// and the doctor (adding notes, marking reviewed).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { patch, audit } = body ?? {};

    if (!patch || typeof patch !== 'object') {
      return NextResponse.json({ error: 'patch object is required' }, { status: 400 });
    }

    const updated = await screeningFormService.update(id, patch, audit);
    if (!updated) return NextResponse.json({ error: 'Screening form not found' }, { status: 404 });
    return NextResponse.json({ screeningForm: updated });
  } catch (error) {
    console.error('[PATCH /api/screening-forms/[id]]', error);
    return NextResponse.json(
      { error: 'Failed to update screening form', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
