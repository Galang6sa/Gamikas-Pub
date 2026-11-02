// Membaca bukti pembayaran QRIS dari screenshot. OCR berjalan di browser (Tesseract.js), gambar tidak dikirim ke server.

export type HasilBaca = {
  sukses: boolean;            // ada tanda transaksi berhasil
  nominal: number | null;
  waktuIso: string | null;    // ISO dengan zona waktu, null bila tanggal dan jam tidak terbaca
  merchantCocok: boolean;     // kode merchant (atau nama) ditemukan
  refId: string | null;
  ragu: string[];             // hal yang perlu perhatian, ditampilkan ke pengguna
};

const BULAN: Record<string, number> = {
  jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, mar: 3, maret: 3, march: 3, apr: 4, april: 4,
  mei: 5, may: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, agu: 8, ags: 8, agt: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, okt: 10, oct: 10, oktober: 10, october: 10, nov: 11, november: 11, des: 12, dec: 12, desember: 12, december: 12,
};

const dua = (n: number) => String(n).padStart(2, "0");

function bentukWaktu(hari: number, bulan: number, tahun: number, jam: number, menit: number, detik: number, sisa: string): string | null {
  if (bulan < 1 || bulan > 12 || hari < 1 || hari > 31 || jam > 23 || menit > 59 || detik > 59) return null;
  const cek = new Date(Date.UTC(tahun, bulan - 1, hari));
  if (cek.getUTCMonth() !== bulan - 1 || cek.getUTCDate() !== hari) return null; // mis. 31 Februari
  const zona = /\bWITA\b/.test(sisa) ? "+08:00" : /\bWIT\b/.test(sisa) ? "+09:00" : "+07:00";
  return `${tahun}-${dua(bulan)}-${dua(hari)}T${dua(jam)}:${dua(menit)}:${dua(detik)}${zona}`;
}

export function cariWaktu(teks: string): string | null {
  const pemisah = String.raw`[\s,\-–—•·.]*?`;
  const jamRe = String.raw`(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?`;
  const huruf = new RegExp(String.raw`(\d{1,2})\s*([A-Za-z]{3,9})\.?\s*(20\d{2})${pemisah}${jamRe}([^\n]{0,12})`, "g");
  for (const m of teks.matchAll(huruf)) {
    const bulan = BULAN[m[2].toLowerCase()];
    if (!bulan) continue;
    const iso = bentukWaktu(+m[1], bulan, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0, m[7] ?? "");
    if (iso) return iso;
  }
  const angka = new RegExp(String.raw`(\d{1,2})[/-](\d{1,2})[/-](20\d{2})${pemisah}${jamRe}([^\n]{0,12})`, "g");
  for (const m of teks.matchAll(angka)) {
    const iso = bentukWaktu(+m[1], +m[2], +m[3], +m[4], +m[5], m[6] ? +m[6] : 0, m[7] ?? "");
    if (iso) return iso;
  }
  return null;
}

export function cariNominal(teks: string): { nominal: number | null; beda: number[] } {
  const hasil: number[] = [];
  for (const m of teks.matchAll(/Rp\s?(\d{1,3}(?:[.,\s]\d{3})+|\d{3,9})(?:,\d{2})?(?!\d)/g)) {
    const n = Number(m[1].replace(/[.,\s]/g, ""));
    if (Number.isFinite(n) && n > 0) hasil.push(n);
  }
  const unik = [...new Set(hasil)];
  return { nominal: unik[0] ?? null, beda: unik.slice(1) };
}

export function cariRef(teks: string): string | null {
  const kandidat: string[] = [];
  for (const m of teks.matchAll(/(?:No\.?\s*Ref(?:erensi)?|Ref(?:erensi)?|RRN)\s*[:.]?\s*([A-Za-z0-9]{8,})/gi)) kandidat.push(m[1]);
  return kandidat.sort((a, b) => b.length - a.length)[0] ?? null;
}

// kodeMerchant: angka inti merchant (mis. 975190623), muncul di ID atau PAN. namaMerchant: opsional.
export function bacaTeks(teks: string, kodeMerchant: string, namaMerchant?: string | null): HasilBaca {
  const bersih = teks.replace(/\u00a0/g, " ");
  const { nominal, beda } = cariNominal(bersih);
  const waktuIso = cariWaktu(bersih);
  const gagal = /\b(gagal|failed|dibatalkan|kedaluwarsa)\b/i.test(bersih);
  const berhasil = /\b(berhasil|sukses|success)/i.test(bersih);
  const hanyaAngka = bersih.replace(/[^0-9]/g, "");
  const kode = kodeMerchant.replace(/\D/g, "");
  const namaCocok = namaMerchant
    ? new RegExp(namaMerchant.trim().split(/\s+/).slice(0, 2).join(String.raw`\s+`), "i").test(bersih)
    : false;
  const merchantCocok = (kode.length >= 6 && hanyaAngka.includes(kode)) || namaCocok;

  const ragu: string[] = [];
  if (!nominal) ragu.push("Nominal tidak terbaca.");
  if (beda.length) ragu.push("Ada lebih dari satu nominal di gambar. Pastikan yang terbaca benar.");
  if (!waktuIso) ragu.push("Tanggal dan jam tidak terbaca. Buka rincian transaksi lalu screenshot lagi bila bisa.");
  if (!merchantCocok) ragu.push("Penerima tidak terbaca atau bukan QRIS kelas.");
  if (!berhasil || gagal) ragu.push("Tidak ada tanda transaksi berhasil.");
  return { sukses: berhasil && !gagal, nominal, waktuIso, merchantCocok, refId: cariRef(bersih), ragu };
}

// Menaikkan kontras agar teks abu terang (tanggal, nomor PAN) ikut terbaca. Mengubah buffer RGBA menjadi skala abu.
export function tingkatkanKontras(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const keluar = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const g = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
    const v = 255 / (1 + Math.exp(-(g - 205) / 14));
    keluar[i] = keluar[i + 1] = keluar[i + 2] = v;
    keluar[i + 3] = 255;
  }
  return keluar;
}

export async function hashBerkas(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type OpsiBaca = { kodeMerchant: string; namaMerchant?: string | null; onProgress?: (pesan: string) => void };

// Hanya dipanggil di browser. Tesseract dimuat saat dibutuhkan agar tidak membebani halaman lain.
export async function bacaBukti(berkas: Blob, o: OpsiBaca): Promise<HasilBaca & { hash: string }> {
  const buf = await berkas.arrayBuffer();
  const hash = await hashBerkas(buf);
  o.onProgress?.("Menyiapkan pembaca");
  const bitmap = await createImageBitmap(berkas);
  const skala = Math.min(1, 1400 / bitmap.width);
  const kanvas = document.createElement("canvas");
  kanvas.width = Math.round(bitmap.width * skala);
  kanvas.height = Math.round(bitmap.height * skala);
  const ctx = kanvas.getContext("2d");
  if (!ctx) throw new Error("Browser belum bisa memproses gambar ini.");
  ctx.drawImage(bitmap, 0, 0, kanvas.width, kanvas.height);

  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    o.onProgress?.("Membaca bukti");
    let teks = (await worker.recognize(kanvas)).data.text;
    let hasil = bacaTeks(teks, o.kodeMerchant, o.namaMerchant);
    if (!hasil.waktuIso || !hasil.merchantCocok || !hasil.nominal) {
      o.onProgress?.("Memperjelas gambar");
      const piksel = ctx.getImageData(0, 0, kanvas.width, kanvas.height);
      const jernih = tingkatkanKontras(piksel.data);
      ctx.putImageData(new ImageData(jernih as Uint8ClampedArray<ArrayBuffer>, kanvas.width, kanvas.height), 0, 0);
      teks += "\n" + (await worker.recognize(kanvas)).data.text;
      hasil = bacaTeks(teks, o.kodeMerchant, o.namaMerchant);
    }
    return { ...hasil, hash };
  } finally {
    await worker.terminate();
  }
}
