import { describe, expect, it } from "vitest";
import { bacaLaporanGopay, parseCsv } from "./gopay";
import { namaSingkat } from "./nama";

const KEPALA = "Tipe Pembayaran,Transaksi Dibuat,Status Diperbarui,Status,No. Transaksi,No. Ref,Harga,MDR,Pendapatan Bersih,Toko,Merchant ID,Catatan";

describe("laporan GoPay", () => {
  it("membaca baris nyata, memakai Transaksi Dibuat (WIB), dan melewati baris rusak", () => {
    const csv = [
      "\uFEFF" + KEPALA,
      'QRIS,19 Oct 2026 - 13:12:01,19 Oct 2026 - 06:12:08,SUKSES,0120261019061201AbCd,AbCdID,15000,0,15000,"Toko, Contoh",G975190623,',
      "QRIS,07 Sep 2026 - 08:34:59,07 Sep 2026 - 01:35:05,SUKSES,0320260907013459pgJMgy9M20ID,9M20ID,5000.0,0,5000,Toko,G975190623,",
      "QRIS,tanggal rusak,x,SUKSES,NO3,R3,5000,0,5000,Toko,G975190623,",
      "QRIS,12 Oct 2026 - 10:00:00,x,GAGAL,NO4,R4,5000,0,5000,Toko,G975190623,",
      "QRIS,12 Oct 2026 - 10:00:00,x,SUKSES,NO5,R5,0,0,0,Toko,G975190623,",
    ].join("\r\n");
    const h = bacaLaporanGopay(csv);
    expect(h.galat).toBeNull();
    expect(h.dilewati).toBe(2); // tanggal rusak dan nominal nol
    expect(h.baris.map((b) => [b.no_transaksi, b.waktu_dibuat, b.nominal, b.status])).toEqual([
      ["0120261019061201AbCd", "2026-10-19T13:12:01+07:00", 15000, "SUKSES"],
      ["0320260907013459pgJMgy9M20ID", "2026-09-07T08:34:59+07:00", 5000, "SUKSES"],
      ["NO4", "2026-10-12T10:00:00+07:00", 5000, "GAGAL"], // status disaring di server
    ]);
    expect(h.baris[0].merchant_id).toBe("G975190623");
  });
  it("menolak berkas yang bukan laporan GoPay", () => {
    expect(bacaLaporanGopay("a,b\n1,2").galat).toMatch(/Kolom tidak ditemukan/);
    expect(bacaLaporanGopay("").galat).toMatch(/kosong/);
  });
  it("parseCsv menangani kutip, koma, dan baris baru di dalam kutipan", () => {
    expect(parseCsv('a,"b,c","d\ne",""""\n1,2,3')).toEqual([["a", "b,c", "d\ne", '"'], ["1", "2", "3"]]);
  });
});

describe("nama singkat", () => {
  it("membedakan nama depan yang sama dan melewati Muhammad", () => {
    const daftar = ["Amara Oktavia Putri", "Amara Putri Pratama", "Muhammad Ilham Gunawan", "Muhammad Qiyas Ilyasa'", "Mochammad Arsa Billa", "Setiyo Anggara", "Lula"];
    expect(daftar.map(namaSingkat)).toEqual(["Amara O.", "Amara P.", "Ilham G.", "Qiyas I.", "Arsa B.", "Setiyo A.", "Lula"]);
    expect(new Set(daftar.map(namaSingkat)).size).toBe(daftar.length);
  });
});
