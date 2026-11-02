import type { Metadata } from "next";
import LiveApp from "@/components/live/LiveApp";

export const metadata: Metadata = { title: "KasKelas, masuk bendahara", robots: { index: false, follow: false } };

// Halaman masuk bendahara dipisahkan dari halaman siswa agar siswa tidak melihat pintu ini.
export default function BendaharaPage() {
  return <LiveApp peran="bendahara" />;
}
