"use client";

import { useMemo, useState } from "react";
import { catatPembayaran, tambahPengeluaran } from "@/lib/api";
import { Button } from "@/components/ui";
import { susunMatriks, tanggalWib } from "@/lib/papan";
import type { Ctx } from "../tipe";
import { useAksi } from "./aksi";

const KATEGORI = ["Alat kelas", "Fotokopi", "Kebersihan", "Kegiatan", "Lainnya"];
const waktuLokalWib = (d: Date) => d.toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" }).replace(" ", "T").slice(0, 16);

export default function Catat({ ctx }: { ctx: Ctx }) {
  const m = useMemo(() => susunMatriks(ctx.kelas.papan), [ctx.kelas.papan]);
  const { galat, sibuk, lakukan } = useAksi(ctx);
  const [nrp, setNrp] = useState("");
  const [metode, setMetode] = useState<"cash" | "qris">("cash");
  const [waktu, setWaktu] = useState(() => waktuLokalWib(ctx.sekarang));
  const [jumlah, setJumlah] = useState("1");
  const [tgl, setTgl] = useState(() => tanggalWib(ctx.sekarang));
  const [kategori, setKategori] = useState(KATEGORI[0]);
  const [ket, setKet] = useState("");
  const [nominal, setNominal] = useState("");

  return (
    <>
      {galat && <p className="field-error" role="alert">{galat}</p>}
      <section className="paper section-block">
        <div className="section-heading"><div><h2>Catat pembayaran</h2><p>Untuk tunai. Melunasi tagihan terlama siswa itu.</p></div></div>
        <form className="form-grid" onSubmit={(e) => {
          e.preventDefault();
          void lakukan(() => catatPembayaran({ nrp, metode, waktuIso: `${waktu}:00+07:00`, jumlahMinggu: Number(jumlah) }), "Pembayaran dicatat.");
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
        <h2>Catat pengeluaran</h2>
        <form className="form-grid" onSubmit={(e) => {
          e.preventDefault();
          void lakukan(async () => { await tambahPengeluaran({ tanggal: tgl, nominal: Number(nominal), kategori, keterangan: ket.trim() }); setKet(""); setNominal(""); }, "Pengeluaran dicatat.");
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
    </>
  );
}
