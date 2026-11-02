"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { imporGopay, muatGopayRingkas, muatKlaimMenunggu, tetapkanPemilik, type GopayRingkas } from "@/lib/api";
import { bacaLaporanGopay, type BarisGopay } from "@/lib/gopay";
import { Button } from "@/components/ui";
import { hariJam, rupiah, susunMatriks } from "@/lib/papan";
import type { Ctx } from "../tipe";
import { useAksi } from "./aksi";

type Rekon = { laporan: number; terkait: number; menunggu: number };

export default function Laporan({ ctx }: { ctx: Ctx }) {
  const m = useMemo(() => susunMatriks(ctx.kelas.papan), [ctx.kelas.papan]);
  const [rekon, setRekon] = useState<Rekon | null>(null);
  const muatRekon = useCallback(async () => {
    const [gp, klaim] = await Promise.all([muatGopayRingkas(), muatKlaimMenunggu()]);
    const jumlah = (xs: GopayRingkas[]) => xs.reduce((n, x) => n + x.nominal, 0);
    setRekon({ laporan: jumlah(gp), terkait: jumlah(gp.filter((x) => x.pembayaran_id)), menunggu: klaim.reduce((n, x) => n + x.nominal_bukti, 0) });
  }, []);
  useEffect(() => { void muatRekon().catch(() => setRekon(null)); }, [muatRekon]);

  const { galat, sibuk, lakukan } = useAksi(ctx, muatRekon);
  const [baris, setBaris] = useState<BarisGopay[] | null>(null);
  const [infoBerkas, setInfoBerkas] = useState("");
  const [galatBerkas, setGalatBerkas] = useState("");
  const [ringkasan, setRingkasan] = useState("");
  const [pilihan, setPilihan] = useState<Record<string, string>>({});
  const [semua, setSemua] = useState(false);

  async function bacaBerkas(f: File | undefined) {
    if (!f) return;
    setRingkasan("");
    setGalatBerkas("");
    const h = bacaLaporanGopay(await f.text());
    if (h.galat) { setBaris(null); setGalatBerkas(h.galat); return; }
    setBaris(h.baris);
    setInfoBerkas(`${h.baris.length} transaksi terbaca${h.dilewati ? `, ${h.dilewati} baris dilewati` : ""}.`);
  }

  const tanpa = ctx.kelas.tanpaPemilik;
  const tampil = semua ? tanpa : tanpa.slice(0, 15);

  return (
    <>
      {galat && <p className="field-error" role="alert">{galat}</p>}
      <section className="paper section-block">
        <div className="section-heading"><div><h2>Impor laporan QRIS</h2><p>Ekspor Laporan Transaksi dari aplikasi GoPay Merchant, lalu pilih berkasnya di sini.</p></div></div>
        <label className="upload-zone">
          <strong>Pilih berkas CSV</strong>
          <span>Bisa diimpor berulang. Transaksi yang sama tidak digandakan.</span>
          <input type="file" accept=".csv,text/csv" onChange={(e) => void bacaBerkas(e.target.files?.[0])} />
        </label>
        {galatBerkas && <p className="field-error" role="alert">{galatBerkas}</p>}
        {baris && (
          <div className="action-stack">
            <p>{infoBerkas}</p>
            <Button disabled={sibuk || !baris.length} onClick={() => void lakukan(async () => {
              const h = await imporGopay(baris);
              setRingkasan(`Baru ${h.baru}, dicocokkan ${h.dicocokkan}, tanpa pemilik ${h.tanpa_pemilik}, mencurigakan ${h.mencurigakan}.`);
              setBaris(null);
            }, "Laporan diimpor.")}>{sibuk ? "Mengimpor" : "Impor dan cocokkan"}</Button>
          </div>
        )}
        {ringkasan && <p className="notice notice-blue" role="status">{ringkasan}</p>}
      </section>

      <section className="paper section-block">
        <h2>Rekonsiliasi QRIS</h2>
        {rekon ? (
          <div className="recon-grid">
            <div><span>Total laporan GoPay</span><strong>{rupiah(rekon.laporan)}</strong></div>
            <div><span>Sudah dikaitkan</span><strong>{rupiah(rekon.terkait)}</strong></div>
            <div><span>Tanpa pemilik</span><strong>{rupiah(rekon.laporan - rekon.terkait)}</strong></div>
            <div><span>Klaim belum cocok</span><strong>{rupiah(rekon.menunggu)}</strong></div>
          </div>
        ) : <p className="empty-message">Memuat rekonsiliasi.</p>}
        <p className="board-hint">Selisih nol berarti semua uang masuk sudah punya pemilik dan semua klaim sudah cocok.</p>
      </section>

      <section className="paper section-block">
        <h2>Uang tanpa pemilik</h2>
        {tanpa.length === 0 && <p className="empty-message">Tidak ada. Semua transaksi yang diimpor sudah punya pemilik.</p>}
        {tampil.map((t) => (
          <div className="reminder-row" key={t.no_transaksi}>
            <div><strong>{rupiah(t.nominal)}</strong><span>{hariJam(t.waktu_dibuat)}</span></div>
            <div className="reminder-actions">
              <select aria-label={`Pemilik transaksi ${rupiah(t.nominal)} ${hariJam(t.waktu_dibuat)}`} value={pilihan[t.no_transaksi] ?? ""} onChange={(e) => setPilihan((p) => ({ ...p, [t.no_transaksi]: e.target.value }))}>
                <option value="">Pilih siswa</option>
                {m.siswa.map((s) => <option key={s.id} value={s.nrp}>{s.no_absen}. {s.nama}</option>)}
              </select>
              <Button disabled={sibuk || !pilihan[t.no_transaksi]} onClick={() => void lakukan(() => tetapkanPemilik(t.no_transaksi, pilihan[t.no_transaksi]), "Pemilik ditetapkan.")}>Tetapkan</Button>
            </div>
          </div>
        ))}
        {tanpa.length > 15 && !semua && <button className="text-button" onClick={() => setSemua(true)}>Tampilkan semua {tanpa.length}</button>}
      </section>
    </>
  );
}
