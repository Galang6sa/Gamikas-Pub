"use client";

import { useMemo, useState } from "react";
import { Button, StatusStamp } from "@/components/ui";
import { namaSingkat } from "@/lib/nama";
import { bulanDari, lunasDiMinggu, mingguBerjalan, namaBulan, rupiah, stempel, susunMatriks, tunggakanPokok, type SiswaBaris } from "@/lib/papan";
import type { Ctx } from "./tipe";

// Denah bangku dan papan pembayaran. Dipakai di Beranda dan layar Papan.
export default function PapanKelas({ ctx, awal = "denah" }: { ctx: Ctx; awal?: "denah" | "papan" }) {
  const { kelas, sesi, sekarang } = ctx;
  const [mode, setMode] = useState<"denah" | "papan">(awal);
  const [bulanDipilih, setBulanDipilih] = useState("");
  const [terpilih, setTerpilih] = useState<SiswaBaris | null>(null);

  const m = useMemo(() => susunMatriks(kelas.papan), [kelas.papan]);
  const berjalan = mingguBerjalan(m.minggu, sekarang);
  const lunas = useMemo(() => (berjalan ? lunasDiMinggu(kelas.papan, berjalan.id) : new Set<string>()), [kelas.papan, berjalan]);
  const bulan = bulanDari(m.minggu);
  const aktif = bulan.includes(bulanDipilih) ? bulanDipilih : (berjalan?.mulai.slice(0, 7) ?? bulan[bulan.length - 1] ?? "");
  const idx = bulan.indexOf(aktif);

  if (!m.siswa.length || !berjalan) {
    return <section className="paper section-block"><h2>Papan kelas</h2><p className="empty-message">Belum ada tagihan. Bendahara perlu mengisi minggu terlebih dulu.</p></section>;
  }

  const urut = [...m.siswa.filter((s) => s.id === sesi.siswaId), ...m.siswa.filter((s) => s.id !== sesi.siswaId)];

  function bulanTabel(b: string, lalu: boolean) {
    const kolom = m.minggu.filter((x) => x.mulai.startsWith(b));
    return (
      <div className={`month-board ${lalu ? "month-board--lalu" : ""}`} key={b}>
        <h3>{namaBulan(b)}</h3>
        <div className="board-scroll" role="region" aria-label={`Papan pembayaran ${namaBulan(b)}`} tabIndex={0}>
          <table className="payment-board">
            <thead>
              <tr>
                <th scope="col">Siswa</th>
                {kolom.map((k) => <th scope="col" key={k.id}>{k.mulai.slice(8)}/{k.mulai.slice(5, 7)}</th>)}
                <th scope="col" className="col-tunggak">Tunggak</th>
              </tr>
            </thead>
            <tbody>
              {urut.map((s) => (
                <tr key={s.id} className={s.id === sesi.siswaId ? "board-me" : ""}>
                  <th scope="row">
                    <button className="board-name" onClick={() => setTerpilih(s)} aria-label={`${s.no_absen}. ${s.nama}`}>
                      <span className="student-number">{s.no_absen}</span>
                      <span className="nama-pendek" title={s.nama}>{namaSingkat(s.nama)}</span>
                    </button>
                  </th>
                  {kolom.map((k) => {
                    const r = m.sel.get(`${s.id}:${k.id}`);
                    return <td key={k.id}>{r ? <StatusStamp status={stempel(r.status)} compact /> : <span aria-label="Tidak ada tagihan">-</span>}</td>;
                  })}
                  <td className="col-tunggak">{rupiah(tunggakanPokok(kelas.papan, s.id, sekarang))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const barisTerpilih = terpilih ? m.sel.get(`${terpilih.id}:${berjalan.id}`) : undefined;
  const statusSheet = !barisTerpilih ? "belum bayar." : ["terkonfirmasi", "lunas_sementara"].includes(barisTerpilih.status) ? "lunas." : barisTerpilih.status === "libur" ? "minggu libur." : barisTerpilih.status === "belum" ? "belum bayar." : "bukti menunggu cek.";

  return (
    <section className="paper section-block floorplan-block">
      <div className="section-heading">
        <div><h2>{mode === "denah" ? "Denah bangku" : "Papan pembayaran"}</h2><p>{lunas.size} dari {m.siswa.length} sudah bayar minggu ini.</p></div>
        <div className="segmented" role="group" aria-label="Tampilan pembayaran">
          <button className={mode === "denah" ? "selected" : ""} onClick={() => setMode("denah")}>Denah</button>
          <button className={mode === "papan" ? "selected" : ""} onClick={() => setMode("papan")}>Papan</button>
        </div>
      </div>

      {mode === "denah" ? (
        <div className="floorplan" aria-label="Denah kelas, tekan bangku untuk melihat status">
          <div className="teacher-desk">Meja guru</div>
          <div className="desk-grid">
            {m.siswa.map((s) => {
              const bayar = lunas.has(s.id);
              return (
                <button key={s.id} className={`desk ${bayar ? "desk-paid" : "desk-unpaid"} ${s.id === sesi.siswaId ? "desk-me" : ""}`}
                  onClick={() => setTerpilih(s)} aria-label={`Bangku ${s.no_absen}, ${s.nama}, ${bayar ? "lunas" : "belum bayar"}`}>
                  <span>{s.no_absen}</span>
                  {bayar && <small>Lunas</small>}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="board-month-nav">
            <Button kind="secondary" onClick={() => setBulanDipilih(bulan[idx - 1])} disabled={idx <= 0} ariaLabel="Bulan sebelumnya">Sebelumnya</Button>
            <strong>{namaBulan(aktif)}</strong>
            <Button kind="secondary" onClick={() => setBulanDipilih(bulan[idx + 1])} disabled={idx >= bulan.length - 1} ariaLabel="Bulan berikutnya">Berikutnya</Button>
          </div>
          <p className="board-hint">Gulir mendatar untuk melihat minggu lainnya. Ketuk nama untuk detail.</p>
          <div className="board-month-grid">
            {idx > 0 && bulanTabel(bulan[idx - 1], true)}
            {bulanTabel(aktif, false)}
          </div>
        </>
      )}

      {terpilih && (
        <div className="sheet-backdrop" onClick={() => setTerpilih(null)}>
          <section className="student-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-siswa" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="eyebrow">Bangku {terpilih.no_absen}</p>
            <h2 id="sheet-siswa">{terpilih.nama}</h2>
            <p>NRP {terpilih.nrp}. Minggu ini: {statusSheet}</p>
            {barisTerpilih && <StatusStamp status={stempel(barisTerpilih.status)} />}
            <div className="button-row"><Button kind="secondary" onClick={() => setTerpilih(null)}>Tutup</Button></div>
          </section>
        </div>
      )}
    </section>
  );
}
