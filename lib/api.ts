import { emailSiswa, supabase } from "@/lib/supabase";
import type { PapanRow, Ringkasan } from "@/lib/papan";

// ---------- galat ----------
export function galat(e: unknown): Error {
  const pesan = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  const kode = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
  if (/invalid login credentials/i.test(pesan)) return new Error("NRP atau PIN salah.");
  if (kode === "28000" || /kode kelas salah/i.test(pesan)) return new Error("Kode kelas salah.");
  if (/failed to fetch|networkerror|load failed/i.test(pesan)) return new Error("Jaringan sedang bermasalah. Periksa koneksi, lalu coba lagi.");
  if (/rate limit|too many/i.test(pesan)) return new Error("Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.");
  if (kode === "42501") return new Error("Kamu tidak punya izin untuk aksi ini.");
  return new Error(pesan || "Terjadi kesalahan. Coba lagi.");
}

async function jalankan<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw galat(error);
  return data as T;
}

// ---------- sesi ----------
export type Sesi = {
  userId: string;
  role: "siswa" | "bendahara";
  siswaId: string | null;
  nrp: string | null;
  nama: string | null;
  harusGantiPin: boolean;
};

export async function ambilDaftarNama(kode: string): Promise<{ nrp: string; nama: string }[]> {
  return jalankan(supabase().rpc("daftar_login", { p_kode: kode }));
}

export async function masukSiswa(nrp: string, pin: string): Promise<void> {
  const { error } = await supabase().auth.signInWithPassword({ email: emailSiswa(nrp), password: pin });
  if (error) throw galat(error);
}

export async function masukBendahara(email: string, kataSandi: string): Promise<void> {
  const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password: kataSandi });
  if (error) throw new Error("Email atau kata sandi salah.");
}

export async function keluar(): Promise<void> {
  await supabase().auth.signOut();
}

export async function gantiPin(pin: string): Promise<void> {
  const { error } = await supabase().auth.updateUser({ password: pin, data: { harus_ganti_pin: false } });
  if (error) throw galat(error);
  await supabase().auth.refreshSession(); // agar penanda harus_ganti_pin di sesi ikut diperbarui
}

export async function muatSesi(): Promise<Sesi | null> {
  const { data } = await supabase().auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  const profil = await jalankan<{ role: "siswa" | "bendahara"; siswa_id: string | null } | null>(
    supabase().from("profil").select("role, siswa_id").eq("id", user.id).maybeSingle(),
  );
  if (!profil) throw new Error("Akunmu belum terdaftar di kelas ini. Hubungi bendahara.");
  let nrp: string | null = null;
  let nama: string | null = null;
  if (profil.siswa_id) {
    const s = await jalankan<{ nrp: string; nama: string } | null>(
      supabase().from("siswa").select("nrp, nama").eq("id", profil.siswa_id).maybeSingle(),
    );
    nrp = s?.nrp ?? null;
    nama = s?.nama ?? null;
  }
  return { userId: user.id, role: profil.role, siswaId: profil.siswa_id, nrp, nama, harusGantiPin: user.user_metadata?.harus_ganti_pin === true };
}

// ---------- data kelas ----------
export type Saldo = { pemasukan_kas: number; pemasukan_denda: number; pengeluaran: number; saldo: number };
export type Konfigurasi = {
  nominal_mingguan: number; denda_aktif: boolean; denda_berlaku_mulai: string | null;
  merchant_kode: string; merchant_nama: string | null; toleransi_detik: number;
};
export type Pengeluaran = { id: string; tanggal: string; nominal: number; kategori: string; keterangan: string | null };
export type PembayaranPublik = { id: string; siswa_id: string; metode: "qris" | "cash"; nominal_bukti: number; waktu_bayar: string | null; status: string; dibuat_pada: string };
export type GopayTanpaPemilik = { no_transaksi: string; waktu_dibuat: string; nominal: number };
export type GopayRingkas = { no_transaksi: string; waktu_dibuat: string; nominal: number; pembayaran_id: string | null };

// PostgREST membatasi satu respons (bawaan Supabase 1000 baris). Papan tumbuh 29 baris per minggu,
// jadi diambil per halaman agar minggu terbaru tidak terpotong diam-diam.
export async function muatPapan(): Promise<PapanRow[]> {
  const ukuran = 1000;
  const semua: PapanRow[] = [];
  for (let dari = 0; ; dari += ukuran) {
    const hal = await jalankan<PapanRow[]>(
      supabase().from("papan").select("*").order("mulai").order("no_absen").range(dari, dari + ukuran - 1),
    );
    semua.push(...hal);
    if (hal.length < ukuran) return semua;
  }
}
export const muatSaldo = () => jalankan<Saldo>(supabase().from("saldo_kas").select("*").single());
export const muatKonfigurasi = () => jalankan<Konfigurasi>(supabase().from("konfigurasi").select("nominal_mingguan, denda_aktif, denda_berlaku_mulai, merchant_kode, merchant_nama, toleransi_detik").single());
export const muatPengeluaran = () =>
  jalankan<Pengeluaran[]>(supabase().from("pengeluaran").select("id, tanggal, nominal, kategori, keterangan").order("tanggal", { ascending: false }).limit(100));
export const muatPembayaran = () =>
  jalankan<PembayaranPublik[]>(supabase().from("pembayaran_publik").select("*").order("waktu_bayar", { ascending: false, nullsFirst: false }).limit(100));
export const muatRingkasan = () => jalankan<Ringkasan[]>(supabase().rpc("ringkasan_saya"));
export const muatTanpaPemilik = () =>
  jalankan<GopayTanpaPemilik[]>(supabase().from("gopay_txn").select("no_transaksi, waktu_dibuat, nominal").is("pembayaran_id", null).order("waktu_dibuat", { ascending: false }));

export async function hitungTotal(tagihanIds: string[]): Promise<{ jumlah: number; pokok: number; denda: number; total: number }> {
  const rows = await jalankan<{ jumlah: number; pokok: number; denda: number; total: number }[]>(supabase().rpc("hitung_total_saya", { p_tagihan: tagihanIds }));
  return rows[0];
}

// ---------- aksi bendahara ----------
export async function catatPembayaran(p: { nrp: string; metode: "cash" | "qris"; waktuIso: string; jumlahMinggu: number }): Promise<void> {
  await jalankan(supabase().rpc("catat_pembayaran_manual", { p_nrp: p.nrp, p_metode: p.metode, p_waktu: p.waktuIso, p_jumlah_minggu: p.jumlahMinggu }));
}
export async function bebaskanDenda(tagihanId: string, alasan: string): Promise<void> {
  await jalankan(supabase().rpc("bebaskan_denda", { p_tagihan: tagihanId, p_alasan: alasan }));
}
export async function aturLibur(mingguId: string, libur: boolean): Promise<void> {
  await jalankan(supabase().rpc("atur_minggu_libur", { p_minggu: mingguId, p_libur: libur }));
}
export async function batalkanPembayaran(id: string, alasan: string): Promise<void> {
  await jalankan(supabase().rpc("batalkan_pembayaran", { p_pembayaran: id, p_alasan: alasan }));
}
export async function setDendaAktif(aktif: boolean): Promise<void> {
  const { error } = await supabase().from("konfigurasi").update({ denda_aktif: aktif }).eq("id", 1);
  if (error) throw galat(error);
}
export async function tambahPengeluaran(p: { tanggal: string; nominal: number; kategori: string; keterangan: string }): Promise<void> {
  const { error } = await supabase().from("pengeluaran").insert({ tanggal: p.tanggal, nominal: p.nominal, kategori: p.kategori, keterangan: p.keterangan || null });
  if (error) throw galat(error);
}

// ---------- unggah bukti dan pencocokan (M3) ----------
export type HasilAjukan = { pembayaran_id: string; status: "terkonfirmasi" | "lunas_sementara" | "perlu_dicek" | "mencurigakan"; total: number };

export async function ajukanQris(p: {
  tagihanIds: string[]; nominal: number; waktuIso: string | null; ref: string | null; hash: string; ocr: Record<string, unknown>;
}): Promise<HasilAjukan> {
  const rows = await jalankan<HasilAjukan[]>(supabase().rpc("ajukan_pembayaran_qris", {
    p_tagihan: p.tagihanIds, p_nominal: p.nominal, p_waktu: p.waktuIso, p_ref: p.ref, p_hash: p.hash, p_ocr: p.ocr,
  }));
  return rows[0];
}
export async function batalkanKlaimSaya(id: string): Promise<void> {
  await jalankan(supabase().rpc("batalkan_klaim_saya", { p_pembayaran: id }));
}

export type KlaimAntrean = {
  id: string; siswa_id: string; nominal_bukti: number; waktu_bayar: string | null; status: string; dibuat_pada: string;
  hasil_ocr: { ragu?: string[] } | null;
  alokasi_pembayaran: { jumlah_pokok: number; jumlah_denda: number; tagihan: { minggu: { mulai: string; akhir: string } } | null }[];
};
export const muatAntrean = () =>
  jalankan<KlaimAntrean[]>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase().from("pembayaran")
      .select("id, siswa_id, nominal_bukti, waktu_bayar, status, dibuat_pada, hasil_ocr, alokasi_pembayaran(jumlah_pokok, jumlah_denda, tagihan(minggu(mulai, akhir)))")
      .in("status", ["perlu_dicek", "mencurigakan"]).order("dibuat_pada")) as unknown as PromiseLike<{ data: KlaimAntrean[] | null; error: unknown }>,
  );

export async function ambilSemua<T>(ambil: (dari: number, sampai: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const ukuran = 1000;
  const semua: T[] = [];
  for (let dari = 0; ; dari += ukuran) {
    const hal = await jalankan<T[]>(ambil(dari, dari + ukuran - 1));
    semua.push(...hal);
    if (hal.length < ukuran) return semua;
  }
}
export const muatGopayRingkas = () =>
  ambilSemua<GopayRingkas>((a, b) => supabase().from("gopay_txn").select("no_transaksi, waktu_dibuat, nominal, pembayaran_id").order("waktu_dibuat").range(a, b));
export const muatKlaimMenunggu = () =>
  jalankan<{ nominal_bukti: number }[]>(supabase().from("pembayaran").select("nominal_bukti").eq("metode", "qris").in("status", ["lunas_sementara", "perlu_dicek", "mencurigakan"]));

export async function imporGopay(baris: unknown[]): Promise<{ baru: number; dicocokkan: number; tanpa_pemilik: number; mencurigakan: number }> {
  const rows = await jalankan<{ baru: number; dicocokkan: number; tanpa_pemilik: number; mencurigakan: number }[]>(supabase().rpc("impor_gopay", { p_baris: baris }));
  return rows[0];
}
export async function tetapkanPemilik(noTransaksi: string, nrp: string): Promise<void> {
  await jalankan(supabase().rpc("tetapkan_pemilik", { p_no_transaksi: noTransaksi, p_nrp: nrp }));
}
export async function putuskanKlaim(p: { id: string; terima: boolean; alasan?: string; noTransaksi?: string }): Promise<void> {
  await jalankan(supabase().rpc("putuskan_klaim", { p_pembayaran: p.id, p_terima: p.terima, p_alasan: p.alasan ?? null, p_no_transaksi: p.noTransaksi ?? null }));
}

// ---------- pengingat wa.me ----------
export type LogPengingat = { siswa_id: string; tagihan_id: string; tahap: string; channel: string; status: string; waktu: string };
export const muatPengingat = () =>
  jalankan<LogPengingat[]>(supabase().from("log_pengingat").select("siswa_id, tagihan_id, tahap, channel, status, waktu").eq("channel", "wa").order("waktu", { ascending: false }).limit(400));
export async function catatPengingat(p: { siswaId: string; tagihanId: string; tahap: string; status: "dibuka" | "dikonfirmasi" }): Promise<void> {
  const { error } = await supabase().from("log_pengingat").insert({ siswa_id: p.siswaId, tagihan_id: p.tagihanId, tahap: p.tahap, channel: "wa", status: p.status });
  if (error) throw galat(error);
}
export const muatNoWa = () => jalankan<{ id: string; no_wa: string | null }[]>(supabase().from("siswa").select("id, no_wa"));
export async function simpanNoWa(siswaId: string, noWa: string): Promise<void> {
  const { error } = await supabase().from("siswa").update({ no_wa: noWa.trim() || null }).eq("id", siswaId);
  if (error) throw galat(error);
}
