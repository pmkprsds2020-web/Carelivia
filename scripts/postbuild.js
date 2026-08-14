// ───────────────────────────────────────────────────────────────────────────
// postbuild — copies static assets into .next/standalone for self-hosted
// deployments (z.ai sandbox, `bun .next/standalone/server.js`).
//
// On Vercel, `.next/standalone` is never produced (see next.config.ts —
// `output: 'standalone'` is disabled there on purpose), so this script
// no-ops instead of failing the build. This replaces the old inline
// `cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/`
// build step, which unconditionally assumed `.next/standalone` existed and
// broke the Vercel build when it didn't.
// ───────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const standaloneDir = path.join(root, '.next', 'standalone');

if (!fs.existsSync(standaloneDir)) {
  console.log('[postbuild] No .next/standalone directory (Vercel build) — skipping standalone asset copy.');
  process.exit(0);
}

try {
  fs.cpSync(path.join(root, '.next', 'static'), path.join(standaloneDir, '.next', 'static'), { recursive: true });
  fs.cpSync(path.join(root, 'public'), path.join(standaloneDir, 'public'), { recursive: true });
  console.log('[postbuild] Copied static assets into .next/standalone for self-hosted deployment.');
} catch (err) {
  console.error('[postbuild] Failed to copy static assets into .next/standalone:', err);
  process.exit(1);
}
