// Fungsi murni untuk mengubah data dari database menjadi bentuk yang dipakai layar.
export type StatusTagihan = "terkonfirmasi" | "lunas_sementara" | "perlu_dicek" | "belum" | "libur";

export type PapanRow = {
  tagihan_id: string;
  siswa_id: string;
  no_absen: number;
  nrp: string;
  nama: string;
  minggu_id: string;
  mulai: string; // YYYY-MM-DD (Senin)
  akhir: string;
  jatuh_tempo: string;
  ditagih: boolean;
  nominal_pokok: number;
  denda_dibebaskan: boolean;
  metode: "qris" | "cash" | null;
  waktu_bayar: string | null;
  jumlah_denda: number | null;
  status: StatusTagihan;
};

export type Ringkasan = {
  tagihan_id: string;
  minggu_id: string;
  mulai: string;
  akhir: string;
  jatuh_tempo: string;
  status: StatusTagihan;
  pokok: number;
  denda: number;
  total: number;
  denda_dibebaskan: boolean;
};

export type StampStatus = "lunas" | "cek" | "ditolak" | "libur" | "bebas" | "belum";

export const LUNAS: StatusTagihan[] = ["terkonfirmasi", "lunas_sementara"];

export function stempel(status: StatusTagihan): StampStatus {
  if (status === "terkonfirmasi" || status === "lunas_sementara") return "lunas";
  if (status === "perlu_dicek") return "cek";
  if (status === "libur") return "libur";
  return "belum";
}

export function tanggalWib(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export type SiswaBaris = { id: string; nrp: string; nama: string; no_absen: number };
export type MingguBaris = { id: string; mulai: string; akhir: string; ditagih: boolean; jatuh_tempo: string };

export function susunMatriks(rows: PapanRow[]) {
  const siswa = new Map<string, SiswaBaris>();
  const minggu = new Map<string, MingguBaris>();
  const sel = new Map<string, PapanRow>();
  for (const r of rows) {
    siswa.set(r.siswa_id, { id: r.siswa_id, nrp: r.nrp, nama: r.nama, no_absen: r.no_absen });
    minggu.set(r.minggu_id, { id: r.minggu_id, mulai: r.mulai, akhir: r.akhir, ditagih: r.ditagih, jatuh_tempo: r.jatuh_tempo });
    sel.set(`${r.siswa_id}:${r.minggu_id}`, r);
  }
  return {
    siswa: [...siswa.values()].sort((a, b) => a.no_absen - b.no_absen),
    minggu: [...minggu.values()].sort((a, b) => a.mulai.localeCompare(b.mulai)),
    sel,
  };
}

// Minggu yang memuat tanggal hari ini (WIB). Bila belum ada, minggu terakhir yang sudah dibuat.
export function mingguBerjalan(minggu: MingguBaris[], now: Date): MingguBaris | undefined {
  const hari = tanggalWib(now);
  return minggu.find((m) => m.mulai <= hari && hari <= m.akhir) ?? minggu[minggu.length - 1];
}

export function lunasDiMinggu(rows: PapanRow[], mingguId: string): Set<string> {
  return new Set(rows.filter((r) => r.minggu_id === mingguId && LUNAS.includes(r.status)).map((r) => r.siswa_id));
}

export function bulanDari(minggu: MingguBaris[]): string[] {
  return [...new Set(minggu.map((m) => m.mulai.slice(0, 7)))];
}

// Tunggakan pokok: tagihan yang belum lunas dan sudah lewat jatuh tempo. Denda tidak ikut dihitung di sini.
export function tunggakanPokok(rows: PapanRow[], siswaId: string, now: Date): number {
  return rows
    .filter((r) => r.siswa_id === siswaId && r.status === "belum" && r.ditagih && Date.parse(r.jatuh_tempo) < now.getTime())
    .reduce((sum, r) => sum + r.nominal_pokok, 0);
}

export function sudahTelat(r: Pick<Ringkasan, "status" | "jatuh_tempo">, now: Date): boolean {
  return r.status === "belum" && Date.parse(r.jatuh_tempo) < now.getTime();
}

export function rupiah(value: number): string {
  return `Rp${Math.round(value).toLocaleString("id-ID")}`;
}

// Keterangan karcis. Angka denda selalu berasal dari server, tidak dihitung ulang di sini.
export function keterangan(r: Ringkasan, now: Date, dendaAktif: boolean): string {
  switch (r.status) {
    case "terkonfirmasi":
      return r.denda > 0 ? "Lunas. Denda keterlambatan sudah dibayar." : "Lunas.";
    case "lunas_sementara":
      return "Lunas sementara. Menunggu konfirmasi dengan laporan QRIS.";
    case "perlu_dicek":
      return "Bukti pembayaran menunggu cek bendahara.";
    case "libur":
      return "Minggu libur. Tidak ada tagihan.";
    default:
      if (sudahTelat(r, now)) {
        if (r.denda > 0) return `Telat. Denda ${rupiah(r.denda)}.`;
        return dendaAktif ? "Sudah lewat jatuh tempo." : "Sudah lewat jatuh tempo. Denda sedang tidak dihitung.";
      }
      return "Jatuh tempo Minggu malam.";
  }
}

export function namaBulan(bulan: string): string {
  return new Date(`${bulan}-01T12:00:00+07:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
}

// Berapa minggu berturut-turut (dari yang terbaru) dibayar sebelum jatuh tempo. Minggu libur dilewati,
// dan minggu berjalan yang belum lunas tidak memutus rangkaian.
export function rangkaianTepat(rows: PapanRow[], siswaId: string, now: Date): number {
  const milik = rows.filter((r) => r.siswa_id === siswaId).sort((a, b) => b.mulai.localeCompare(a.mulai));
  let n = 0;
  for (const r of milik) {
    if (!r.ditagih || r.status === "libur") continue;
    const jatuh = Date.parse(r.jatuh_tempo);
    if (!LUNAS.includes(r.status)) {
      if (jatuh >= now.getTime()) continue;
      break;
    }
    if (r.waktu_bayar && Date.parse(r.waktu_bayar) <= jatuh) n++;
    else break;
  }
  return n;
}
