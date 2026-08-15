import { NextRequest, NextResponse } from 'next/server';
import { palliativeScreeningFormService } from '@/services/supabase';

// GET /api/palliative-screening-forms/[id]
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const form = await palliativeScreeningFormService.getById(id);
    if (!form) return NextResponse.json({ error: 'Palliative screening form not found' }, { status: 404 });
    return NextResponse.json({ palliativeScreeningForm: form });
  } catch (error) {
    console.error('[GET /api/palliative-screening-forms/[id]]', error);
    return NextResponse.json(
      { error: 'Failed to fetch palliative screening form', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH /api/palliative-screening-forms/[id]
// Body: { patch: Partial<PalliativeScreeningForm>, audit?: { action, performedBy, details? } }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { patch, audit } = body ?? {};

    if (!patch || typeof patch !== 'object') {
      return NextResponse.json({ error: 'patch object is required' }, { status: 400 });
    }

    const updated = await palliativeScreeningFormService.update(id, patch, audit);
    if (!updated) return NextResponse.json({ error: 'Palliative screening form not found' }, { status: 404 });
    return NextResponse.json({ palliativeScreeningForm: updated });
  } catch (error) {
    console.error('[PATCH /api/palliative-screening-forms/[id]]', error);
    return NextResponse.json(
      { error: 'Failed to update palliative screening form', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
