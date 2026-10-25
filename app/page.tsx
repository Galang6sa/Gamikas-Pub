import { isLive } from "@/lib/supabase";

// Mode ditentukan saat build. Bila NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY diisi,
// aplikasi memakai data sungguhan. Tanpa itu, prototipe demo tampil agar pengembangan lokal tetap mudah.
// Impor dinamis menjaga agar kode mode yang tidak dipakai tidak ikut terkirim ke browser.
export default async function Page() {
  if (isLive) {
    const { default: LiveApp } = await import("@/components/live/LiveApp");
    return <LiveApp />;
  }
  const { default: Demo } = await import("@/components/Demo");
  return <Demo />;
}
