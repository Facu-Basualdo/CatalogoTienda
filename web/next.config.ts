import type { NextConfig } from "next";

const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://localhost").hostname;

const nextConfig: NextConfig = {
  // Lecturas del catálogo con 'use cache' + cacheTag; ver claude/web/cache-y-revalidacion.md
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
