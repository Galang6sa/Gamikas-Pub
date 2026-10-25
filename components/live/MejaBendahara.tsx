"use client";

import { useMemo, useState } from "react";
import { aturLibur, batalkanPembayaran, bebaskanDenda, catatPembayaran, setDendaAktif, tambahPengeluaran } from "@/lib/api";
import { Button, StatusStamp } from "@/components/ui";
import { rupiah, susunMatriks, tanggalWib } from "@/lib/papan";
import type { Ctx } from "./tipe";

const KATEGORI = ["Alat kelas", "Fotokopi", "Kebersihan", "Kegiatan", "Lainnya"];

function waktuLokalWib(d: Date): string {
  return d.toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" }).replace(" ", "T").slice(0, 16);
}

export default function MejaBendahara({ ctx }: { ctx: Ctx }) {
  const { kelas, sekarang, notify, muat } = ctx;
  const m = useMemo(() => susunMatriks(kelas.papan), [kelas.papan]);
  const dendaAktif = kelas.konfigurasi?.denda_aktif ?? true;
  const namaDari = (id: string) => m.siswa.find((s) => s.id === id)?.nama ?? "";

  const [galat, setGalat] = useState("");
  const [sibuk, setSibuk] = useState(false);

  // catat pembayaran
  const [nrp, setNrp] = useState("");
  const [metode, setMetode] = useState<"cash" | "qris">("cash");
  const [waktu, setWaktu] = useState(() => waktuLokalWib(sekarang));
  const [jumlah, setJumlah] = useState("1");
  // pengeluaran
  const [tgl, setTgl] = useState(() => tanggalWib(sekarang));
  const [kategori, setKategori] = useState(KATEGORI[0]);
  const [ket, setKet] = useState("");
  const [nominal, setNominal] = useState("");
  // bebaskan denda
  const [bebasSiswa, setBebasSiswa] = useState("");
  const [bebasTagihan, setBebasTagihan] = useState("");
  const [bebasAlasan, setBebasAlasan] = useState("");
  // dialog
  const [konfirmDenda, setKonfirmDenda] = useState<boolean | null>(null);
  const [batal, setBatal] = useState<{ id: string; label: string } | null>(null);
  const [alasanBatal, setAlasanBatal] = useState("");

  async function lakukan(aksi: () => Promise<void>, sukses: string) {
    setGalat("");
    setSibuk(true);
    try {
      await aksi();
      await muat();
      notify(sukses);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Aksi belum berhasil. Coba lagi.");
    } finally {
      setSibuk(false);
    }
  }

  const belumSiswa = kelas.papan.filter((r) => r.siswa_id === bebasSiswa && r.status === "belum" && r.ditagih && !r.denda_dibebaskan);
  const terbaru = kelas.pembayaran.slice(0, 8);
  const tanggalPendek = (t: string) => new Date(`${t}T12:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });

  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Ruang kerja bendahara</p>
        <h1>Meja bendahara.</h1>
        <p>Catat yang masuk dan keluar. Setiap aksi tersimpan di catatan aktivitas.</p>
      </div>
      {galat && <p className="field-error" role="alert">{galat}</p>}

      <section className="paper section-block">
        <div className="section-heading"><div><h2>Catat pembayaran</h2><p>Untuk tunai atau pembayaran yang belum lewat unggah bukti. Melunasi tagihan terlama siswa itu.</p></div></div>
        <form className="form-grid" onSubmit={(e) => {
          e.preventDefault();
          void lakukan(async () => {
            await catatPembayaran({ nrp, metode, waktuIso: `${waktu}:00+07:00`, jumlahMinggu: Number(jumlah) });
          }, "Pembayaran dicatat.");
        }}>
          <label className="field-label">Siswa
            <select value={nrp} onChange={(e) => setNrp(e.target.value)} required>
              <option value="">Pilih siswa</option>
              {m.siswa.map((s) => <option key={s.id} value={s.nrp}>{s.no_absen}. {s.nama}</option>)}
            </select>
          </label>
          <label className="field-label">Metode
            <select value={metode} onChange={(e) => setMetode(e.target.value as "cash" | "qris")}>
              <option value="cash">Tunai</option>
              <option value="qris">QRIS</option>
            </select>
          </label>
          <label className="field-label">Waktu bayar (WIB)
            <input type="datetime-local" value={waktu} onChange={(e) => setWaktu(e.target.value)} required />
          </label>
          <label className="field-label">Jumlah minggu
            <input type="number" min={1} max={12} value={jumlah} onChange={(e) => setJumlah(e.target.value)} required />
          </label>
          <Button type="submit" disabled={sibuk || !nrp}>Catat pembayaran</Button>
        </form>
      </section>

      <section className="paper section-block">
        <h2>Pembayaran terbaru</h2>
        {terbaru.length === 0 && <p className="empty-message">Belum ada pembayaran tercatat.</p>}
        {terbaru.map((p) => (
          <div className="reminder-row" key={p.id}>
            <div>
              <strong>{namaDari(p.siswa_id)}, {rupiah(p.nominal_bukti)}</strong>
              <span>{p.metode === "cash" ? "Tunai" : "QRIS"}, {tanggalPendek((p.waktu_bayar ?? p.dibuat_pada).slice(0, 10))}. {p.status === "terkonfirmasi" ? "Terkonfirmasi." : p.status === "lunas_sementara" ? "Lunas sementara." : "Menunggu cek."}</span>
            </div>
            <div className="reminder-actions"><Button kind="secondary" onClick={() => { setBatal({ id: p.id, label: `${namaDari(p.siswa_id)}, ${rupiah(p.nominal_bukti)}` }); setAlasanBatal(""); }}>Batalkan</Button></div>
          </div>
        ))}
      </section>

      <section className="paper section-block">
        <div className="section-heading"><div><h2>Uang tanpa pemilik</h2><p>Transaksi QRIS yang sudah masuk laporan tetapi belum dikaitkan ke siswa.</p></div><StatusStamp status="cek" /></div>
        {kelas.tanpaPemilik.length === 0 ? <p className="empty-message">Tidak ada. Semua transaksi yang diimpor sudah punya pemilik.</p> : (
          <div className="csv-preview">
            <table>
              <thead><tr><th>Waktu</th><th>Nominal</th></tr></thead>
              <tbody>
                {kelas.tanpaPemilik.map((t) => (
                  <tr key={t.no_transaksi}>
                    <td>{new Date(t.waktu_dibuat).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}</td>
                    <td>{rupiah(t.nominal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Penetapan pemilik dilakukan lewat berkas impor (006_impor_riwayat_qris.sql). Penetapan dari layar ini menyusul.</p>
          </div>
        )}
      </section>

      <section className="paper section-block">
        <h2>Catat pengeluaran</h2>
        <form className="form-grid" onSubmit={(e) => {
          e.preventDefault();
          void lakukan(async () => {
            await tambahPengeluaran({ tanggal: tgl, nominal: Number(nominal), kategori, keterangan: ket.trim() });
            setKet("");
            setNominal("");
          }, "Pengeluaran dicatat.");
        }}>
          <label className="field-label">Keperluan
            <input value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Misalnya spidol papan tulis" required />
          </label>
          <label className="field-label">Kategori
            <select value={kategori} onChange={(e) => setKategori(e.target.value)}>{KATEGORI.map((k) => <option key={k}>{k}</option>)}</select>
          </label>
          <label className="field-label">Nominal
            <input type="number" min={1} step={50} value={nominal} onChange={(e) => setNominal(e.target.value)} required />
          </label>
          <label className="field-label">Tanggal
            <input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} required />
          </label>
          <Button type="submit" disabled={sibuk}>Catat pengeluaran</Button>
        </form>
      </section>

      <section className="paper section-block fine-policy">
        <div><h2>Kebijakan denda</h2><p>{dendaAktif ? "Denda berlaku untuk pembayaran baru." : "Denda sedang dinonaktifkan."}</p></div>
        <button className={`switch ${dendaAktif ? "switch-on" : ""}`} role="switch" aria-checked={dendaAktif} aria-label="Kebijakan denda" onClick={() => setKonfirmDenda(!dendaAktif)}><span /></button>
      </section>

      <section className="paper section-block">
        <h2>Bebaskan denda</h2>
        <p>Untuk satu tagihan yang belum lunas, misalnya karena izin atau sakit. Alasan wajib diisi.</p>
        <form className="form-grid" onSubmit={(e) => {
          e.preventDefault();
          void lakukan(async () => {
            await bebaskanDenda(bebasTagihan, bebasAlasan);
            setBebasAlasan("");
            setBebasTagihan("");
          }, "Denda dibebaskan.");
        }}>
          <label className="field-label">Siswa
            <select value={bebasSiswa} onChange={(e) => { setBebasSiswa(e.target.value); setBebasTagihan(""); }} required>
              <option value="">Pilih siswa</option>
              {m.siswa.map((s) => <option key={s.id} value={s.id}>{s.no_absen}. {s.nama}</option>)}
            </select>
          </label>
          <label className="field-label">Minggu
            <select value={bebasTagihan} onChange={(e) => setBebasTagihan(e.target.value)} required disabled={!bebasSiswa}>
              <option value="">{bebasSiswa && !belumSiswa.length ? "Tidak ada tagihan yang bisa dibebaskan" : "Pilih minggu"}</option>
              {belumSiswa.map((r) => <option key={r.tagihan_id} value={r.tagihan_id}>{tanggalPendek(r.mulai)} sampai {tanggalPendek(r.akhir)}</option>)}
            </select>
          </label>
          <label className="field-label">Alasan
            <input value={bebasAlasan} onChange={(e) => setBebasAlasan(e.target.value)} required />
          </label>
          <Button type="submit" disabled={sibuk || !bebasTagihan}>Bebaskan denda</Button>
        </form>
      </section>

      <section className="paper section-block">
        <h2>Minggu libur</h2>
        <p>Minggu libur tidak ditagih. Minggu yang sudah ada pembayaran tidak bisa dijadikan libur.</p>
        {m.minggu.slice().reverse().slice(0, 8).map((w) => (
          <div className="reminder-row" key={w.id}>
            <div><strong>{tanggalPendek(w.mulai)} sampai {tanggalPendek(w.akhir)}</strong><span>{w.ditagih ? "Ditagih." : "Libur. Tidak ditagih."}</span></div>
            <div className="reminder-actions">
              <Button kind="secondary" disabled={sibuk} onClick={() => void lakukan(() => aturLibur(w.id, w.ditagih), w.ditagih ? "Minggu dijadikan libur." : "Minggu ditagih lagi.")}>{w.ditagih ? "Jadikan libur" : "Tagih lagi"}</Button>
            </div>
          </div>
        ))}
      </section>

      {konfirmDenda !== null && (
        <div className="sheet-backdrop">
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-denda" aria-describedby="dlg-denda-isi">
            <p className="eyebrow">Kebijakan untuk seluruh kelas</p>
            <h2 id="dlg-denda">{konfirmDenda ? "Aktifkan denda?" : "Nonaktifkan denda?"}</h2>
            <p id="dlg-denda-isi">{konfirmDenda ? "Pembayaran berikutnya kembali mengikuti aturan denda. Perubahan ini tidak berlaku surut." : "Pembayaran baru tidak dikenai denda. Denda yang sudah tercatat tidak berubah."}</p>
            <div className="button-row">
              <Button kind="secondary" onClick={() => setKonfirmDenda(null)}>Kembali</Button>
              <Button kind={konfirmDenda ? "primary" : "danger"} disabled={sibuk} onClick={() => { const nilai = konfirmDenda; setKonfirmDenda(null); void lakukan(() => setDendaAktif(nilai), nilai ? "Denda diaktifkan." : "Denda dinonaktifkan."); }}>{konfirmDenda ? "Aktifkan denda" : "Nonaktifkan denda"}</Button>
            </div>
          </section>
        </div>
      )}

      {batal && (
        <div className="sheet-backdrop">
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-batal">
            <h2 id="dlg-batal">Batalkan pembayaran?</h2>
            <p>{batal.label}. Tagihannya kembali belum lunas. Alasan wajib diisi dan tersimpan di catatan aktivitas.</p>
            <label className="field-label">Alasan
              <input value={alasanBatal} onChange={(e) => setAlasanBatal(e.target.value)} autoFocus />
            </label>
            <div className="button-row">
              <Button kind="secondary" onClick={() => setBatal(null)}>Kembali</Button>
              <Button kind="danger" disabled={sibuk || !alasanBatal.trim()} onClick={() => { const target = batal; setBatal(null); void lakukan(() => batalkanPembayaran(target.id, alasanBatal.trim()), "Pembayaran dibatalkan."); }}>Batalkan pembayaran</Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
