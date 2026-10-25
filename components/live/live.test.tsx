// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PapanRow, Ringkasan } from "@/lib/papan";
import type { Sesi } from "@/lib/api";
import type { DataKelas } from "./useKelas";
import type { Ctx } from "./tipe";

vi.mock("@/lib/api", async () => {
  const asli = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...asli,
    ambilDaftarNama: vi.fn(), masukSiswa: vi.fn(), masukBendahara: vi.fn(), gantiPin: vi.fn(), hitungTotal: vi.fn(),
    catatPembayaran: vi.fn(), setDendaAktif: vi.fn(), bebaskanDenda: vi.fn(), aturLibur: vi.fn(), batalkanPembayaran: vi.fn(), tambahPengeluaran: vi.fn(),
  };
});

import * as api from "@/lib/api";
import Bayar from "./Bayar";
import Beranda from "./Beranda";
import GantiPin from "./GantiPin";
import Masuk from "./Masuk";
import MejaBendahara from "./MejaBendahara";

const m = vi.mocked(api);
const kini = new Date("2026-10-23T10:00:00+07:00");

beforeEach(() => { window.localStorage.clear(); vi.clearAllMocks(); });
afterEach(cleanup);

describe("Masuk siswa", () => {
  it("kode kelas, cari nama, PIN, lalu masuk dan mengingat perangkat", async () => {
    m.ambilDaftarNama.mockResolvedValue([{ nrp: "061", nama: "Hirohito Ischihara" }, { nrp: "076", nama: "Muhammad Qiyas Ilyasa'" }]);
    m.masukSiswa.mockResolvedValue();
    const onMasuk = vi.fn().mockResolvedValue(undefined);
    const u = userEvent.setup();
    render(<Masuk onMasuk={onMasuk} />);

    await u.type(screen.getByLabelText("Kode kelas"), "meja-biru-47");
    await u.click(screen.getByRole("button", { name: "Lihat daftar nama" }));
    expect(m.ambilDaftarNama).toHaveBeenCalledWith("meja-biru-47");

    await u.type(await screen.findByLabelText("Cari namamu"), "qiyas");
    expect(screen.queryByText("Hirohito Ischihara")).toBeNull();
    await u.click(screen.getByRole("button", { name: /Qiyas/ }));

    expect(screen.getByText(/Masuk sebagai/)).toBeTruthy();
    await u.type(screen.getByLabelText("PIN enam digit"), "739204");
    await u.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(onMasuk).toHaveBeenCalled());
    expect(m.masukSiswa).toHaveBeenCalledWith("076", "739204");
    expect(JSON.parse(window.localStorage.getItem("kaskelas-perangkat")!)).toEqual({ nrp: "076", nama: "Muhammad Qiyas Ilyasa'" });

    cleanup();
    render(<Masuk onMasuk={onMasuk} />); // perangkat mengingat: langsung ke PIN
    expect(await screen.findByLabelText("PIN enam digit")).toBeTruthy();
    await u.click(screen.getByRole("button", { name: /Ganti nama/ }));
    expect(screen.getByLabelText("Kode kelas")).toBeTruthy();
    expect(window.localStorage.getItem("kaskelas-perangkat")).toBeNull();
  });

  it("menampilkan galat kode salah dan galat PIN salah", async () => {
    m.ambilDaftarNama.mockRejectedValue(new Error("Kode kelas salah."));
    const u = userEvent.setup();
    render(<Masuk onMasuk={vi.fn()} />);
    await u.type(screen.getByLabelText("Kode kelas"), "salah-salah");
    await u.click(screen.getByRole("button", { name: "Lihat daftar nama" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Kode kelas salah.");

    window.localStorage.setItem("kaskelas-perangkat", JSON.stringify({ nrp: "061", nama: "Hirohito" }));
    cleanup();
    m.masukSiswa.mockRejectedValue(new Error("NRP atau PIN salah."));
    const onMasuk = vi.fn();
    render(<Masuk onMasuk={onMasuk} />);
    await u.type(await screen.findByLabelText("PIN enam digit"), "111222");
    await u.click(screen.getByRole("button", { name: "Masuk" }));
    expect((await screen.findByRole("alert")).textContent).toBe("NRP atau PIN salah.");
    expect(onMasuk).not.toHaveBeenCalled();
  });

  it("bendahara masuk dengan email dan kata sandi", async () => {
    m.masukBendahara.mockResolvedValue();
    const onMasuk = vi.fn().mockResolvedValue(undefined);
    const u = userEvent.setup();
    render(<Masuk onMasuk={onMasuk} />);
    await u.click(screen.getByRole("button", { name: "Masuk di sini" }));
    await u.type(screen.getByLabelText("Email bendahara"), "bendahara@contoh.id");
    await u.type(screen.getByLabelText("Kata sandi"), "sandi-yang-panjang-1");
    await u.click(screen.getByRole("button", { name: "Masuk sebagai bendahara" }));
    await waitFor(() => expect(onMasuk).toHaveBeenCalled());
    expect(m.masukBendahara).toHaveBeenCalledWith("bendahara@contoh.id", "sandi-yang-panjang-1");
  });
});

describe("Ganti PIN", () => {
  it("menolak PIN lemah dan menyimpan PIN yang baik", async () => {
    m.gantiPin.mockResolvedValue();
    const selesai = vi.fn().mockResolvedValue(undefined);
    const u = userEvent.setup();
    render(<GantiPin nrp="061" wajib onSelesai={selesai} onBatal={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Batal" })).toBeNull(); // wajib: tidak bisa dilewati
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
  baris("s1", 1, "061", "Hirohito Ischihara", "w1", "2026-10-12", "2026-10-18", "2026-10-18T16:59:59Z", "belum"),
  baris("s1", 1, "061", "Hirohito Ischihara", "w2", "2026-10-19", "2026-10-25", "2026-10-25T16:59:59Z", "belum"),
  baris("s2", 2, "062", "Arkan Bentariva", "w1", "2026-10-12", "2026-10-18", "2026-10-18T16:59:59Z", "terkonfirmasi"),
  baris("s2", 2, "062", "Arkan Bentariva", "w2", "2026-10-19", "2026-10-25", "2026-10-25T16:59:59Z", "terkonfirmasi"),
];
const ringkasan: Ringkasan[] = [
  { tagihan_id: "s1-w1", minggu_id: "w1", mulai: "2026-10-12", akhir: "2026-10-18", jatuh_tempo: "2026-10-18T16:59:59Z", status: "belum", pokok: 5000, denda: 1000, total: 6000, denda_dibebaskan: false },
  { tagihan_id: "s1-w2", minggu_id: "w2", mulai: "2026-10-19", akhir: "2026-10-25", jatuh_tempo: "2026-10-25T16:59:59Z", status: "belum", pokok: 5000, denda: 0, total: 5000, denda_dibebaskan: false },
];
const kelasData = (o: Partial<DataKelas> = {}): DataKelas => ({
  status: "siap", pesan: "", diperbarui: kini, papan, ringkasan, saldo: { pemasukan_kas: 10000, pemasukan_denda: 0, pengeluaran: 2000, saldo: 8000 },
  konfigurasi: { nominal_mingguan: 5000, denda_aktif: true, denda_berlaku_mulai: null }, pengeluaran: [], pembayaran: [], tanpaPemilik: [], ...o,
});
const ctxDari = (sesi: Sesi, o: Partial<DataKelas> = {}): Ctx => ({
  sesi, kelas: kelasData(o), muat: vi.fn<() => Promise<void>>().mockResolvedValue(undefined), sekarang: kini,
  notify: vi.fn<(pesan: string) => void>(), go: vi.fn<Ctx["go"]>(), bunyi: false,
});

describe("Beranda siswa", () => {
  it("menampilkan karcis minggu ini, tunggakan dari server, dan saldo", async () => {
    const bukaBayar = vi.fn();
    const u = userEvent.setup();
    render(<Beranda ctx={ctxDari(sesiSiswa)} bukaBayar={bukaBayar} />);
    expect(screen.getByRole("heading", { name: "Halo, Hirohito." })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Rp5.000" })).toBeTruthy();       // minggu ini dari ringkasan_saya
    expect(screen.getByText("Telat. Denda Rp1.000.")).toBeTruthy();              // tunggakan memakai angka denda server
    expect(screen.getByText("Rp8.000")).toBeTruthy();                            // saldo
    expect(screen.getByText(/1 dari 2 sudah bayar minggu ini|0 dari 2 sudah bayar minggu ini/)).toBeTruthy();
    await u.click(screen.getByRole("button", { name: "Bayar Rp5.000" }));
    expect(bukaBayar).toHaveBeenCalledWith("s1-w2");
  });
});

describe("Bayar", () => {
  it("menghitung total di server setiap pilihan berubah, lalu menampilkan QRIS", async () => {
    m.hitungTotal.mockImplementation(async (ids) => ({ jumlah: ids.length, pokok: ids.length * 5000, denda: ids.includes("s1-w1") ? 1000 : 0, total: ids.length * 5000 + (ids.includes("s1-w1") ? 1000 : 0) }));
    const ctx = ctxDari(sesiSiswa);
    const u = userEvent.setup();
    render(<Bayar ctx={ctx} awal="s1-w2" />);
    await waitFor(() => expect(screen.getByText("Rp5.000", { selector: "strong" })).toBeTruthy());
    expect(m.hitungTotal).toHaveBeenLastCalledWith(["s1-w2"]);

    await u.click(screen.getByRole("button", { name: /Pilih minggu 2026-10-12/ }));
    await waitFor(() => expect(m.hitungTotal).toHaveBeenLastCalledWith(["s1-w2", "s1-w1"]));
    await waitFor(() => expect(screen.getByText("Rp11.000", { selector: ".pay-total strong" })).toBeTruthy());

    await u.click(screen.getByRole("button", { name: "Lanjut ke QRIS" }));
    expect(screen.getByRole("heading", { name: "Rp11.000" })).toBeTruthy();
    expect(screen.getByAltText("QRIS kas kelas")).toBeTruthy();
    await u.click(screen.getByRole("button", { name: "Saya sudah bayar" }));
    expect(screen.getByText(/belum tercatat otomatis/)).toBeTruthy();
  });
  it("menampilkan galat dari server dan tidak mengaktifkan tombol", async () => {
    m.hitungTotal.mockRejectedValue(new Error("Tagihan tidak valid atau sudah lunas"));
    render(<Bayar ctx={ctxDari(sesiSiswa)} awal="s1-w2" />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/tidak valid/);
    expect((screen.getByRole("button", { name: "Lanjut ke QRIS" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("bendahara diarahkan ke Meja bendahara", () => {
    render(<Bayar ctx={ctxDari(sesiBendahara)} />);
    expect(screen.getByText(/tidak membayar lewat sini/)).toBeTruthy();
  });
});

describe("Meja bendahara", () => {
  it("mencatat pembayaran dengan waktu WIB dan memuat ulang data", async () => {
    m.catatPembayaran.mockResolvedValue();
    const ctx = ctxDari(sesiBendahara);
    const u = userEvent.setup();
    render(<MejaBendahara ctx={ctx} />);
    await u.selectOptions(screen.getAllByLabelText("Siswa")[0], "061");
    await u.clear(screen.getByLabelText("Jumlah minggu")); await u.type(screen.getByLabelText("Jumlah minggu"), "2");
    await u.click(screen.getByRole("button", { name: "Catat pembayaran" }));
    await waitFor(() => expect(m.catatPembayaran).toHaveBeenCalled());
    const arg = m.catatPembayaran.mock.calls[0][0];
    expect(arg).toMatchObject({ nrp: "061", metode: "cash", jumlahMinggu: 2 });
    expect(arg.waktuIso).toMatch(/^2026-10-23T10:00:00\+07:00$/);
    await waitFor(() => expect(ctx.muat).toHaveBeenCalled());
    expect(vi.mocked(ctx.notify)).toHaveBeenCalledWith("Pembayaran dicatat.");
  });
  it("mematikan denda hanya setelah konfirmasi", async () => {
    m.setDendaAktif.mockResolvedValue();
    const u = userEvent.setup();
    render(<MejaBendahara ctx={ctxDari(sesiBendahara)} />);
    await u.click(screen.getByRole("switch", { name: "Kebijakan denda" }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("heading", { name: "Nonaktifkan denda?" })).toBeTruthy();
    expect(m.setDendaAktif).not.toHaveBeenCalled();
    await u.click(within(dialog).getByRole("button", { name: "Nonaktifkan denda" }));
    await waitFor(() => expect(m.setDendaAktif).toHaveBeenCalledWith(false));
  });
  it("membatalkan pembayaran hanya dengan alasan", async () => {
    m.batalkanPembayaran.mockResolvedValue();
    const u = userEvent.setup();
    render(<MejaBendahara ctx={ctxDari(sesiBendahara, { pembayaran: [{ id: "p1", siswa_id: "s1", metode: "cash", nominal_bukti: 5000, waktu_bayar: "2026-10-20T03:00:00Z", status: "terkonfirmasi", dibuat_pada: "2026-10-20T03:00:00Z" }] })} />);
    await u.click(screen.getByRole("button", { name: "Batalkan" }));
    const dialog = screen.getByRole("alertdialog");
    const tombol = within(dialog).getByRole("button", { name: "Batalkan pembayaran" }) as HTMLButtonElement;
    expect(tombol.disabled).toBe(true);
    await u.type(within(dialog).getByLabelText("Alasan"), "salah catat");
    await u.click(tombol);
    await waitFor(() => expect(m.batalkanPembayaran).toHaveBeenCalledWith("p1", "salah catat"));
  });
});
