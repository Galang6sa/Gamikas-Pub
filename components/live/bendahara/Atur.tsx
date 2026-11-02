"use client";

import { useMemo, useState } from "react";
import { aturLibur, batalkanPembayaran, bebaskanDenda, setDendaAktif } from "@/lib/api";
import { Button } from "@/components/ui";
import { keCsv, unduhCsv } from "@/lib/csv";
import { rupiah, susunMatriks, tanggalPendek } from "@/lib/papan";
import type { Ctx } from "../tipe";
import { useAksi } from "./aksi";

export default function Atur({ ctx }: { ctx: Ctx }) {
  const { kelas } = ctx;
  const m = useMemo(() => susunMatriks(kelas.papan), [kelas.papan]);
  const dendaAktif = kelas.konfigurasi?.denda_aktif ?? true;
  const { galat, sibuk, lakukan } = useAksi(ctx);
  const [konfirmDenda, setKonfirmDenda] = useState<boolean | null>(null);
  const [batal, setBatal] = useState<{ id: string; label: string } | null>(null);
  const [alasanBatal, setAlasanBatal] = useState("");
  const [bebasSiswa, setBebasSiswa] = useState("");
  const [bebasTagihan, setBebasTagihan] = useState("");
  const [bebasAlasan, setBebasAlasan] = useState("");

  const namaDari = (id: string) => m.siswa.find((s) => s.id === id)?.nama ?? "";
  const belumSiswa = kelas.papan.filter((r) => r.siswa_id === bebasSiswa && r.status === "belum" && r.ditagih && !r.denda_dibebaskan);
  const terbaru = kelas.pembayaran.slice(0, 8);

  function unduhPapan() {
    unduhCsv("papan-kas.csv", keCsv(
      ["no_absen", "nrp", "nama", "minggu_mulai", "status", "metode", "waktu_bayar", "denda"],
      kelas.papan.map((r) => [r.no_absen, r.nrp, r.nama, r.mulai, r.status, r.metode, r.waktu_bayar, r.jumlah_denda]),
    ));
  }
  function unduhTransaksi() {
    unduhCsv("transaksi-kas.csv", keCsv(
      ["jenis", "tanggal", "keterangan", "nominal"],
      [
        ...kelas.pembayaran.map((p) => ["masuk", (p.waktu_bayar ?? p.dibuat_pada).slice(0, 10), `${namaDari(p.siswa_id)} (${p.metode})`, p.nominal_bukti]),
        ...kelas.pengeluaran.map((x) => ["keluar", x.tanggal, x.keterangan || x.kategori, x.nominal]),
      ],
    ));
  }

  return (
    <>
      {galat && <p className="field-error" role="alert">{galat}</p>}
      <section className="paper section-block fine-policy">
        <div><h2>Kebijakan denda</h2><p>{dendaAktif ? "Denda berlaku untuk pembayaran baru." : "Denda sedang dinonaktifkan."}</p></div>
        <button className={`switch ${dendaAktif ? "switch-on" : ""}`} role="switch" aria-checked={dendaAktif} aria-label="Kebijakan denda" onClick={() => setKonfirmDenda(!dendaAktif)}><span /></button>
      </section>

      <section className="paper section-block">
        <h2>Bebaskan denda</h2>
        <p>Untuk satu tagihan yang belum lunas, misalnya karena izin atau sakit.</p>
        <form className="form-grid" onSubmit={(e) => {
          e.preventDefault();
          void lakukan(async () => { await bebaskanDenda(bebasTagihan, bebasAlasan); setBebasAlasan(""); setBebasTagihan(""); }, "Denda dibebaskan.");
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

      <section className="paper section-block">
        <h2>Unduh laporan</h2>
        <p>Berkas CSV untuk arsip atau dibuka di Sheets.</p>
        <div className="button-row">
          <Button kind="secondary" onClick={unduhPapan}>Unduh papan</Button>
          <Button kind="secondary" onClick={unduhTransaksi}>Unduh transaksi</Button>
        </div>
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
