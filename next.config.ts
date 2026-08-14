import type { NextConfig } from "next";

// `output: 'standalone'` bundles a fully self-contained server (used to
// self-host this app outside Vercel, e.g. via `bun .next/standalone/server.js`
// in the z.ai sandbox). On Vercel this must NOT be set — Vercel runs its own
// serverless bundling/file-tracing step, and 'standalone' output changes
// where Next writes its trace files, which breaks Vercel's own build with:
//   Error: ENOENT ... '.next/next-server.js.nft.json'
// Vercel sets the `VERCEL` env var automatically at build time, so this
// picks the right mode per environment with no extra config needed.
const isVercel = !!process.env.VERCEL;

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  ...(isVercel ? {} : { output: 'standalone' as const }),
  allowedDevOrigins: [
    'preview-chat-e2af96f3-68c5-4104-9c8d-1b24114318e4.space-z.ai',
    '.space-z.ai',
  ],
};

export default nextConfig;
