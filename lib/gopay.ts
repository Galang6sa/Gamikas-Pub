// Membaca ekspor "Laporan Transaksi" GoPay Merchant (CSV) di browser, lalu dikirim ke fungsi impor_gopay.
import { cariWaktu } from "./ocr";

export type BarisGopay = { no_transaksi: string; waktu_dibuat: string; nominal: number; ref: string | null; merchant_id: string | null; status: string };

// CSV sesuai RFC 4180: tanda kutip ganda, koma dan baris baru di dalam kutipan.
export function parseCsv(teks: string): string[][] {
  const t = teks.replace(/^\uFEFF/, "");
  const baris: string[][] = [];
  let sel = "";
  let row: string[] = [];
  let kutip = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (kutip) {
      if (c === '"' && t[i + 1] === '"') { sel += '"'; i++; }
      else if (c === '"') kutip = false;
      else sel += c;
    } else if (c === '"') kutip = true;
    else if (c === ",") { row.push(sel); sel = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(sel); sel = "";
      if (row.some((x) => x.trim() !== "")) baris.push(row);
      row = [];
    } else sel += c;
  }
  row.push(sel);
  if (row.some((x) => x.trim() !== "")) baris.push(row);
  return baris;
}

const WAJIB = ["Transaksi Dibuat", "No. Transaksi", "Harga", "Status"];

export function bacaLaporanGopay(teks: string): { baris: BarisGopay[]; dilewati: number; galat: string | null } {
  const semua = parseCsv(teks);
  if (semua.length < 2) return { baris: [], dilewati: 0, galat: "Berkas kosong atau bukan laporan transaksi GoPay." };
  const kepala = semua[0].map((k) => k.trim());
  const hilang = WAJIB.filter((k) => !kepala.includes(k));
  if (hilang.length) return { baris: [], dilewati: 0, galat: `Kolom tidak ditemukan: ${hilang.join(", ")}. Pastikan berkas adalah ekspor Laporan Transaksi GoPay Merchant.` };
  const idx = (k: string) => kepala.indexOf(k);
  const baris: BarisGopay[] = [];
  let dilewati = 0;
  for (const r of semua.slice(1)) {
    const waktu = cariWaktu(r[idx("Transaksi Dibuat")] ?? "");
    const nominal = Math.round(Number((r[idx("Harga")] ?? "").replace(/[^\d.]/g, "")));
    const no = (r[idx("No. Transaksi")] ?? "").trim();
    if (!waktu || !no || !Number.isFinite(nominal) || nominal <= 0) { dilewati++; continue; }
    baris.push({
      no_transaksi: no,
      waktu_dibuat: waktu,
      nominal,
      ref: idx("No. Ref") >= 0 ? (r[idx("No. Ref")] ?? "").trim() || null : null,
      merchant_id: idx("Merchant ID") >= 0 ? (r[idx("Merchant ID")] ?? "").trim() || null : null,
      status: (r[idx("Status")] ?? "").trim().toUpperCase(),
    });
  }
  return { baris, dilewati, galat: null };
}
