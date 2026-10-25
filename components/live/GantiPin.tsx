"use client";

import { useState } from "react";
import { gantiPin } from "@/lib/api";
import { periksaPinBaru } from "@/lib/pin";
import { Button } from "@/components/ui";

export default function GantiPin({ nrp, wajib, onSelesai, onBatal }: {
  nrp: string | null; wajib: boolean; onSelesai: () => Promise<void>; onBatal: () => void;
}) {
  const [pin, setPin] = useState("");
  const [ulang, setUlang] = useState("");
  const [galat, setGalat] = useState("");
  const [sibuk, setSibuk] = useState(false);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    const masalah = periksaPinBaru(pin, ulang, nrp);
    if (masalah) return setGalat(masalah);
    setGalat("");
    setSibuk(true);
    try {
      await gantiPin(pin);
      await onSelesai();
    } catch (err) {
      setGalat(err instanceof Error ? err.message : "PIN belum bisa diganti. Coba lagi.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="content-narrow">
      <div className="page-heading">
        <p className="eyebrow">Keamanan akun</p>
        <h1>{wajib ? "Ganti PIN awal." : "Ganti PIN."}</h1>
        <p>Buat PIN enam digit yang mudah kamu ingat dan tidak dipakai di tempat lain.</p>
      </div>
      <form className="paper pin-form" onSubmit={kirim}>
        <label className="field-label">PIN baru
          <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} required />
        </label>
        <label className="field-label">Ketik ulang PIN baru
          <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={ulang} onChange={(e) => setUlang(e.target.value.replace(/\D/g, ""))} required />
        </label>
        {galat && <p className="field-error" role="alert">{galat}</p>}
        <div className="button-row">
          <Button type="submit" disabled={sibuk}>{sibuk ? "Menyimpan PIN" : "Simpan PIN"}</Button>
          {!wajib && <Button kind="secondary" onClick={onBatal}>Batal</Button>}
        </div>
      </form>
    </div>
  );
}
