"use client";

import { Button } from "@/components/ui";
import type { Sesi } from "@/lib/api";

export type Tema = "perangkat" | "siang" | "malam";

export default function Pengaturan({ sesi, tema, setTema, bunyi, setBunyi, bukaGantiPin, lupakan, keluar }: {
  sesi: Sesi; tema: Tema; setTema: (t: Tema) => void; bunyi: boolean; setBunyi: (b: boolean) => void;
  bukaGantiPin: () => void; lupakan: () => void; keluar: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Pilihanmu</p>
        <h1>Akun dan pengaturan.</h1>
        <p>{sesi.role === "siswa" ? `Masuk sebagai ${sesi.nama ?? "siswa"}, NRP ${sesi.nrp ?? ""}.` : "Masuk sebagai bendahara."}</p>
      </div>
      <section className="paper settings-list">
        <div className="setting-row">
          <div><strong>Tema</strong><p>Pilih suasana kertas kasmu.</p></div>
          <select value={tema} onChange={(e) => setTema(e.target.value as Tema)} aria-label="Tema">
            <option value="perangkat">Ikuti perangkat</option>
            <option value="siang">Siang</option>
            <option value="malam">Malam</option>
          </select>
        </div>
        <div className="setting-row">
          <div><strong>Bunyi</strong><p>Bunyi tekan dan stempel. Naikkan volume perangkat bila tidak terdengar.</p></div>
          <button className={`switch ${bunyi ? "switch-on" : ""}`} role="switch" aria-checked={bunyi} aria-label="Bunyi" onClick={() => setBunyi(!bunyi)}><span /></button>
        </div>
        {sesi.role === "siswa" && (
          <div className="setting-row">
            <div><strong>PIN masuk</strong><p>Ganti PIN enam digit untuk akun ini.</p></div>
            <Button kind="secondary" onClick={bukaGantiPin}>Ganti PIN</Button>
          </div>
        )}
        {sesi.role === "siswa" && (
          <div className="setting-row">
            <div><strong>Lupakan perangkat ini</strong><p>Hapus nama dan kode kelas yang diingat. Cocok untuk perangkat bersama.</p></div>
            <Button kind="secondary" onClick={lupakan}>Lupakan</Button>
          </div>
        )}
        <div className="setting-row">
          <div><strong>Keluar</strong><p>Akunmu keluar dari perangkat ini.</p></div>
          <Button kind="warning" onClick={keluar}>Keluar</Button>
        </div>
      </section>
    </>
  );
}
