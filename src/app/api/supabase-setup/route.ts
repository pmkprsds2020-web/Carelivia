// /api/supabase-setup
// Verifies Supabase connectivity and reports which tables exist.
// Useful for the user to validate their setup before relying on Supabase.
import { NextResponse } from 'next/server';
import { supabase } from '@/supabaseClient';

export const dynamic = 'force-dynamic';

const REQUIRED_TABLES = [
  'patients', 'vital_signs', 'screenings', 'medications', 'nutrition',
  'daily_complaints', 'social_assessments', 'caregivers', 'family_meetings',
  'family_coordination_notes', 'emergency_contacts', 'financial_support',
  'transport_records', 'acp', 'chat_rooms', 'messages', 'clinical_alerts',
  'audit_log', 'ai_reports', 'notifications', 'patient_documents',
  'palliative_resumes', 'referral_letters',
];

export async function GET() {
  const report: Record<string, { exists: boolean; error?: string }> = {};
  let ok = 0;
  let missing = 0;

  // Check each table with a SELECT LIMIT 0 — fastest existence check.
  for (const table of REQUIRED_TABLES) {
    try {
      const { error } = await supabase.from(table).select('*').limit(0);
      if (error) {
        report[table] = { exists: false, error: error.message };
        missing++;
      } else {
        report[table] = { exists: true };
        ok++;
      }
    } catch (e: any) {
      report[table] = { exists: false, error: e?.message ?? String(e) };
      missing++;
    }
  }

  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || '(default)',
    tables_total: REQUIRED_TABLES.length,
    tables_ok: ok,
    tables_missing: missing,
    ready: missing === 0,
    next_steps:
      missing > 0
        ? [
            '1. Open Supabase Dashboard → SQL Editor → New query.',
            '2. Paste the entire contents of supabase/schema.sql from this project.',
            '3. Run the query.',
            '4. Open Database → Replication → enable realtime for the marked tables.',
            '5. Open Storage → create buckets: patient-files, medical-images, radiology, lab-results, documents, acp-files.',
            '6. (Optional) Set SUPABASE_SERVICE_ROLE_KEY in .env for server-side admin operations.',
            '7. Re-hit /api/supabase-setup to confirm all tables are present.',
          ]
        : ['All tables present. Supabase is ready.'],
    report,
  });
}
