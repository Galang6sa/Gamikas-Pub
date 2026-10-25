"use client";

import { useMemo } from "react";
import { rupiah, susunMatriks } from "@/lib/papan";
import type { Ctx } from "./tipe";

type Baris = { kunci: string; tanggal: string; masuk: boolean; judul: string; ket: string; nominal: number };

const STATUS: Record<string, string> = {
  terkonfirmasi: "Terkonfirmasi.",
  lunas_sementara: "Lunas sementara, menunggu konfirmasi.",
  perlu_dicek: "Menunggu cek bendahara.",
};

export default function Kas({ ctx }: { ctx: Ctx }) {
  const { kelas, sekarang } = ctx;
  const nama = useMemo(() => new Map(susunMatriks(kelas.papan).siswa.map((s) => [s.id, s.nama])), [kelas.papan]);

  const baris: Baris[] = useMemo(() => {
    const masuk = kelas.pembayaran.map((p) => ({
      kunci: `p-${p.id}`,
      tanggal: (p.waktu_bayar ?? p.dibuat_pada).slice(0, 10),
      masuk: true,
      judul: `Pembayaran ${p.metode === "cash" ? "tunai" : "QRIS"} ${nama.get(p.siswa_id) ?? ""}`.trim(),
      ket: STATUS[p.status] ?? p.status,
      nominal: p.nominal_bukti,
    }));
    const keluar = kelas.pengeluaran.map((x) => ({
      kunci: `k-${x.id}`, tanggal: x.tanggal, masuk: false, judul: x.keterangan || x.kategori, ket: x.kategori, nominal: x.nominal,
    }));
    return [...masuk, ...keluar].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [kelas.pembayaran, kelas.pengeluaran, nama]);

  const bulanDari = (t: string) => new Date(`${t.slice(0, 7)}-01T12:00:00+07:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
  const dibatasi = kelas.pembayaran.length >= 100 || kelas.pengeluaran.length >= 100;

  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Catatan terbuka untuk kelas</p>
        <h1>Kas kelas.</h1>
        <p>Pemasukan dan pengeluaran yang tercatat.</p>
      </div>
      <section className="ledger-balance">
        <span>Saldo kas</span>
        <strong>{rupiah(kelas.saldo?.saldo ?? 0)}</strong>
        <p>Kas {rupiah(kelas.saldo?.pemasukan_kas ?? 0)}, denda {rupiah(kelas.saldo?.pemasukan_denda ?? 0)}, pengeluaran {rupiah(kelas.saldo?.pengeluaran ?? 0)}. Per {sekarang.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })}.</p>
      </section>
      <section className="paper ledger-section">
        <h2>Riwayat transaksi</h2>
        {baris.length === 0 && <p className="empty-message">Belum ada catatan.</p>}
        {baris.map((b, i) => (
          <div key={b.kunci}>
            {(i === 0 || bulanDari(baris[i - 1].tanggal) !== bulanDari(b.tanggal)) && <div className="ledger-date">{bulanDari(b.tanggal)}</div>}
            <div className="ledger-row">
              <span className={`ledger-mark ${b.masuk ? "income-mark" : "expense-mark"}`}>{b.masuk ? "Masuk" : "Keluar"}</span>
              <div><strong>{b.judul}</strong><small>{b.ket} {new Date(`${b.tanggal}T12:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" })}.</small></div>
              <b>{b.masuk ? "+" : "-"} {rupiah(b.nominal)}</b>
            </div>
          </div>
        ))}
        {dibatasi && <p className="board-hint">Menampilkan catatan terbaru saja.</p>}
      </section>
    </>
  );
}
