import type { NextConfig } from "next";

// Mode ditentukan saat build: bila variabel Supabase terisi, "/" dan "/bendahara" adalah aplikasi sungguhan.
// Bila kosong (pengembangan lokal tanpa backend), keduanya diarahkan ke prototipe demo di "/demo".
const live =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").startsWith("https://") && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").length > 20;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true },
  async rewrites() {
    // beforeFiles: agar menang atas halaman "/" dan "/bendahara" yang ada di sistem berkas.
    return { beforeFiles: live ? [] : [{ source: "/", destination: "/demo" }, { source: "/bendahara", destination: "/demo" }], afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
