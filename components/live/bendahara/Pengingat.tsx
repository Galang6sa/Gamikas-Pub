"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { catatPengingat, muatNoWa, muatPengingat, simpanNoWa, type LogPengingat } from "@/lib/api";
import { Button } from "@/components/ui";
import { hariJam, mingguBerjalan, rupiah, susunMatriks, tahapSaatIni } from "@/lib/papan";
import { namaSingkat } from "@/lib/nama";
import type { Ctx } from "../tipe";
import { useAksi } from "./aksi";

function nomorWa(mentah: string | null | undefined): string | null {
  const d = (mentah ?? "").replace(/\D/g, "");
  if (d.length < 9) return null;
  return d.startsWith("0") ? `62${d.slice(1)}` : d.startsWith("62") ? d : `62${d}`;
}

export default function Pengingat({ ctx }: { ctx: Ctx }) {
  const m = useMemo(() => susunMatriks(ctx.kelas.papan), [ctx.kelas.papan]);
  const berjalan = mingguBerjalan(m.minggu, ctx.sekarang);
  const tahap = tahapSaatIni(ctx.sekarang);
  const [log, setLog] = useState<LogPengingat[]>([]);
  const [wa, setWa] = useState<Record<string, string | null>>({});
  const muatLog = useCallback(async () => {
    const [l, n] = await Promise.all([muatPengingat(), muatNoWa()]);
    setLog(l);
    setWa(Object.fromEntries(n.map((x) => [x.id, x.no_wa])));
  }, []);
  useEffect(() => { void muatLog().catch(() => undefined); }, [muatLog]);
  const { galat, sibuk, lakukan } = useAksi(ctx, muatLog);

  const [siswaWa, setSiswaWa] = useState("");
  const [nomor, setNomor] = useState("");

  if (!berjalan) return <section className="paper section-block"><p className="empty-message">Belum ada minggu yang ditagih.</p></section>;
  const belum = ctx.kelas.papan.filter((r) => r.minggu_id === berjalan.id && r.status === "belum" && r.ditagih);
  const terakhir = (siswaId: string, tagihanId: string) => log.find((x) => x.siswa_id === siswaId && x.tagihan_id === tagihanId && x.tahap === tahap);

  function tautan(namaLengkap: string, siswaId: string) {
    const pesan = `Halo ${namaSingkat(namaLengkap)}, kas kelas minggu ini ${rupiah(ctx.kelas.konfigurasi?.nominal_mingguan ?? 5000)} belum tercatat. Jatuh tempo Minggu malam. Bayar lewat ${window.location.origin}`;
    const no = nomorWa(wa[siswaId]);
    return `https://wa.me/${no ?? ""}?text=${encodeURIComponent(pesan)}`;
  }

  return (
    <>
      {galat && <p className="field-error" role="alert">{galat}</p>}
      <section className="paper section-block">
        <h2>Belum bayar minggu ini</h2>
        {belum.length === 0 && <p className="empty-message">Semua sudah bayar atau menunggu cek.</p>}
        {belum.map((r) => {
          const l = terakhir(r.siswa_id, r.tagihan_id);
          return (
            <div className="reminder-row" key={r.tagihan_id}>
              <div>
                <strong>{r.no_absen}. {r.nama}</strong>
                <span>{l ? <span className={`badge-note ${l.status === "dikonfirmasi" ? "badge-ok" : ""}`}>{l.status === "dikonfirmasi" ? "Sudah diingatkan" : "Dibuka"} {hariJam(l.waktu)}</span> : "Belum diingatkan."}</span>
              </div>
              <div className="reminder-actions">
                <Button disabled={sibuk} kind={l ? "secondary" : "primary"} onClick={() => {
                  window.open(tautan(r.nama, r.siswa_id), "_blank", "noopener");
                  void lakukan(() => catatPengingat({ siswaId: r.siswa_id, tagihanId: r.tagihan_id, tahap, status: "dibuka" }), "Pengingat dibuka. Tandai terkirim setelah pesan dikirim.");
                }}>{l ? "Ingatkan lagi" : "Ingatkan"}</Button>
                {l && l.status !== "dikonfirmasi" && <Button kind="secondary" disabled={sibuk} onClick={() => void lakukan(() => catatPengingat({ siswaId: r.siswa_id, tagihanId: r.tagihan_id, tahap, status: "dikonfirmasi" }), "Ditandai sudah diingatkan.")}>Tandai terkirim</Button>}
              </div>
            </div>
          );
        })}
        <p className="board-hint">Membuka WhatsApp tidak bisa memastikan pesan terkirim, jadi tandai sendiri setelah dikirim.</p>
      </section>

      <section className="paper section-block">
        <h2>Nomor WhatsApp</h2>
        <p>Tanpa nomor, WhatsApp akan meminta kamu memilih kontak.</p>
        <form className="form-grid" onSubmit={(e) => { e.preventDefault(); void lakukan(async () => { await simpanNoWa(siswaWa, nomor); setNomor(""); }, "Nomor disimpan."); }}>
          <label className="field-label">Siswa
            <select value={siswaWa} onChange={(e) => { setSiswaWa(e.target.value); setNomor(wa[e.target.value] ?? ""); }} required>
              <option value="">Pilih siswa</option>
              {m.siswa.map((s) => <option key={s.id} value={s.id}>{s.no_absen}. {s.nama}{wa[s.id] ? ", tersimpan" : ""}</option>)}
            </select>
          </label>
          <label className="field-label">Nomor
            <input type="tel" inputMode="tel" value={nomor} onChange={(e) => setNomor(e.target.value)} placeholder="08xxxxxxxxxx" />
          </label>
          <Button type="submit" disabled={sibuk || !siswaWa}>Simpan nomor</Button>
        </form>
      </section>
    </>
  );
}
