"use client";

import { useEffect, useState } from "react";
import { ambilDaftarNama, masukBendahara, masukSiswa } from "@/lib/api";
import { Button, Icon } from "@/components/ui";

const KUNCI_PERANGKAT = "kaskelas-perangkat";
type Pilihan = { nrp: string; nama: string };

function bacaPerangkat(): Pilihan | null {
  try {
    const mentah = window.localStorage.getItem(KUNCI_PERANGKAT);
    const p = mentah ? (JSON.parse(mentah) as Partial<Pilihan>) : null;
    return p?.nrp && p?.nama ? { nrp: p.nrp, nama: p.nama } : null;
  } catch {
    return null;
  }
}

export default function Masuk({ onMasuk }: { onMasuk: () => Promise<void> }) {
  const [mode, setMode] = useState<"siswa" | "bendahara">("siswa");
  const [langkah, setLangkah] = useState<"kode" | "nama" | "pin">("kode");
  const [kode, setKode] = useState("");
  const [daftar, setDaftar] = useState<Pilihan[]>([]);
  const [cari, setCari] = useState("");
  const [pilih, setPilih] = useState<Pilihan | null>(null);
  const [pin, setPin] = useState("");
  const [lihat, setLihat] = useState(false);
  const [email, setEmail] = useState("");
  const [kataSandi, setKataSandi] = useState("");
  const [galat, setGalat] = useState("");
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    const ingat = bacaPerangkat();
    if (ingat) {
      setPilih(ingat);
      setLangkah("pin");
    }
  }, []);

  async function jalankan(aksi: () => Promise<void>) {
    setGalat("");
    setSibuk(true);
    try {
      await aksi();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Terjadi kesalahan. Coba lagi.");
    } finally {
      setSibuk(false);
    }
  }

  const lihatDaftar = (e: React.FormEvent) => {
    e.preventDefault();
    void jalankan(async () => {
      setDaftar(await ambilDaftarNama(kode));
      setCari("");
      setLangkah("nama");
    });
  };

  const masuk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pilih) return;
    void jalankan(async () => {
      await masukSiswa(pilih.nrp, pin);
      try {
        window.localStorage.setItem(KUNCI_PERANGKAT, JSON.stringify(pilih));
      } catch {
        /* penyimpanan boleh gagal, tidak memengaruhi login */
      }
      setPin("");
      await onMasuk();
    });
  };

  const masukSebagaiBendahara = (e: React.FormEvent) => {
    e.preventDefault();
    void jalankan(async () => {
      await masukBendahara(email, kataSandi);
      setKataSandi("");
      await onMasuk();
    });
  };

  function bukanAku() {
    try {
      window.localStorage.removeItem(KUNCI_PERANGKAT);
    } catch {
      /* abaikan */
    }
    setPilih(null);
    setPin("");
    setGalat("");
    setLangkah("kode");
  }

  const tersaring = daftar.filter((s) => s.nama.toLowerCase().includes(cari.trim().toLowerCase()));

  return (
    <div className="login-wrap">
      <div className="login-paper">
        <div className="brand-mark">K</div>
        <h1>KasKelas.</h1>
        <p>Buku kas kelas yang dicap.</p>

        {mode === "siswa" && langkah === "kode" && (
          <form onSubmit={lihatDaftar}>
            <label className="field-label">Kode kelas
              <input value={kode} onChange={(e) => setKode(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} required />
            </label>
            <p className="field-hint">Kode dibagikan bendahara lewat grup kelas. Cukup dimasukkan sekali di perangkat ini.</p>
            {galat && <p className="field-error" role="alert">{galat}</p>}
            <Button type="submit" disabled={sibuk || kode.trim().length < 3}>{sibuk ? "Memeriksa kode" : "Lihat daftar nama"}</Button>
          </form>
        )}

        {mode === "siswa" && langkah === "nama" && (
          <div>
            <label className="field-label">Cari namamu
              <input value={cari} onChange={(e) => setCari(e.target.value)} autoComplete="off" />
            </label>
            <ul className="name-grid">
              {tersaring.map((s) => (
                <li key={s.nrp}>
                  <button className="name-pick" onClick={() => { setPilih(s); setPin(""); setGalat(""); setLangkah("pin"); }}>
                    <strong>{s.nama}</strong>
                  </button>
                </li>
              ))}
            </ul>
            {!tersaring.length && <p className="empty-message">Tidak ada nama yang cocok. Coba ketik sebagian nama saja.</p>}
            <Button kind="secondary" onClick={() => setLangkah("kode")}>Kembali</Button>
          </div>
        )}

        {mode === "siswa" && langkah === "pin" && pilih && (
          <form onSubmit={masuk}>
            <p className="login-who">Masuk sebagai <strong>{pilih.nama}</strong></p>
            <label className="field-label">PIN enam digit
              <span className="pin-entry">
                <input type={lihat ? "text" : "password"} inputMode="numeric" autoComplete="current-password" pattern="[0-9]{6}" minLength={6} maxLength={6}
                  value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} required autoFocus />
                <button type="button" onClick={() => setLihat(!lihat)} aria-label={lihat ? "Sembunyikan PIN" : "Lihat PIN"}><Icon name="kunci" /></button>
              </span>
            </label>
            {galat && <p className="field-error" role="alert">{galat}</p>}
            <Button type="submit" disabled={sibuk || pin.length !== 6}>{sibuk ? "Memeriksa PIN" : "Masuk"}</Button>
            <button type="button" className="text-button" onClick={bukanAku}>Bukan {pilih.nama}? Ganti nama</button>
          </form>
        )}

        {mode === "bendahara" && (
          <form onSubmit={masukSebagaiBendahara}>
            <label className="field-label">Email bendahara
              <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="field-label">Kata sandi
              <input type="password" autoComplete="current-password" minLength={12} value={kataSandi} onChange={(e) => setKataSandi(e.target.value)} required />
            </label>
            {galat && <p className="field-error" role="alert">{galat}</p>}
            <Button type="submit" disabled={sibuk}>{sibuk ? "Memeriksa" : "Masuk sebagai bendahara"}</Button>
          </form>
        )}

        <div className="role-switch">
          <span>{mode === "siswa" ? "Kamu bendahara?" : "Kamu siswa?"}</span>
          <button className="text-button" onClick={() => { setMode(mode === "siswa" ? "bendahara" : "siswa"); setGalat(""); }}>
            {mode === "siswa" ? "Masuk di sini" : "Kembali ke masuk siswa"}
          </button>
        </div>
      </div>
    </div>
  );
}
