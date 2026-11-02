"use client";

import { useEffect, useMemo, useState } from "react";
import { ajukanQris, batalkanKlaimSaya, hitungTotal, type HasilAjukan } from "@/lib/api";
import { bacaBukti, type HasilBaca } from "@/lib/ocr";
import { mainkan } from "@/lib/bunyi";
import { QRIS_IMAGE } from "@/lib/supabase";
import { Button, StatusStamp, playFeedbackSound } from "@/components/ui";
import { keterangan, rupiah, stempel, sudahTelat, tanggalPendek } from "@/lib/papan";
import type { Ctx } from "./tipe";

type Total = { jumlah: number; pokok: number; denda: number; total: number };
type Langkah = "pilih" | "qris" | "bukti" | "hasil";
const NAMA_LANGKAH: { kunci: Langkah; label: string }[] = [
  { kunci: "pilih", label: "Pilih" }, { kunci: "qris", label: "Bayar" }, { kunci: "bukti", label: "Bukti" }, { kunci: "hasil", label: "Selesai" },
];

function waktuTampil(iso: string | null): string {
  if (!iso) return "Tidak terbaca";
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB";
}

export default function Bayar({ ctx, awal }: { ctx: Ctx; awal?: string }) {
  const { kelas, sesi, sekarang, notify, go, bunyi, muat } = ctx;
  const dendaAktif = kelas.konfigurasi?.denda_aktif ?? true;
  const bisaDibayar = kelas.ringkasan.filter((r) => r.status === "belum");
  const menunggu = useMemo(() => {
    const per = new Map<string, { id: string; minggu: string[]; total: number; status: (typeof kelas.ringkasan)[number]["status"] }>();
    for (const r of kelas.ringkasan) {
      if (!r.pembayaran_id || !["lunas_sementara", "perlu_dicek", "mencurigakan"].includes(r.status)) continue;
      const x = per.get(r.pembayaran_id) ?? { id: r.pembayaran_id, minggu: [], total: 0, status: r.status };
      x.minggu.push(tanggalPendek(r.mulai));
      x.total += r.total;
      per.set(r.pembayaran_id, x);
    }
    return [...per.values()];
  }, [kelas.ringkasan]);

  const [langkah, setLangkah] = useState<Langkah>("pilih");
  const [dipilih, setDipilih] = useState<string[]>(() => {
    const pertama = awal && bisaDibayar.some((r) => r.tagihan_id === awal) ? awal : bisaDibayar[0]?.tagihan_id;
    return pertama ? [pertama] : [];
  });
  const [total, setTotal] = useState<Total | null>(null);
  const [galat, setGalat] = useState("");
  const [menghitung, setMenghitung] = useState(false);
  const [qrGagal, setQrGagal] = useState(false);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState("");
  const [membaca, setMembaca] = useState("");
  const [bacaan, setBacaan] = useState<(HasilBaca & { hash: string }) | null>(null);
  const [galatBukti, setGalatBukti] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const [hasil, setHasil] = useState<HasilAjukan | null>(null);

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

  useEffect(() => {
    if (!berkas || typeof URL.createObjectURL !== "function") return;
    let url = "";
    try {
      url = URL.createObjectURL(berkas);
    } catch {
      return; // pratinjau hanya pelengkap, tidak boleh menggagalkan pembacaan bukti
    }
    setPratinjau(url);
    return () => URL.revokeObjectURL(url);
  }, [berkas]);

  if (sesi.role === "bendahara") {
    return (
      <div className="content-narrow">
        <div className="page-heading"><h1>Bayar kas kelas.</h1><p>Akun bendahara tidak membayar lewat sini. Catat pembayaran siswa di Meja bendahara.</p></div>
        <Button onClick={() => go("bendahara")}>Buka Meja bendahara</Button>
      </div>
    );
  }

  const pilih = (id: string) => {
    playFeedbackSound("tear", bunyi);
    setDipilih((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  };

  async function salinNominal() {
    if (!total) return;
    try {
      await navigator.clipboard.writeText(String(total.total));
      notify("Nominal disalin.");
    } catch {
      notify("Browser belum mengizinkan menyalin nominal.");
    }
  }

  async function pilihBerkas(f: File | undefined) {
    if (!f) return;
    setBerkas(f);
    setBacaan(null);
    setGalatBukti("");
    setMembaca("Menyiapkan pembaca");
    try {
      setBacaan(await bacaBukti(f, {
        kodeMerchant: kelas.konfigurasi?.merchant_kode ?? "",
        namaMerchant: kelas.konfigurasi?.merchant_nama,
        onProgress: setMembaca,
      }));
    } catch (e) {
      setGalatBukti(e instanceof Error ? `Bukti belum bisa dibaca: ${e.message}` : "Bukti belum bisa dibaca. Coba gambar lain.");
    } finally {
      setMembaca("");
    }
  }

  const nominalCocok = !!bacaan?.nominal && !!total && bacaan.nominal === total.total;

  async function kirim() {
    if (!bacaan?.nominal) return;
    setMengirim(true);
    setGalatBukti("");
    try {
      const h = await ajukanQris({
        tagihanIds: dipilih, nominal: bacaan.nominal, waktuIso: bacaan.waktuIso, ref: bacaan.refId, hash: bacaan.hash,
        ocr: { sukses: bacaan.sukses, merchantCocok: bacaan.merchantCocok, nominal: bacaan.nominal, waktuIso: bacaan.waktuIso, refId: bacaan.refId, ragu: bacaan.ragu },
      });
      setHasil(h);
      setLangkah("hasil");
      mainkan(h.status === "terkonfirmasi" || h.status === "lunas_sementara" ? "cap" : "berhasil", bunyi);
      await muat();
    } catch (e) {
      setGalatBukti(e instanceof Error ? e.message : "Bukti belum bisa dikirim. Coba lagi.");
    } finally {
      setMengirim(false);
    }
  }

  async function batalkan(id: string) {
    try {
      await batalkanKlaimSaya(id);
      await muat();
      notify("Klaim dibatalkan. Tagihannya bisa dibayar lagi.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Klaim belum bisa dibatalkan.");
    }
  }

  const indeks = NAMA_LANGKAH.findIndex((l) => l.kunci === langkah);
  const stepper = (
    <ol className="stepper" aria-label="Langkah pembayaran">
      {NAMA_LANGKAH.map((l, i) => <li key={l.kunci} aria-current={i === indeks ? "step" : undefined} className={i < indeks ? "selesai" : ""}>{l.label}</li>)}
    </ol>
  );

  return (
    <div className="content-narrow">
      <div className="page-heading">
        <p className="eyebrow">Bayar kas kelas</p>
        <h1>{langkah === "pilih" ? "Pilih minggu." : langkah === "qris" ? "Bayar lewat QRIS." : langkah === "bukti" ? "Unggah bukti." : "Selesai."}</h1>
        {langkah === "pilih" && <p>Pilih satu atau beberapa minggu. Totalnya ikut berubah.</p>}
      </div>
      {stepper}

      {langkah === "pilih" && (
        <>
          {bisaDibayar.length === 0 ? (
            <p className="empty-message">Tidak ada tagihan yang perlu dibayar.</p>
          ) : (
            <div className="ticket-list">
              {bisaDibayar.map((r) => {
                const terpilih = dipilih.includes(r.tagihan_id);
                return (
                  <article key={r.tagihan_id} className={`ticket ${terpilih ? "ticket-selected" : ""} ${sudahTelat(r, sekarang) ? "ticket-late" : ""}`}>
                    <button className="ticket-pick" role="checkbox" aria-checked={terpilih} onClick={() => pilih(r.tagihan_id)}
                      aria-label={`Minggu ${tanggalPendek(r.mulai)} sampai ${tanggalPendek(r.akhir)}, ${rupiah(r.total)}`}>
                      <span className="ticket-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7" /></svg></span>
                      <span className="ticket-info">
                        <strong>{tanggalPendek(r.mulai)} sampai {tanggalPendek(r.akhir)}</strong>
                        <span>{keterangan(r, sekarang, dendaAktif)}</span>
                      </span>
                      <span className="ticket-coupon"><strong>{rupiah(r.total)}</strong></span>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
          {!dendaAktif && bisaDibayar.length > 0 && <p className="notice notice-blue">Denda sedang dinonaktifkan.</p>}
          {galat && <p className="field-error" role="alert">{galat}</p>}

          {menunggu.length > 0 && (
            <section className="paper section-block">
              <h2>Menunggu konfirmasi</h2>
              {menunggu.map((m) => (
                <div className="reminder-row" key={m.id}>
                  <div><strong>{rupiah(m.total)}</strong><span>{m.minggu.join(", ")}</span></div>
                  <div className="reminder-actions"><StatusStamp status={stempel(m.status)} compact /><Button kind="secondary" onClick={() => void batalkan(m.id)}>Batalkan</Button></div>
                </div>
              ))}
            </section>
          )}

          {bisaDibayar.length > 0 && (
            <div className="pay-bar">
              <div className="pay-bar-total">
                <span>Total</span>
                <strong>{menghitung ? "Menghitung" : total ? rupiah(total.total) : "Rp0"}</strong>
                {!dipilih.length ? <small>Pilih minimal satu minggu.</small> : total && total.denda > 0 ? <small>Termasuk denda {rupiah(total.denda)}.</small> : null}
              </div>
              <Button onClick={() => setLangkah("qris")} disabled={!total || menghitung}>Lanjut bayar</Button>
            </div>
          )}
        </>
      )}

      {langkah === "qris" && total && (
        <section className="paper payment-step">
          <p>Ketik nominal ini persis di aplikasi pembayaranmu:</p>
          <div className="big-amount">{rupiah(total.total)}</div>
          {qrGagal ? (
            <p className="empty-message">Gambar QRIS kelas belum dipasang. Minta bendahara memasangnya.</p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="qris-image" src={QRIS_IMAGE} alt="QRIS kas kelas" onError={() => setQrGagal(true)} />
          )}
          <div className="action-stack">
            <Button onClick={() => setLangkah("bukti")}>Sudah bayar, unggah bukti</Button>
            <Button kind="secondary" onClick={salinNominal}>Salin nominal</Button>
            <button className="text-button" onClick={() => setLangkah("pilih")}>Ubah pilihan minggu</button>
          </div>
        </section>
      )}

      {langkah === "bukti" && total && (
        <section className="paper payment-step">
          <p>Screenshot layar &quot;pembayaran berhasil&quot; di aplikasimu. Gambar dibaca di perangkat ini dan tidak diunggah ke mana pun.</p>
          {pratinjau && berkas && /* eslint-disable-next-line @next/next/no-img-element */ <img className="upload-preview" src={pratinjau} alt="Pratinjau bukti pembayaran" />}
          <label className="upload-zone">
            <strong>{berkas ? "Ganti gambar" : "Pilih gambar bukti"}</strong>
            <span>Ketuk untuk memilih dari galeri atau kamera</span>
            <input type="file" accept="image/*" onChange={(e) => void pilihBerkas(e.target.files?.[0])} />
          </label>

          {membaca && <div role="status"><p>{membaca}.</p><div className="progress-line" aria-hidden="true" /></div>}

          {bacaan && !membaca && (
            <>
              <ul className="read-list" aria-label="Hasil pembacaan bukti">
                <li><span>Nominal</span><b className={nominalCocok ? "read-ok" : "read-warn"}>{bacaan.nominal ? rupiah(bacaan.nominal) : "Tidak terbaca"}{nominalCocok ? ", cocok" : bacaan.nominal ? `, seharusnya ${rupiah(total.total)}` : ""}</b></li>
                <li><span>Waktu bayar</span><b className={bacaan.waktuIso ? "read-ok" : "read-warn"}>{waktuTampil(bacaan.waktuIso)}</b></li>
                <li><span>Penerima</span><b className={bacaan.merchantCocok ? "read-ok" : "read-warn"}>{bacaan.merchantCocok ? "QRIS kelas" : "Tidak terbaca"}</b></li>
                <li><span>Status</span><b className={bacaan.sukses ? "read-ok" : "read-warn"}>{bacaan.sukses ? "Berhasil" : "Tidak terbaca"}</b></li>
              </ul>
              {bacaan.ragu.length > 0 && <p className="claim-warn">{bacaan.ragu[0]}</p>}
              {bacaan.nominal && !nominalCocok && <p className="field-error" role="alert">Nominal di bukti berbeda dengan total pilihanmu. Ubah pilihan minggu atau ganti gambar.</p>}
            </>
          )}
          {galatBukti && <p className="field-error" role="alert">{galatBukti}</p>}

          <div className="action-stack">
            <Button onClick={() => void kirim()} disabled={!bacaan || !nominalCocok || !!membaca || mengirim}>{mengirim ? "Mengirim bukti" : "Kirim bukti"}</Button>
            <button className="text-button" onClick={() => setLangkah("qris")}>Kembali ke QRIS</button>
          </div>
        </section>
      )}

      {langkah === "hasil" && hasil && (
        <section className="paper result-panel" aria-live="polite">
          <div className={`result-stamp ${hasil.status === "terkonfirmasi" || hasil.status === "lunas_sementara" ? "result-success" : "result-review"}`}>
            {hasil.status === "terkonfirmasi" || hasil.status === "lunas_sementara" ? "LUNAS" : hasil.status === "mencurigakan" ? "TINJAU" : "DICEK"}
          </div>
          <h2>{rupiah(hasil.total)}</h2>
          <p>
            {hasil.status === "terkonfirmasi" && "Cocok dengan laporan QRIS. Pembayaranmu tercatat."}
            {hasil.status === "lunas_sementara" && "Tercatat lunas sementara. Dikonfirmasi saat bendahara mengimpor laporan QRIS."}
            {hasil.status === "perlu_dicek" && "Bukti diterima. Bendahara akan memeriksanya."}
            {hasil.status === "mencurigakan" && "Bukti diterima, tapi belum ditemukan di laporan QRIS. Bendahara akan memeriksanya."}
          </p>
          <div className="action-stack"><Button onClick={() => go("beranda")}>Kembali ke beranda</Button></div>
        </section>
      )}
    </div>
  );
}
