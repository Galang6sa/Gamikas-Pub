// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PapanRow, Ringkasan } from "@/lib/papan";
import type { KlaimAntrean, Sesi } from "@/lib/api";
import type { DataKelas } from "./useKelas";
import type { Ctx } from "./tipe";

vi.mock("@/lib/api", async () => {
  const asli = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...asli,
    ambilDaftarNama: vi.fn(), masukSiswa: vi.fn(), masukBendahara: vi.fn(), gantiPin: vi.fn(), hitungTotal: vi.fn(),
    catatPembayaran: vi.fn(), setDendaAktif: vi.fn(), bebaskanDenda: vi.fn(), aturLibur: vi.fn(), batalkanPembayaran: vi.fn(), tambahPengeluaran: vi.fn(),
    ajukanQris: vi.fn(), batalkanKlaimSaya: vi.fn(), muatAntrean: vi.fn(), putuskanKlaim: vi.fn(), imporGopay: vi.fn(), tetapkanPemilik: vi.fn(),
    muatGopayRingkas: vi.fn(), muatKlaimMenunggu: vi.fn(), muatPengingat: vi.fn(), muatNoWa: vi.fn(), catatPengingat: vi.fn(), simpanNoWa: vi.fn(),
  };
});
vi.mock("@/lib/ocr", async () => {
  const asli = await vi.importActual<typeof import("@/lib/ocr")>("@/lib/ocr");
  return { ...asli, bacaBukti: vi.fn() };
});

import * as api from "@/lib/api";
import * as ocr from "@/lib/ocr";
import Bayar from "./Bayar";
import Beranda from "./Beranda";
import GantiPin from "./GantiPin";
import Masuk from "./Masuk";
import MejaBendahara from "./MejaBendahara";
import PapanKelas from "./PapanKelas";
import { StatusStamp } from "@/components/ui";

const m = vi.mocked(api);
const kini = new Date("2026-10-23T10:00:00+07:00");

beforeEach(() => { window.localStorage.clear(); vi.clearAllMocks(); });
afterEach(cleanup);

// ---------- Masuk ----------
describe("Masuk siswa", () => {
  it("kode kelas, cari nama, PIN, lalu masuk; kode dan nama diingat perangkat", async () => {
    m.ambilDaftarNama.mockResolvedValue([{ nrp: "061", nama: "Hirohito Ischihara" }, { nrp: "076", nama: "Muhammad Qiyas Ilyasa'" }]);
    m.masukSiswa.mockResolvedValue();
    const onMasuk = vi.fn().mockResolvedValue(undefined);
    const u = userEvent.setup();
    render(<Masuk mode="siswa" onMasuk={onMasuk} />);

    await u.type(await screen.findByLabelText("Kode kelas"), "meja-biru-47");
    await u.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(m.ambilDaftarNama).toHaveBeenCalledWith("meja-biru-47");
    expect(window.localStorage.getItem("kaskelas-kode")).toBe("meja-biru-47");

    await u.type(await screen.findByLabelText("Cari namamu"), "qiyas");
    expect(screen.queryByText("Hirohito Ischihara")).toBeNull();
    await u.click(screen.getByRole("button", { name: /Qiyas/ }));
    await u.type(screen.getByLabelText("PIN enam digit"), "739204");
    await u.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(onMasuk).toHaveBeenCalled());
    expect(m.masukSiswa).toHaveBeenCalledWith("076", "739204");
    expect(JSON.parse(window.localStorage.getItem("kaskelas-perangkat")!)).toEqual({ nrp: "076", nama: "Muhammad Qiyas Ilyasa'" });
  });

  it("perangkat yang sudah dikenal langsung ke PIN, tanpa kode kelas", async () => {
    window.localStorage.setItem("kaskelas-perangkat", JSON.stringify({ nrp: "076", nama: "Qiyas" }));
    window.localStorage.setItem("kaskelas-kode", "meja-biru-47");
    render(<Masuk mode="siswa" onMasuk={vi.fn()} />);
    expect(await screen.findByLabelText("PIN enam digit")).toBeTruthy();
    expect(screen.queryByLabelText("Kode kelas")).toBeNull();
    expect(m.ambilDaftarNama).not.toHaveBeenCalled();
  });

  it("bukan aku: memakai kode tersimpan dan langsung menampilkan daftar nama tanpa mengetik kode lagi", async () => {
    window.localStorage.setItem("kaskelas-perangkat", JSON.stringify({ nrp: "076", nama: "Qiyas" }));
    window.localStorage.setItem("kaskelas-kode", "meja-biru-47");
    m.ambilDaftarNama.mockResolvedValue([{ nrp: "061", nama: "Hirohito" }]);
    const u = userEvent.setup();
    render(<Masuk mode="siswa" onMasuk={vi.fn()} />);
    await u.click(await screen.findByRole("button", { name: /Ganti nama/ }));
    expect(await screen.findByLabelText("Cari namamu")).toBeTruthy();
    expect(m.ambilDaftarNama).toHaveBeenCalledWith("meja-biru-47");
    expect(window.localStorage.getItem("kaskelas-perangkat")).toBeNull();
  });

  it("hanya kode tersimpan: daftar nama langsung tampil saat dibuka", async () => {
    window.localStorage.setItem("kaskelas-kode", "meja-biru-47");
    m.ambilDaftarNama.mockResolvedValue([{ nrp: "061", nama: "Hirohito Ischihara" }]);
    render(<Masuk mode="siswa" onMasuk={vi.fn()} />);
    expect(await screen.findByRole("button", { name: /Hirohito/ })).toBeTruthy();
    expect(screen.queryByLabelText("Kode kelas")).toBeNull();
  });

  it("kode tersimpan yang sudah diganti bendahara: dihapus dan diminta kode baru", async () => {
    window.localStorage.setItem("kaskelas-kode", "kode-lama");
    m.ambilDaftarNama.mockRejectedValue(new Error("Kode kelas salah."));
    render(<Masuk mode="siswa" onMasuk={vi.fn()} />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/sudah diganti/);
    expect(window.localStorage.getItem("kaskelas-kode")).toBeNull();
    expect(screen.getByLabelText("Kode kelas")).toBeTruthy();
  });

  it("galat jaringan tidak menghapus kode tersimpan", async () => {
    window.localStorage.setItem("kaskelas-kode", "meja-biru-47");
    m.ambilDaftarNama.mockRejectedValue(new Error("Jaringan sedang bermasalah. Periksa koneksi, lalu coba lagi."));
    render(<Masuk mode="siswa" onMasuk={vi.fn()} />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/Jaringan/);
    expect(window.localStorage.getItem("kaskelas-kode")).toBe("meja-biru-47");
  });

  it("PIN salah menampilkan galat dan tidak masuk", async () => {
    window.localStorage.setItem("kaskelas-perangkat", JSON.stringify({ nrp: "061", nama: "Hirohito" }));
    m.masukSiswa.mockRejectedValue(new Error("NRP atau PIN salah."));
    const onMasuk = vi.fn();
    const u = userEvent.setup();
    render(<Masuk mode="siswa" onMasuk={onMasuk} />);
    await u.type(await screen.findByLabelText("PIN enam digit"), "111222");
    await u.click(screen.getByRole("button", { name: "Masuk" }));
    expect((await screen.findByRole("alert")).textContent).toBe("NRP atau PIN salah.");
    expect(onMasuk).not.toHaveBeenCalled();
  });

  it("halaman siswa tidak menampilkan jalan masuk bendahara", async () => {
    render(<Masuk mode="siswa" onMasuk={vi.fn()} />);
    await screen.findByLabelText("Kode kelas");
    expect(screen.queryByLabelText("Email bendahara")).toBeNull();
    expect(screen.queryByText(/kamu bendahara|masuk di sini/i)).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("Masuk bendahara (rute terpisah)", () => {
  it("memakai email dan kata sandi, tanpa kode kelas", async () => {
    m.masukBendahara.mockResolvedValue();
    const onMasuk = vi.fn().mockResolvedValue(undefined);
    const u = userEvent.setup();
    render(<Masuk mode="bendahara" onMasuk={onMasuk} />);
    expect(screen.queryByLabelText("Kode kelas")).toBeNull();
    await u.type(screen.getByLabelText("Email bendahara"), "bendahara@contoh.id");
    await u.type(screen.getByLabelText("Kata sandi"), "sandi-yang-panjang-1");
    await u.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(onMasuk).toHaveBeenCalled());
    expect(m.masukBendahara).toHaveBeenCalledWith("bendahara@contoh.id", "sandi-yang-panjang-1");
    expect(screen.getByRole("link", { name: "Halaman masuk siswa" }).getAttribute("href")).toBe("/");
  });
});

describe("Ganti PIN", () => {
  it("menolak PIN lemah dan menyimpan PIN yang baik", async () => {
    m.gantiPin.mockResolvedValue();
    const selesai = vi.fn().mockResolvedValue(undefined);
    const u = userEvent.setup();
    render(<GantiPin nrp="061" wajib onSelesai={selesai} onBatal={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Batal" })).toBeNull();
    await u.type(screen.getByLabelText("PIN baru"), "123456");
    await u.type(screen.getByLabelText("Ketik ulang PIN baru"), "123456");
    await u.click(screen.getByRole("button", { name: "Simpan PIN" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/mudah ditebak/);
    expect(m.gantiPin).not.toHaveBeenCalled();
    await u.clear(screen.getByLabelText("PIN baru")); await u.clear(screen.getByLabelText("Ketik ulang PIN baru"));
    await u.type(screen.getByLabelText("PIN baru"), "739204");
    await u.type(screen.getByLabelText("Ketik ulang PIN baru"), "739204");
    await u.click(screen.getByRole("button", { name: "Simpan PIN" }));
    await waitFor(() => expect(selesai).toHaveBeenCalled());
    expect(m.gantiPin).toHaveBeenCalledWith("739204");
  });
});

// ---------- fixture ----------
const sesiSiswa: Sesi = { userId: "u1", role: "siswa", siswaId: "s1", nrp: "061", nama: "Hirohito Ischihara", harusGantiPin: false };
const sesiBendahara: Sesi = { userId: "u9", role: "bendahara", siswaId: null, nrp: null, nama: null, harusGantiPin: false };
const baris = (s: string, absen: number, nrp: string, nama: string, mid: string, mulai: string, akhir: string, due: string, status: PapanRow["status"]): PapanRow => ({
  tagihan_id: `${s}-${mid}`, siswa_id: s, no_absen: absen, nrp, nama, minggu_id: mid, mulai, akhir, jatuh_tempo: due, ditagih: true,
  nominal_pokok: 5000, denda_dibebaskan: false, metode: null, waktu_bayar: null, jumlah_denda: null, status,
});
const papan: PapanRow[] = [
  baris("s1", 1, "061", "Hirohito Ischihara", "w0", "2026-09-28", "2026-10-04", "2026-10-04T16:59:59Z", "terkonfirmasi"),
  baris("s1", 1, "061", "Hirohito Ischihara", "w1", "2026-10-12", "2026-10-18", "2026-10-18T16:59:59Z", "belum"),
  baris("s1", 1, "061", "Hirohito Ischihara", "w2", "2026-10-19", "2026-10-25", "2026-10-25T16:59:59Z", "belum"),
  baris("s2", 2, "062", "Muhammad Qiyas Ilyasa'", "w0", "2026-09-28", "2026-10-04", "2026-10-04T16:59:59Z", "terkonfirmasi"),
  baris("s2", 2, "062", "Muhammad Qiyas Ilyasa'", "w1", "2026-10-12", "2026-10-18", "2026-10-18T16:59:59Z", "terkonfirmasi"),
  baris("s2", 2, "062", "Muhammad Qiyas Ilyasa'", "w2", "2026-10-19", "2026-10-25", "2026-10-25T16:59:59Z", "perlu_dicek"),
];
const ringkasan: Ringkasan[] = [
  { tagihan_id: "s1-w1", minggu_id: "w1", mulai: "2026-10-12", akhir: "2026-10-18", jatuh_tempo: "2026-10-18T16:59:59Z", status: "belum", pokok: 5000, denda: 1000, total: 6000, denda_dibebaskan: false, pembayaran_id: null },
  { tagihan_id: "s1-w2", minggu_id: "w2", mulai: "2026-10-19", akhir: "2026-10-25", jatuh_tempo: "2026-10-25T16:59:59Z", status: "belum", pokok: 5000, denda: 0, total: 5000, denda_dibebaskan: false, pembayaran_id: null },
];
const kelasData = (o: Partial<DataKelas> = {}): DataKelas => ({
  status: "siap", pesan: "", diperbarui: kini, papan, ringkasan, saldo: { pemasukan_kas: 10000, pemasukan_denda: 0, pengeluaran: 2000, saldo: 8000 },
  konfigurasi: { nominal_mingguan: 5000, denda_aktif: true, denda_berlaku_mulai: null, merchant_kode: "975190623", merchant_nama: null, toleransi_detik: 30 },
  pengeluaran: [], pembayaran: [], tanpaPemilik: [], ...o,
});
const ctxDari = (sesi: Sesi, o: Partial<DataKelas> = {}): Ctx => ({
  sesi, kelas: kelasData(o), muat: vi.fn<() => Promise<void>>().mockResolvedValue(undefined), sekarang: kini,
  notify: vi.fn<(pesan: string) => void>(), go: vi.fn<Ctx["go"]>(), bunyi: false,
});

// ---------- stempel ----------
describe("Stempel", () => {
  it("memuat teks sungguhan yang bisa dibaca, bukan gambar kecil, dengan label aksesibel", () => {
    render(<><StatusStamp status="lunas" /><StatusStamp status="cek" compact /><StatusStamp status="belum" /><StatusStamp status="tinjau" /></>);
    expect(screen.getByRole("img", { name: "Lunas" }).textContent).toBe("LUNAS");
    expect(screen.getByRole("img", { name: "Perlu dicek" }).textContent).toBe("DICEK");
    expect(screen.getByRole("img", { name: "Belum bayar" }).textContent).toBe("BELUM");
    expect(screen.getByRole("img", { name: "Perlu ditinjau" }).textContent).toBe("TINJAU");
    expect(document.querySelector("svg")).toBeNull();
  });
});

// ---------- Beranda ----------
describe("Beranda siswa", () => {
  it("menampilkan karcis minggu ini, tunggakan dari server, dan saldo", async () => {
    const bukaBayar = vi.fn();
    const u = userEvent.setup();
    render(<Beranda ctx={ctxDari(sesiSiswa)} bukaBayar={bukaBayar} />);
    expect(screen.getByRole("heading", { name: "Halo, Hirohito." })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Rp5.000" })).toBeTruthy();
    expect(screen.getByText("Telat. Denda Rp1.000.")).toBeTruthy();
    expect(screen.getByText("Rp8.000")).toBeTruthy();
    await u.click(screen.getByRole("button", { name: "Bayar Rp5.000" }));
    expect(bukaBayar).toHaveBeenCalledWith("s1-w2");
  });
});

// ---------- Papan ----------
describe("Papan kelas", () => {
  it("menampilkan dua bulan sekaligus dan nama singkat agar tidak menutupi status", async () => {
    const u = userEvent.setup();
    render(<PapanKelas ctx={ctxDari(sesiSiswa)} awal="papan" />);
    expect(screen.getByRole("heading", { name: "September 2026" })).toBeTruthy();  // bulan sebelumnya ikut tampil
    expect(screen.getByRole("heading", { name: "Oktober 2026" })).toBeTruthy();
    expect(screen.getAllByTitle("Hirohito Ischihara").length).toBe(2);             // nama lengkap ada di title, satu per tabel
    expect(screen.getAllByText("Hirohito I.").length).toBe(2);
    expect(screen.getAllByText("Qiyas I.").length).toBe(2);                        // Muhammad dilewati
    const sel = screen.getAllByRole("img", { name: "Lunas" });
    expect(sel.length).toBeGreaterThan(0);
    await u.click(screen.getAllByRole("button", { name: "2. Muhammad Qiyas Ilyasa'" })[0]);
    expect(screen.getByRole("dialog").textContent).toMatch(/Muhammad Qiyas Ilyasa'/);
  });
  it("baris milik pengguna ada di paling atas", () => {
    render(<PapanKelas ctx={ctxDari(sesiSiswa)} awal="papan" />);
    const baris = document.querySelectorAll(".month-board:not(.month-board--lalu) tbody tr");
    expect(baris[0].className).toMatch(/board-me/);
  });
});

// ---------- Bayar ----------
const berkasGambar = () => new File(["gambar-contoh"], "bukti.png", { type: "image/png" });
const bacaan = (o: Partial<Awaited<ReturnType<typeof ocr.bacaBukti>>> = {}) => ({
  sukses: true, nominal: 6000, waktuIso: "2026-10-23T09:00:00+07:00", merchantCocok: true, refId: "REF123456789", ragu: [], hash: "h".repeat(64), ...o,
});

describe("Bayar", () => {
  beforeEach(() => {
    m.hitungTotal.mockImplementation(async (ids) => ({ jumlah: ids.length, pokok: ids.length * 5000, denda: ids.includes("s1-w1") ? 1000 : 0, total: ids.length * 5000 + (ids.includes("s1-w1") ? 1000 : 0) }));
  });

  it("kotak centang selalu ada dan konsisten; total dihitung server; tombol berada dalam satu bar", async () => {
    const u = userEvent.setup();
    render(<Bayar ctx={ctxDari(sesiSiswa)} awal="s1-w2" />);
    const kotak = screen.getAllByRole("checkbox");
    expect(kotak).toHaveLength(2);                                   // setiap karcis punya kotak centang, terpilih atau tidak
    expect(kotak.map((k) => k.getAttribute("aria-checked"))).toEqual(["false", "true"]);
    expect(kotak.every((k) => k.querySelector(".ticket-check"))).toBe(true);
    await waitFor(() => expect(document.querySelector(".pay-bar-total strong")?.textContent).toBe("Rp5.000"));
    await u.click(kotak[0]);
    await waitFor(() => expect(m.hitungTotal).toHaveBeenLastCalledWith(["s1-w2", "s1-w1"]));
    await waitFor(() => expect(document.querySelector(".pay-bar-total strong")?.textContent).toBe("Rp11.000"));
    expect(document.querySelector(".pay-bar .button")?.textContent).toBe("Lanjut bayar");
  });

  it("alasan tombol nonaktif ditulis di dekat total, bukan di bawah tombol", async () => {
    const u = userEvent.setup();
    render(<Bayar ctx={ctxDari(sesiSiswa)} awal="s1-w2" />);
    await u.click(screen.getAllByRole("checkbox")[1]);
    expect(screen.getByText("Pilih minimal satu minggu.").closest(".pay-bar-total")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Lanjut bayar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("alur penuh: pilih, QRIS, unggah bukti, baca, kirim, hasil", async () => {
    vi.mocked(ocr.bacaBukti).mockResolvedValue(bacaan());
    m.ajukanQris.mockResolvedValue({ pembayaran_id: "p1", status: "lunas_sementara", total: 6000 });
    const ctx = ctxDari(sesiSiswa);
    const u = userEvent.setup();
    render(<Bayar ctx={ctx} awal="s1-w1" />);
    await waitFor(() => expect(document.querySelector(".pay-bar-total strong")?.textContent).toBe("Rp6.000"));
    await u.click(screen.getByRole("button", { name: "Lanjut bayar" }));
    expect(screen.getByRole("heading", { name: "Bayar lewat QRIS." })).toBeTruthy();
    expect(document.querySelector(".big-amount")?.textContent).toBe("Rp6.000");
    await u.click(screen.getByRole("button", { name: "Sudah bayar, unggah bukti" }));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await u.upload(input, berkasGambar());
    await waitFor(() => expect(ocr.bacaBukti).toHaveBeenCalled());
    expect(vi.mocked(ocr.bacaBukti).mock.calls[0][1]).toMatchObject({ kodeMerchant: "975190623" });
    const hasil = await screen.findByRole("list", { name: "Hasil pembacaan bukti" });
    expect(within(hasil).getByText("Rp6.000, cocok")).toBeTruthy();
    expect(within(hasil).getByText("QRIS kelas")).toBeTruthy();

    await u.click(screen.getByRole("button", { name: "Kirim bukti" }));
    await waitFor(() => expect(m.ajukanQris).toHaveBeenCalled());
    expect(m.ajukanQris.mock.calls[0][0]).toMatchObject({ tagihanIds: ["s1-w1"], nominal: 6000, waktuIso: "2026-10-23T09:00:00+07:00", ref: "REF123456789", hash: "h".repeat(64) });
    expect(await screen.findByText(/Tercatat lunas sementara/)).toBeTruthy();
    expect(ctx.muat).toHaveBeenCalled();
  });

  it("nominal di bukti berbeda: peringatan dan tombol kirim nonaktif", async () => {
    vi.mocked(ocr.bacaBukti).mockResolvedValue(bacaan({ nominal: 5000 }));
    const u = userEvent.setup();
    render(<Bayar ctx={ctxDari(sesiSiswa)} awal="s1-w1" />);
    await waitFor(() => expect(document.querySelector(".pay-bar-total strong")?.textContent).toBe("Rp6.000"));
    await u.click(screen.getByRole("button", { name: "Lanjut bayar" }));
    await u.click(screen.getByRole("button", { name: "Sudah bayar, unggah bukti" }));
    await u.upload(document.querySelector('input[type="file"]') as HTMLInputElement, berkasGambar());
    expect((await screen.findByRole("alert")).textContent).toMatch(/berbeda dengan total/);
    expect((screen.getByRole("button", { name: "Kirim bukti" }) as HTMLButtonElement).disabled).toBe(true);
    expect(m.ajukanQris).not.toHaveBeenCalled();
  });

  it("bukti tanpa tanggal tetap bisa dikirim dan hasilnya perlu dicek", async () => {
    vi.mocked(ocr.bacaBukti).mockResolvedValue(bacaan({ waktuIso: null, merchantCocok: false, ragu: ["Tanggal dan jam tidak terbaca. Buka rincian transaksi lalu screenshot lagi bila bisa."] }));
    m.ajukanQris.mockResolvedValue({ pembayaran_id: "p2", status: "perlu_dicek", total: 6000 });
    const u = userEvent.setup();
    render(<Bayar ctx={ctxDari(sesiSiswa)} awal="s1-w1" />);
    await waitFor(() => expect(document.querySelector(".pay-bar-total strong")?.textContent).toBe("Rp6.000"));
    await u.click(screen.getByRole("button", { name: "Lanjut bayar" }));
    await u.click(screen.getByRole("button", { name: "Sudah bayar, unggah bukti" }));
    await u.upload(document.querySelector('input[type="file"]') as HTMLInputElement, berkasGambar());
    expect(await screen.findByText(/Tanggal dan jam tidak terbaca/)).toBeTruthy();
    await u.click(screen.getByRole("button", { name: "Kirim bukti" }));
    expect(m.ajukanQris.mock.calls[0][0].waktuIso).toBeNull();
    expect(await screen.findByText(/Bendahara akan memeriksanya/)).toBeTruthy();
  });

  it("galat server (bukti kembar) ditampilkan dan tidak berpindah langkah", async () => {
    vi.mocked(ocr.bacaBukti).mockResolvedValue(bacaan());
    m.ajukanQris.mockRejectedValue(new Error("Bukti ini sudah pernah dipakai. Unggah bukti pembayaran yang baru."));
    const u = userEvent.setup();
    render(<Bayar ctx={ctxDari(sesiSiswa)} awal="s1-w1" />);
    await waitFor(() => expect(document.querySelector(".pay-bar-total strong")?.textContent).toBe("Rp6.000"));
    await u.click(screen.getByRole("button", { name: "Lanjut bayar" }));
    await u.click(screen.getByRole("button", { name: "Sudah bayar, unggah bukti" }));
    await u.upload(document.querySelector('input[type="file"]') as HTMLInputElement, berkasGambar());
    await screen.findByRole("list", { name: "Hasil pembacaan bukti" });
    await u.click(screen.getByRole("button", { name: "Kirim bukti" }));
    expect((await screen.findByText(/sudah pernah dipakai/)).textContent).toMatch(/Unggah bukti pembayaran yang baru/);
    expect(screen.getByRole("heading", { name: "Unggah bukti." })).toBeTruthy();
  });

  it("klaim yang menunggu bisa dibatalkan", async () => {
    m.batalkanKlaimSaya.mockResolvedValue();
    const dengan: Ringkasan[] = [{ ...ringkasan[0], status: "lunas_sementara", pembayaran_id: "p9", total: 5000 }, ringkasan[1]];
    const ctx = ctxDari(sesiSiswa, { ringkasan: dengan });
    const u = userEvent.setup();
    render(<Bayar ctx={ctx} awal="s1-w2" />);
    await u.click(await screen.findByRole("button", { name: "Batalkan" }));
    await waitFor(() => expect(m.batalkanKlaimSaya).toHaveBeenCalledWith("p9"));
  });

  it("bendahara diarahkan ke Meja bendahara", () => {
    render(<Bayar ctx={ctxDari(sesiBendahara)} />);
    expect(screen.getByText(/tidak membayar lewat sini/)).toBeTruthy();
  });
});

// ---------- Meja bendahara ----------
const klaim: KlaimAntrean = {
  id: "k1", siswa_id: "s2", nominal_bukti: 5000, waktu_bayar: "2026-10-22T03:00:00Z", status: "perlu_dicek", dibuat_pada: "2026-10-22T03:05:00Z",
  hasil_ocr: { ragu: ["Penerima tidak terbaca atau bukan QRIS kelas."] },
  alokasi_pembayaran: [{ jumlah_pokok: 5000, jumlah_denda: 0, tagihan: { minggu: { mulai: "2026-10-19", akhir: "2026-10-25" } } }],
};

describe("Meja bendahara", () => {
  beforeEach(() => {
    m.muatAntrean.mockResolvedValue([klaim]);
    m.muatGopayRingkas.mockResolvedValue([
      { no_transaksi: "T1", waktu_dibuat: "2026-10-20T03:00:00Z", nominal: 5000, pembayaran_id: "p1" },
      { no_transaksi: "T2", waktu_dibuat: "2026-10-21T03:00:00Z", nominal: 10000, pembayaran_id: null },
    ]);
    m.muatKlaimMenunggu.mockResolvedValue([{ nominal_bukti: 5000 }]);
    m.muatPengingat.mockResolvedValue([]);
    m.muatNoWa.mockResolvedValue([{ id: "s1", no_wa: "081234567890" }]);
  });

  it("menampilkan antrean dengan tanda jumlah, lalu menerima bukti", async () => {
    m.putuskanKlaim.mockResolvedValue();
    const ctx = ctxDari(sesiBendahara);
    const u = userEvent.setup();
    render(<MejaBendahara ctx={ctx} />);
    expect(await screen.findByText("Muhammad Qiyas Ilyasa'")).toBeTruthy();
    expect(screen.getByText(/Penerima tidak terbaca/)).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Antrean/ }).textContent).toMatch(/1/);
    await u.click(screen.getByRole("button", { name: "Terima" }));
    await waitFor(() => expect(m.putuskanKlaim).toHaveBeenCalledWith({ id: "k1", terima: true }));
    expect(ctx.muat).toHaveBeenCalled();
  });

  it("menolak bukti hanya dengan alasan", async () => {
    m.putuskanKlaim.mockResolvedValue();
    const u = userEvent.setup();
    render(<MejaBendahara ctx={ctxDari(sesiBendahara)} />);
    await u.click(await screen.findByRole("button", { name: "Tolak" }));
    const dialog = screen.getByRole("alertdialog");
    const tombol = within(dialog).getByRole("button", { name: "Tolak bukti" }) as HTMLButtonElement;
    expect(tombol.disabled).toBe(true);
    await u.type(within(dialog).getByLabelText("Alasan"), "tidak ada di laporan");
    await u.click(tombol);
    await waitFor(() => expect(m.putuskanKlaim).toHaveBeenCalledWith({ id: "k1", terima: false, alasan: "tidak ada di laporan" }));
  });

  it("mencocokkan klaim dengan transaksi GoPay bernominal sama", async () => {
    m.putuskanKlaim.mockResolvedValue();
    const u = userEvent.setup();
    render(<MejaBendahara ctx={ctxDari(sesiBendahara, { tanpaPemilik: [{ no_transaksi: "T9", waktu_dibuat: "2026-10-22T03:00:05Z", nominal: 5000 }, { no_transaksi: "T8", waktu_dibuat: "2026-10-22T04:00:05Z", nominal: 10000 }] })} />);
    const pilih = await screen.findByLabelText("Cocokkan dengan transaksi GoPay");
    expect(within(pilih).getAllByRole("option")).toHaveLength(2); // placeholder + hanya yang Rp5.000
    await u.selectOptions(pilih, "T9");
    await waitFor(() => expect(m.putuskanKlaim).toHaveBeenCalledWith({ id: "k1", terima: true, noTransaksi: "T9" }));
  });

  it("mencatat pembayaran dengan waktu WIB", async () => {
    m.catatPembayaran.mockResolvedValue();
    const ctx = ctxDari(sesiBendahara);
    const u = userEvent.setup();
    render(<MejaBendahara ctx={ctx} />);
    await u.click(screen.getByRole("tab", { name: "Catat" }));
    await u.selectOptions(screen.getAllByLabelText("Siswa")[0], "061");
    await u.clear(screen.getByLabelText("Jumlah minggu")); await u.type(screen.getByLabelText("Jumlah minggu"), "2");
    await u.click(screen.getByRole("button", { name: "Catat pembayaran" }));
    await waitFor(() => expect(m.catatPembayaran).toHaveBeenCalled());
    const arg = m.catatPembayaran.mock.calls[0][0];
    expect(arg).toMatchObject({ nrp: "061", metode: "cash", jumlahMinggu: 2 });
    expect(arg.waktuIso).toBe("2026-10-23T10:00:00+07:00");
    expect(vi.mocked(ctx.notify)).toHaveBeenCalledWith("Pembayaran dicatat.");
  });

  it("impor laporan GoPay: baca CSV, tampilkan jumlah, impor, dan tampilkan hasil", async () => {
    m.imporGopay.mockResolvedValue({ baru: 2, dicocokkan: 1, tanpa_pemilik: 1, mencurigakan: 0 });
    const csv = "Transaksi Dibuat,Status,No. Transaksi,No. Ref,Harga,Merchant ID\n19 Oct 2026 - 13:12:01,SUKSES,N1,R1,15000,G975190623\n12 Oct 2026 - 08:08:31,SUKSES,N2,R2,10000,G975190623\n";
    const berkas = new File([csv], "laporan.csv", { type: "text/csv" });
    Object.defineProperty(berkas, "text", { value: () => Promise.resolve(csv) });
    const u = userEvent.setup();
    render(<MejaBendahara ctx={ctxDari(sesiBendahara)} />);
    await u.click(screen.getByRole("tab", { name: "Laporan QRIS" }));
    await u.upload(document.querySelector('input[type="file"]') as HTMLInputElement, berkas);
    expect(await screen.findByText("2 transaksi terbaca.")).toBeTruthy();
    await u.click(screen.getByRole("button", { name: "Impor dan cocokkan" }));
    await waitFor(() => expect(m.imporGopay).toHaveBeenCalled());
    const kirim = m.imporGopay.mock.calls[0][0] as { no_transaksi: string; waktu_dibuat: string; nominal: number }[];
    expect(kirim.map((b) => [b.no_transaksi, b.waktu_dibuat, b.nominal])).toEqual([["N1", "2026-10-19T13:12:01+07:00", 15000], ["N2", "2026-10-12T08:08:31+07:00", 10000]]);
    expect((await screen.findByRole("status")).textContent).toBe("Baru 2, dicocokkan 1, tanpa pemilik 1, mencurigakan 0.");
  });

  it("rekonsiliasi menunjukkan selisih, dan uang tanpa pemilik bisa ditetapkan", async () => {
    m.tetapkanPemilik.mockResolvedValue();
    const u = userEvent.setup();
    render(<MejaBendahara ctx={ctxDari(sesiBendahara, { tanpaPemilik: [{ no_transaksi: "T2", waktu_dibuat: "2026-10-21T03:00:00Z", nominal: 10000 }] })} />);
    await u.click(screen.getByRole("tab", { name: "Laporan QRIS" }));
    await waitFor(() => expect(document.querySelector(".recon-grid")).toBeTruthy());
    const grid = document.querySelector(".recon-grid")!;
    expect(grid.textContent).toMatch(/Rp15\.000/);  // total laporan
    expect(grid.textContent).toMatch(/Rp5\.000/);   // sudah dikaitkan dan klaim
    expect(grid.textContent).toMatch(/Rp10\.000/);  // tanpa pemilik
    await u.selectOptions(screen.getByLabelText(/Pemilik transaksi/), "062");
    await u.click(screen.getByRole("button", { name: "Tetapkan" }));
    await waitFor(() => expect(m.tetapkanPemilik).toHaveBeenCalledWith("T2", "062"));
  });

  it("pengingat: membuka WhatsApp, mencatat, dan menampilkan status sudah diingatkan", async () => {
    m.catatPengingat.mockResolvedValue();
    const buka = vi.spyOn(window, "open").mockReturnValue(null);
    const u = userEvent.setup();
    render(<MejaBendahara ctx={ctxDari(sesiBendahara)} />);
    await u.click(screen.getByRole("tab", { name: "Pengingat" }));
    expect(await screen.findByText("Belum diingatkan.")).toBeTruthy();
    await u.click(screen.getByRole("button", { name: "Ingatkan" }));
    expect(buka).toHaveBeenCalledTimes(1);
    const url = String(buka.mock.calls[0][0]);
    expect(url).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
    expect(decodeURIComponent(url)).toMatch(/Hirohito I\., kas kelas minggu ini Rp5\.000 belum tercatat/);
    await waitFor(() => expect(m.catatPengingat).toHaveBeenCalledWith({ siswaId: "s1", tagihanId: "s1-w2", tahap: "tagihan_baru", status: "dibuka" }));
    buka.mockRestore();
  });

  it("mematikan denda hanya setelah konfirmasi, dan membatalkan pembayaran hanya dengan alasan", async () => {
    m.setDendaAktif.mockResolvedValue();
    m.batalkanPembayaran.mockResolvedValue();
    const u = userEvent.setup();
    render(<MejaBendahara ctx={ctxDari(sesiBendahara, { pembayaran: [{ id: "p1", siswa_id: "s1", metode: "cash", nominal_bukti: 5000, waktu_bayar: "2026-10-20T03:00:00Z", status: "terkonfirmasi", dibuat_pada: "2026-10-20T03:00:00Z" }] })} />);
    await u.click(screen.getByRole("tab", { name: "Atur" }));
    await u.click(screen.getByRole("switch", { name: "Kebijakan denda" }));
    let dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("heading", { name: "Nonaktifkan denda?" })).toBeTruthy();
    expect(m.setDendaAktif).not.toHaveBeenCalled();
    await u.click(within(dialog).getByRole("button", { name: "Nonaktifkan denda" }));
    await waitFor(() => expect(m.setDendaAktif).toHaveBeenCalledWith(false));

    await u.click(screen.getByRole("button", { name: "Batalkan" }));
    dialog = screen.getByRole("alertdialog");
    const tombol = within(dialog).getByRole("button", { name: "Batalkan pembayaran" }) as HTMLButtonElement;
    expect(tombol.disabled).toBe(true);
    await u.type(within(dialog).getByLabelText("Alasan"), "salah catat");
    await u.click(tombol);
    await waitFor(() => expect(m.batalkanPembayaran).toHaveBeenCalledWith("p1", "salah catat"));
  });
});
