"use client";

import { useMemo } from "react";
import { Button, StatusStamp } from "@/components/ui";
import { keterangan, lunasDiMinggu, mingguBerjalan, rangkaianTepat, rupiah, stempel, sudahTelat, susunMatriks, type Ringkasan } from "@/lib/papan";
import PapanKelas from "./PapanKelas";
import type { Ctx } from "./tipe";

export default function Beranda({ ctx, bukaBayar }: { ctx: Ctx; bukaBayar: (id?: string) => void }) {
  const { sesi, kelas, sekarang, go } = ctx;
  const dendaAktif = kelas.konfigurasi?.denda_aktif ?? true;
  const matriks = useMemo(() => susunMatriks(kelas.papan), [kelas.papan]);
  const berjalan = mingguBerjalan(matriks.minggu, sekarang);
  const tanggal = sekarang.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
  const saldo = kelas.saldo?.saldo ?? 0;
  const nama = sesi.nama?.split(" ")[0] ?? "Bendahara";

  const sapaan = (
    <div className="welcome-row">
      <div>
        <p className="eyebrow">{tanggal}</p>
        <h1>Halo, {nama}.</h1>
        <p>Catatan kas kelasmu, rapi di satu tempat.</p>
      </div>
    </div>
  );

  if (sesi.role === "bendahara") {
    const perluDicek = kelas.papan.filter((r) => r.status === "perlu_dicek").length;
    const tanpaPemilik = kelas.tanpaPemilik.reduce((jumlah, t) => jumlah + t.nominal, 0);
    return (
      <>
        {sapaan}
        <div className="treasurer-home">
          <div className="summary-strip">
            <div><span>Perlu dicek</span><strong>{perluDicek} bukti</strong></div>
            <div><span>Uang tanpa pemilik</span><strong>{rupiah(tanpaPemilik)}</strong></div>
            <div><span>Kas tercatat</span><strong>{rupiah(saldo)}</strong></div>
          </div>
          <PapanKelas ctx={ctx} />
        </div>
      </>
    );
  }

  const milikku = kelas.ringkasan;
  const ini: Ringkasan | undefined = berjalan ? milikku.find((r) => r.minggu_id === berjalan.id) : undefined;
  const tertunggak = milikku.filter((r) => sudahTelat(r, sekarang)).slice(-3);
  const lunasIni = ini && ["terkonfirmasi", "lunas_sementara"].includes(ini.status);
  const dapatBayar = ini?.status === "belum";
  const tepat = sesi.siswaId ? rangkaianTepat(kelas.papan, sesi.siswaId, sekarang) : 0;
  const sudahLunasSemua = berjalan ? lunasDiMinggu(kelas.papan, berjalan.id).size : 0;

  return (
    <>
      {sapaan}
      {!dendaAktif && <p className="notice notice-blue home-fine-notice">Denda sedang dinonaktifkan. Kamu hanya membayar tagihan pokok.</p>}
      <div className="home-layout">
        <div className="home-main">
          <section className="hero-ticket">
            <div className="hero-ticket-copy">
              <p className="eyebrow">Karcis minggu ini</p>
              <h2>{!ini ? "Belum ada tagihan" : lunasIni ? "Lunas" : ini.status === "libur" ? "Libur" : rupiah(ini.total)}</h2>
              <p>{ini ? keterangan(ini, sekarang, dendaAktif) : "Bendahara belum membuat tagihan untuk minggu ini."}</p>
              {dapatBayar && ini && <Button onClick={() => bukaBayar(ini.tagihan_id)}>Bayar {rupiah(ini.total)}</Button>}
            </div>
            <div className="hero-stamp">{lunasIni ? "LUNAS" : ini?.status === "libur" ? "LIBUR" : <>BELUM<br />BAYAR</>}</div>
          </section>

          <section className="arrears-section">
            <div className="section-heading">
              <div><h2>Karcis tertunggak</h2><p>Pelan-pelan, pilih minggu yang ingin dibayar.</p></div>
              {tertunggak.length > 0 && <button className="text-button" onClick={() => bukaBayar(tertunggak[0].tagihan_id)}>Lihat semua</button>}
            </div>
            <div className="ticket-stack">
              {tertunggak.length ? tertunggak.map((r) => (
                <article className={`ticket ticket-late`} key={r.tagihan_id}>
                  <button className="ticket-select" onClick={() => bukaBayar(r.tagihan_id)} aria-label={`Bayar minggu ${r.mulai}`}>
                    <span className="ticket-info"><strong>{new Date(`${r.mulai}T12:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" })}</strong><span>{keterangan(r, sekarang, dendaAktif)}</span></span>
                    <span className="ticket-coupon"><strong>{rupiah(r.total)}</strong><StatusStamp status={stempel(r.status)} /></span>
                  </button>
                </article>
              )) : <p className="empty-message">Tidak ada tunggakan yang perlu dibayar.</p>}
            </div>
          </section>

          <PapanKelas ctx={ctx} />
        </div>

        <aside className="home-side">
          <section className="paper streak-paper">
            <div className="stamp-stack" aria-label={`${tepat} stempel tepat waktu`}>
              {Array.from({ length: Math.min(tepat, 8) }, (_, i) => <span key={i} style={{ "--stack-index": i } as React.CSSProperties}>Tepat</span>)}
            </div>
            <p>{tepat > 0 ? `Tepat waktu ${tepat} minggu berturut-turut.` : "Bayar sebelum jatuh tempo untuk memulai rangkaian stempel."}</p>
            <small>{sudahLunasSemua} teman sudah lunas minggu ini.</small>
          </section>
          <section className="class-fund">
            <p>Saldo kas kelas</p>
            <strong>{rupiah(saldo)}</strong>
            <button onClick={() => go("kas")}>Lihat catatan kas</button>
          </section>
        </aside>
      </div>
    </>
  );
}
