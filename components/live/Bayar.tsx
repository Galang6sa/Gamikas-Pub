"use client";

import { useEffect, useState } from "react";
import { hitungTotal } from "@/lib/api";
import { QRIS_IMAGE } from "@/lib/supabase";
import { Button, StatusStamp, playFeedbackSound } from "@/components/ui";
import { keterangan, rupiah, stempel, sudahTelat } from "@/lib/papan";
import type { Ctx } from "./tipe";

type Total = { jumlah: number; pokok: number; denda: number; total: number };

export default function Bayar({ ctx, awal }: { ctx: Ctx; awal?: string }) {
  const { kelas, sesi, sekarang, notify, go, bunyi } = ctx;
  const dendaAktif = kelas.konfigurasi?.denda_aktif ?? true;
  const bisaDibayar = kelas.ringkasan.filter((r) => r.status === "belum");
  const [langkah, setLangkah] = useState<"pilih" | "qris" | "info">("pilih");
  const [dipilih, setDipilih] = useState<string[]>(() => {
    const pertama = awal && bisaDibayar.some((r) => r.tagihan_id === awal) ? awal : bisaDibayar[0]?.tagihan_id;
    return pertama ? [pertama] : [];
  });
  const [total, setTotal] = useState<Total | null>(null);
  const [galat, setGalat] = useState("");
  const [menghitung, setMenghitung] = useState(false);
  const [qrGagal, setQrGagal] = useState(false);

  useEffect(() => {
    let batal = false;
    if (!dipilih.length) {
      setTotal(null);
      return;
    }
    setMenghitung(true);
    setGalat("");
    hitungTotal(dipilih)
      .then((t) => { if (!batal) setTotal(t); })
      .catch((e: unknown) => { if (!batal) { setTotal(null); setGalat(e instanceof Error ? e.message : "Total belum bisa dihitung."); } })
      .finally(() => { if (!batal) setMenghitung(false); });
    return () => { batal = true; };
  }, [dipilih]);

  if (sesi.role === "bendahara") {
    return (
      <div className="content-narrow">
        <div className="page-heading"><h1>Bayar kas kelas.</h1><p>Akun bendahara tidak membayar lewat sini. Catat pembayaran siswa di Meja bendahara.</p></div>
        <Button onClick={() => go("bendahara")}>Buka Meja bendahara</Button>
      </div>
    );
  }

  function pilih(id: string) {
    playFeedbackSound("tear", bunyi);
    setDipilih((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  }

  async function salinNominal() {
    if (!total) return;
    try {
      await navigator.clipboard.writeText(String(total.total));
      notify("Nominal disalin.");
    } catch {
      notify("Browser belum mengizinkan menyalin nominal.");
    }
  }

  return (
    <div className="content-narrow">
      <div className="page-heading">
        <p className="eyebrow">Bayar kas kelas</p>
        <h1>Pilih karcisnya.</h1>
        <p>Pilih satu atau beberapa minggu. Totalnya ikut berubah.</p>
      </div>

      {langkah === "pilih" && (
        <>
          {bisaDibayar.length === 0 ? (
            <p className="empty-message">Semua tagihanmu sudah lunas atau menunggu cek. Tidak ada yang perlu dibayar.</p>
          ) : (
            <div className="ticket-list">
              {bisaDibayar.map((r) => {
                const terpilih = dipilih.includes(r.tagihan_id);
                const telat = sudahTelat(r, sekarang);
                return (
                  <article key={r.tagihan_id} className={`ticket ${terpilih ? "ticket-selected" : ""} ${telat ? "ticket-late" : ""}`}>
                    <button className="ticket-select" aria-pressed={terpilih} onClick={() => pilih(r.tagihan_id)}
                      aria-label={`${terpilih ? "Hapus pilihan" : "Pilih"} minggu ${r.mulai}`}>
                      <span className="ticket-info">
                        <strong>{new Date(`${r.mulai}T12:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" })} sampai {new Date(`${r.akhir}T12:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" })}</strong>
                        <span>{keterangan(r, sekarang, dendaAktif)}</span>
                      </span>
                      {terpilih && <span className="ticket-selection-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg></span>}
                      <span className="ticket-coupon"><strong>{rupiah(r.total)}</strong><StatusStamp status={stempel(r.status)} /></span>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
          {!dendaAktif && <p className="notice notice-blue">Denda sedang dinonaktifkan. Kamu hanya membayar tagihan pokok.</p>}
          {galat && <p className="field-error" role="alert">{galat}</p>}
          <div className="pay-total">
            <div>
              <span>Total yang dibayar</span>
              <strong>{menghitung ? "Menghitung" : total ? rupiah(total.total) : "Rp0"}</strong>
              {total && total.denda > 0 && <small>Tagihan pokok {rupiah(total.pokok)} ditambah denda {rupiah(total.denda)}.</small>}
            </div>
            <div>
              <Button onClick={() => setLangkah("qris")} disabled={!total || menghitung}>Lanjut ke QRIS</Button>
              {!dipilih.length && bisaDibayar.length > 0 && <small>Pilih minimal satu minggu.</small>}
            </div>
          </div>
        </>
      )}

      {langkah === "qris" && total && (
        <section className="paper payment-step">
          <div className="step-label">Langkah satu. Bayar dengan QRIS.</div>
          <h2>{rupiah(total.total)}</h2>
          <p>Pindai QR kas kelas dari aplikasi pembayaranmu, lalu ketik nominal persis seperti di atas.</p>
          {qrGagal ? (
            <p className="empty-message">Gambar QRIS kelas belum dipasang. Minta bendahara memasangnya, atau bayar langsung ke bendahara.</p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="qris-image" src={QRIS_IMAGE} alt="QRIS kas kelas" onError={() => setQrGagal(true)} />
          )}
          <div className="button-row">
            <Button kind="secondary" onClick={salinNominal}>Salin nominal</Button>
            <Button onClick={() => setLangkah("info")}>Saya sudah bayar</Button>
          </div>
          <Button kind="secondary" onClick={() => setLangkah("pilih")}>Kembali memilih minggu</Button>
        </section>
      )}

      {langkah === "info" && total && (
        <section className="paper result-panel" aria-live="polite">
          <div className="result-stamp result-review">DICEK</div>
          <h2>Pembayaranmu belum tercatat otomatis.</h2>
          <p>Unggah bukti dan pencocokan otomatis belum aktif. Beri tahu bendahara bahwa kamu sudah membayar {rupiah(total.total)}, supaya dicatat dan dicocokkan dengan laporan QRIS.</p>
          <Button onClick={() => go("beranda")}>Kembali ke beranda</Button>
        </section>
      )}
    </div>
  );
}
