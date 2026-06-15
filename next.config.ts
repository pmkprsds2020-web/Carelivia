import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    'preview-chat-e2af96f3-68c5-4104-9c8d-1b24114318e4.space-z.ai',
    '.space-z.ai',
  ],
};

export default nextConfig;
