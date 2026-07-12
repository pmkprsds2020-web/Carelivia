// /api/supporting-exams/setup
// Diagnostic + setup endpoint for the Pemeriksaan Penunjang upload module.
//
// GET returns a JSON report describing the current upload configuration so the
// UI can surface actionable guidance when uploads fail:
//
//   {
//     hasServiceRoleKey: boolean,   // is SUPABASE_SERVICE_ROLE_KEY set?
//     bucket: 'patient-files',
//     sql: string,                  // the SQL to run for client-side uploads
//     instructions: string[],
//     supabaseUrl: string
//   }
//
// This route is read-only and safe to call anytime. It does NOT perform any
// upload or DB mutation.

import { NextResponse } from 'next/server';
import { STORAGE_SETUP_SQL } from '@/services/supabase/supportingExamService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '(not set)';

  return NextResponse.json({
    hasServiceRoleKey,
    bucket: 'patient-files',
    supabaseUrl,
    sql: STORAGE_SETUP_SQL,
    instructions: [
      'Opsi 1 (paling aman — client-side upload, tanpa service-role key):',
      '  1. Buka Supabase Dashboard → SQL Editor → New query.',
      '  2. Salin seluruh isi field "sql" di response ini.',
      '  3. Klik Run. Ini membuat bucket "patient-files" (public) + RLS policies',
      '     yang mengizinkan anon role untuk read/insert/update/delete.',
      '  4. Upload foto USG/EKG/Radiologi akan langsung berhasil dari browser.',
      '',
      'Opsi 2 (server-side bypass — butuh service-role key):',
      '  1. Buka Supabase Dashboard → Project Settings → API → service_role secret.',
      '  2. Salin key tersebut.',
      '  3. Tempel di file .env: SUPABASE_SERVICE_ROLE_KEY=eyJ...',
      '  4. Restart dev server (bun run dev).',
      '',
      'Setelah salah satu opsi dijalankan, upload foto akan tersimpan di Supabase',
      'Storage dan URL-nya tersimpan di tabel patient_documents (kolom url).',
    ],
    ready: hasServiceRoleKey, // true only if service-role path is available;
    // client-side path readiness can only be verified by attempting an upload.
  });
}
