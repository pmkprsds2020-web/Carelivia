// API Route: Firestore data operations
import { NextRequest, NextResponse } from 'next/server';

// GET /api/firestore?type=<collection>&patientId=<id>
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const patientId = searchParams.get('patientId');

    return NextResponse.json({ 
      message: 'Firestore data is accessed client-side via real-time listeners',
      type, 
      patientId 
    });
  } catch (error) {
    console.error('[Firestore API] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// POST /api/firestore
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    return NextResponse.json({ 
      success: true, 
      action,
      message: 'Client-side Firestore operations should use the SDK directly' 
    });
  } catch (error) {
    console.error('[Firestore API] POST error:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
