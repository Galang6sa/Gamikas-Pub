"use client";

import { useState } from "react";
import { putuskanKlaim, type KlaimAntrean } from "@/lib/api";
import { Button, StatusStamp } from "@/components/ui";
import { hariJam, rupiah, stempel, susunMatriks, tanggalPendek, type StatusTagihan } from "@/lib/papan";
import type { Ctx } from "../tipe";
import { useAksi } from "./aksi";

export default function Antrean({ ctx, klaim, muatUlang }: { ctx: Ctx; klaim: KlaimAntrean[]; muatUlang: () => Promise<void> }) {
  const nama = new Map(susunMatriks(ctx.kelas.papan).siswa.map((s) => [s.id, s.nama]));
  const { galat, sibuk, lakukan } = useAksi(ctx, muatUlang);
  const [tolak, setTolak] = useState<KlaimAntrean | null>(null);
  const [alasan, setAlasan] = useState("");

  return (
    <section className="paper section-block" aria-label="Antrean bukti">
      <h2>Bukti yang perlu diputuskan</h2>
      {galat && <p className="field-error" role="alert">{galat}</p>}
      {klaim.length === 0 && <p className="empty-message">Tidak ada bukti yang perlu dicek.</p>}
      {klaim.map((k) => {
        const minggu = k.alokasi_pembayaran.map((a) => a.tagihan?.minggu).filter((x): x is { mulai: string; akhir: string } => !!x).sort((a, b) => a.mulai.localeCompare(b.mulai));
        const kandidat = ctx.kelas.tanpaPemilik.filter((t) => t.nominal === k.nominal_bukti);
        return (
          <article className="claim-card" key={k.id}>
            <div className="claim-head">
              <div><strong>{nama.get(k.siswa_id) ?? "Siswa"}</strong><p className="claim-meta">{rupiah(k.nominal_bukti)}, minggu {minggu.map((m) => tanggalPendek(m.mulai)).join(", ")}</p></div>
              <StatusStamp status={stempel(k.status as StatusTagihan)} compact />
            </div>
            <p className="claim-meta">{k.waktu_bayar ? `Waktu di bukti: ${hariJam(k.waktu_bayar)}.` : "Waktu di bukti tidak terbaca."}</p>
            {k.hasil_ocr?.ragu?.[0] && <p className="claim-warn">{k.hasil_ocr.ragu[0]}</p>}
            <div className="claim-actions">
              <Button disabled={sibuk} onClick={() => void lakukan(() => putuskanKlaim({ id: k.id, terima: true }), "Bukti diterima.")}>Terima</Button>
              <Button kind="secondary" disabled={sibuk} onClick={() => { setTolak(k); setAlasan(""); }}>Tolak</Button>
              {kandidat.length > 0 && (
                <select aria-label="Cocokkan dengan transaksi GoPay" defaultValue="" disabled={sibuk}
                  onChange={(e) => { const no = e.target.value; if (no) void lakukan(() => putuskanKlaim({ id: k.id, terima: true, noTransaksi: no }), "Bukti dicocokkan dengan transaksi."); }}>
                  <option value="">Cocokkan dengan transaksi</option>
                  {kandidat.map((t) => <option key={t.no_transaksi} value={t.no_transaksi}>{hariJam(t.waktu_dibuat)}, {rupiah(t.nominal)}</option>)}
                </select>
              )}
            </div>
          </article>
        );
      })}

      {tolak && (
        <div className="sheet-backdrop">
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-tolak">
            <h2 id="dlg-tolak">Tolak bukti?</h2>
            <p>{nama.get(tolak.siswa_id)}, {rupiah(tolak.nominal_bukti)}. Tagihannya kembali belum lunas.</p>
            <label className="field-label">Alasan
              <input value={alasan} onChange={(e) => setAlasan(e.target.value)} autoFocus />
            </label>
            <div className="button-row">
              <Button kind="secondary" onClick={() => setTolak(null)}>Kembali</Button>
              <Button kind="danger" disabled={sibuk || !alasan.trim()} onClick={() => { const k = tolak; setTolak(null); void lakukan(() => putuskanKlaim({ id: k.id, terima: false, alasan: alasan.trim() }), "Bukti ditolak."); }}>Tolak bukti</Button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
