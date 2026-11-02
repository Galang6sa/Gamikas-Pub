import { describe, expect, it } from "vitest";
import { rangkaianTepat, bulanDari, keterangan, lunasDiMinggu, mingguBerjalan, namaBulan, rupiah, stempel, sudahTelat, susunMatriks, tanggalWib, tunggakanPokok, type PapanRow, type Ringkasan } from "./papan";
import { periksaPinBaru, pinLemah } from "./pin";
import { galat } from "./api";

const baris = (o: Partial<PapanRow>): PapanRow => ({
  tagihan_id: "t", siswa_id: "s1", no_absen: 1, nrp: "061", nama: "Siswa A", minggu_id: "m1", mulai: "2026-10-19", akhir: "2026-10-25",
  jatuh_tempo: "2026-10-25T16:59:59Z", ditagih: true, nominal_pokok: 5000, denda_dibebaskan: false, metode: null, waktu_bayar: null,
  jumlah_denda: null, status: "belum", ...o,
});
const ring = (o: Partial<Ringkasan>): Ringkasan => ({
  tagihan_id: "t", minggu_id: "m", mulai: "2026-10-12", akhir: "2026-10-18", jatuh_tempo: "2026-10-18T16:59:59Z", status: "belum", pokok: 5000, denda: 0, total: 5000, denda_dibebaskan: false, pembayaran_id: null, ...o,
});
const kini = new Date("2026-10-23T10:00:00+07:00");

describe("susunMatriks dan minggu berjalan", () => {
  const rows = [
    baris({ siswa_id: "s2", no_absen: 2, nrp: "062", nama: "B", tagihan_id: "a" }),
    baris({ siswa_id: "s1", no_absen: 1, tagihan_id: "b" }),
    baris({ siswa_id: "s1", minggu_id: "m0", mulai: "2026-10-12", akhir: "2026-10-18", jatuh_tempo: "2026-10-18T16:59:59Z", tagihan_id: "c" }),
  ];
  it("mengurutkan siswa menurut absen dan minggu menurut tanggal", () => {
    const m = susunMatriks(rows);
    expect(m.siswa.map((s) => s.nrp)).toEqual(["061", "062"]);
    expect(m.minggu.map((x) => x.mulai)).toEqual(["2026-10-12", "2026-10-19"]);
    expect(m.sel.get("s1:m0")?.tagihan_id).toBe("c");
  });
  it("memilih minggu yang memuat hari ini menurut WIB", () => {
    const m = susunMatriks(rows);
    expect(mingguBerjalan(m.minggu, kini)?.mulai).toBe("2026-10-19");
    // Minggu 25 Okt 23.30 WIB masih minggu yang sama walau sudah Senin di UTC? (tidak: 16.30 UTC masih Minggu)
    expect(mingguBerjalan(m.minggu, new Date("2026-10-25T23:30:00+07:00"))?.mulai).toBe("2026-10-19");
    // Setelah semua minggu terlewat, pakai minggu terakhir yang ada
    expect(mingguBerjalan(m.minggu, new Date("2026-12-01T10:00:00+07:00"))?.mulai).toBe("2026-10-19");
  });
  it("tanggal WIB tidak bergeser oleh UTC", () => {
    expect(tanggalWib(new Date("2026-10-25T17:30:00Z"))).toBe("2026-10-26");
  });
  it("mengelompokkan bulan", () => {
    expect(bulanDari(susunMatriks([baris({}), baris({ minggu_id: "x", mulai: "2026-09-28", akhir: "2026-10-04" })]).minggu)).toEqual(["2026-09", "2026-10"]);
    expect(namaBulan("2026-10")).toMatch(/Oktober 2026/);
  });
});

describe("status dan tunggakan", () => {
  it("memetakan status ke stempel", () => {
    expect(stempel("terkonfirmasi")).toBe("lunas");
    expect(stempel("lunas_sementara")).toBe("lunas");
    expect(stempel("perlu_dicek")).toBe("cek");
    expect(stempel("mencurigakan")).toBe("tinjau");
    expect(stempel("libur")).toBe("libur");
    expect(stempel("belum")).toBe("belum");
  });
  it("menghitung yang lunas di satu minggu", () => {
    const rows = [baris({ siswa_id: "a", status: "terkonfirmasi" }), baris({ siswa_id: "b", status: "lunas_sementara" }), baris({ siswa_id: "c", status: "perlu_dicek" }), baris({ siswa_id: "d" })];
    expect([...lunasDiMinggu(rows, "m1")].sort()).toEqual(["a", "b"]);
  });
  it("tunggakan pokok hanya untuk yang lewat jatuh tempo, belum lunas, dan ditagih", () => {
    const rows = [
      baris({ tagihan_id: "1", minggu_id: "x", jatuh_tempo: "2026-10-11T16:59:59Z" }),
      baris({ tagihan_id: "2", minggu_id: "y", jatuh_tempo: "2026-10-18T16:59:59Z" }),
      baris({ tagihan_id: "3", minggu_id: "z", jatuh_tempo: "2026-10-25T16:59:59Z" }),
      baris({ tagihan_id: "4", minggu_id: "w", jatuh_tempo: "2026-10-04T16:59:59Z", status: "terkonfirmasi" }),
      baris({ tagihan_id: "5", minggu_id: "v", jatuh_tempo: "2026-09-27T16:59:59Z", ditagih: false, status: "libur" }),
    ];
    expect(tunggakanPokok(rows, "s1", kini)).toBe(10000);
  });
  it("keterangan memakai angka denda dari server", () => {
    expect(keterangan(ring({ status: "belum", denda: 1500, total: 6500, jatuh_tempo: "2026-10-11T16:59:59Z" }), kini, true)).toBe("Telat. Denda Rp1.500.");
    expect(keterangan(ring({ status: "belum", jatuh_tempo: "2026-10-11T16:59:59Z" }), kini, false)).toMatch(/Denda sedang tidak dihitung/);
    expect(keterangan(ring({ status: "belum", jatuh_tempo: "2026-10-25T16:59:59Z" }), kini, true)).toBe("Jatuh tempo Minggu malam.");
    expect(keterangan(ring({ status: "terkonfirmasi", denda: 1000 }), kini, true)).toMatch(/Denda keterlambatan sudah dibayar/);
    expect(sudahTelat(ring({ status: "terkonfirmasi", jatuh_tempo: "2026-10-11T16:59:59Z" }), kini)).toBe(false);
  });
  it("format rupiah", () => {
    expect(rupiah(17500)).toBe("Rp17.500");
  });
});

describe("PIN", () => {
  it("menolak PIN lemah dan menerima yang acak", () => {
    for (const p of ["111111", "121212", "123456", "654321", "061482", "482061"]) expect(pinLemah(p, "061")).toBe(true);
    expect(pinLemah("739204", "061")).toBe(false);
  });
  it("memeriksa PIN baru", () => {
    expect(periksaPinBaru("12345", "12345", "061")).toMatch(/6 angka/);
    expect(periksaPinBaru("739204", "739205", "061")).toMatch(/belum sama/);
    expect(periksaPinBaru("739204", "739204", "061", "739204")).toMatch(/berbeda/);
    expect(periksaPinBaru("123456", "123456", "061")).toMatch(/mudah ditebak/);
    expect(periksaPinBaru("739204", "739204", "061", "482915")).toBeNull();
  });
});

describe("pesan galat", () => {
  it("menerjemahkan galat umum ke bahasa Indonesia", () => {
    expect(galat({ message: "Invalid login credentials" }).message).toBe("NRP atau PIN salah.");
    expect(galat({ message: "Kode kelas salah", code: "28000" }).message).toBe("Kode kelas salah.");
    expect(galat(new TypeError("Failed to fetch")).message).toMatch(/Jaringan/);
    expect(galat({ message: "x", code: "42501" }).message).toMatch(/izin/);
    expect(galat({ message: "Alasan wajib diisi" }).message).toBe("Alasan wajib diisi");
  });
});

describe("rangkaian tepat waktu", () => {
  const w = (mulai: string, due: string, o: Partial<PapanRow>) => baris({ tagihan_id: mulai, minggu_id: mulai, mulai, jatuh_tempo: due, ...o });
  const tepat = (mulai: string, due: string) => w(mulai, due, { status: "terkonfirmasi", waktu_bayar: "2026-10-01T03:00:00Z" });
  it("menghitung dari minggu terbaru, melewati libur dan minggu berjalan yang belum lunas", () => {
    const rows = [
      tepat("2026-09-28", "2026-10-04T16:59:59Z"),
      w("2026-10-05", "2026-10-11T16:59:59Z", { status: "libur", ditagih: false }),
      tepat("2026-10-12", "2026-10-18T16:59:59Z"),
      w("2026-10-19", "2026-10-25T16:59:59Z", {}), // minggu berjalan, belum lunas
    ];
    expect(rangkaianTepat(rows, "s1", kini)).toBe(2);
  });
  it("terputus oleh minggu telat atau belum lunas yang sudah lewat", () => {
    const rows = [
      tepat("2026-09-28", "2026-10-04T16:59:59Z"),
      w("2026-10-05", "2026-10-11T16:59:59Z", { status: "terkonfirmasi", waktu_bayar: "2026-10-14T03:00:00Z" }), // lunas tapi telat
      tepat("2026-10-12", "2026-10-18T16:59:59Z"),
    ];
    expect(rangkaianTepat(rows, "s1", kini)).toBe(1);
    expect(rangkaianTepat([w("2026-10-05", "2026-10-11T16:59:59Z", {})], "s1", kini)).toBe(0);
  });
});
