import { describe, expect, it } from "vitest";
import fixtures from "./ocr-fixtures.json";
import { bacaTeks, cariNominal, cariRef, cariWaktu, tingkatkanKontras } from "./ocr";

type Fix = { asli: string; ditingkatkan: string };
const F = fixtures as Record<string, Fix>;
const KODE = "975190623";
const NAMA = "NAMA MERCHANT";

// Meniru bacaBukti: lintasan kedua (kontras dinaikkan) hanya dipakai bila ada yang belum terbaca.
function alur(f: Fix, kode = KODE, nama: string | null = null) {
  const pertama = bacaTeks(f.asli, kode, nama);
  if (pertama.waktuIso && pertama.merchantCocok && pertama.nominal) return pertama;
  return bacaTeks(f.asli + "\n" + f.ditingkatkan, kode, nama);
}

describe("bukti nyata dari 5 aplikasi (hasil OCR sebenarnya, data pribadi disamarkan)", () => {
  it("bank A: semua terbaca", () => {
    const h = alur(F.bri);
    expect(h).toMatchObject({ sukses: true, nominal: 15000, waktuIso: "2026-10-19T13:12:00+07:00", merchantCocok: true, refId: "234750394461" });
    expect(h.ragu).toEqual([]);
  });
  it("dompet A: tanggal abu terang terbaca setelah kontras dinaikkan", () => {
    expect(bacaTeks(F.dompet_a.asli, KODE).waktuIso).toBeNull(); // tanpa lintasan kedua, tanggal hilang
    const h = alur(F.dompet_a);
    expect(h).toMatchObject({ sukses: true, nominal: 10000, waktuIso: "2026-10-12T13:25:47+07:00", merchantCocok: true });
  });
  it("dompet B: tanggal dan PAN terbaca setelah kontras dinaikkan", () => {
    const h = alur(F.dompet_b);
    expect(h).toMatchObject({ sukses: true, nominal: 10000, waktuIso: "2026-10-12T08:08:23+07:00", merchantCocok: true });
  });
  it("GoPay: tanpa tanggal, penerima dikenali lewat nama bila nama diatur", () => {
    const tanpaNama = alur(F.gopay);
    expect(tanpaNama).toMatchObject({ sukses: true, nominal: 5000, waktuIso: null, merchantCocok: false });
    expect(tanpaNama.ragu.join(" ")).toMatch(/Tanggal dan jam tidak terbaca/);
    const denganNama = alur(F.gopay, KODE, NAMA);
    expect(denganNama).toMatchObject({ nominal: 5000, waktuIso: null, merchantCocok: true });
  });
  it("bank B: RRN dan Ref terbaca, Ref terpanjang dipilih", () => {
    const h = alur(F.bca);
    expect(h).toMatchObject({ sukses: true, nominal: 10000, waktuIso: "2026-10-17T06:08:47+07:00", merchantCocok: true });
    expect(h.refId).toBe("9503120261017060847");
  });
  it("merchant lain ditolak", () => {
    expect(alur(F.bri, "123456789").merchantCocok).toBe(false);
  });
});

describe("pembaca tanggal", () => {
  it.each([
    ["19 Oct 2026, 13:12:00 WIB", "2026-10-19T13:12:00+07:00"],
    ["12 Okt 2026 - 13:25:47", "2026-10-12T13:25:47+07:00"],
    ["12 Okt 2026 • 08:08:23 WIB", "2026-10-12T08:08:23+07:00"],
    ["17/10/2026 - 06:08:47 WIB", "2026-10-17T06:08:47+07:00"],
    ["3 Agustus 2026 09.05", "2026-08-03T09:05:00+07:00"],
    ["28 Sep 2026, 15:47 WITA", "2026-09-28T15:47:00+08:00"],
  ])("%s", (teks, iso) => expect(cariWaktu(teks)).toBe(iso));
  it("menolak tanggal tidak mungkin dan bulan tidak dikenal", () => {
    expect(cariWaktu("31 Feb 2026 10:00:00")).toBeNull();
    expect(cariWaktu("12 Xyz 2026 10:00:00")).toBeNull();
    expect(cariWaktu("jam status 8:08 di pojok")).toBeNull();
  });
});

describe("pembaca nominal dan referensi", () => {
  it("memahami format rupiah umum", () => {
    expect(cariNominal("Rp15.000").nominal).toBe(15000);
    expect(cariNominal("Nominal Rp 10.000,00").nominal).toBe(10000);
    expect(cariNominal("Rp5.000").nominal).toBe(5000);
    expect(cariNominal("Rp1.250.000,00").nominal).toBe(1250000);
  });
  it("menandai bila ada beberapa nominal berbeda", () => {
    const h = bacaTeks("Transaksi Berhasil\nRp5.000\nBiaya Rp1.000\n975190623 12 Okt 2026 10:00:00", KODE);
    expect(h.nominal).toBe(5000);
    expect(h.ragu.join(" ")).toMatch(/lebih dari satu nominal/);
  });
  it("menolak transaksi gagal", () => {
    const h = bacaTeks("Transaksi Gagal\nRp5.000\n975190623 12 Okt 2026 10:00:00", KODE);
    expect(h.sukses).toBe(false);
  });
  it("referensi hanya dari label yang dikenal", () => {
    expect(cariRef("No. Ref 234750394461")).toBe("234750394461");
    expect(cariRef("RRN 306582181")).toBe("306582181");
    expect(cariRef("Rp5.000 tanpa label 1234567890")).toBeNull();
  });
});

describe("peningkat kontras", () => {
  it("menggelapkan abu terang dan mempertahankan putih dan hitam", () => {
    const rgba = new Uint8ClampedArray([255, 255, 255, 255, 154, 160, 181, 255, 20, 20, 20, 255]);
    const o = tingkatkanKontras(rgba);
    expect(o[0]).toBeGreaterThan(245);   // putih tetap putih
    expect(o[4]).toBeLessThan(40);       // abu terang jadi gelap
    expect(o[8]).toBeLessThan(5);        // hitam tetap hitam
    expect(o[3]).toBe(255);
  });
});
