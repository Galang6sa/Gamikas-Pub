"use client";

import { useCallback, useEffect, useState } from "react";
import { ambilDaftarNama, masukBendahara, masukSiswa } from "@/lib/api";
import { Button, Icon } from "@/components/ui";

const KUNCI_PERANGKAT = "kaskelas-perangkat"; // nama yang terakhir masuk di perangkat ini
const KUNCI_KODE = "kaskelas-kode";           // kode kelas, supaya tidak perlu diketik lagi
type Pilihan = { nrp: string; nama: string };

function baca(kunci: string): string | null {
  try {
    return window.localStorage.getItem(kunci);
  } catch {
    return null;
  }
}
function tulis(kunci: string, nilai: string | null) {
  try {
    if (nilai === null) window.localStorage.removeItem(kunci);
    else window.localStorage.setItem(kunci, nilai);
  } catch {
    /* penyimpanan boleh gagal, tidak memengaruhi masuk */
  }
}
function bacaPerangkat(): Pilihan | null {
  try {
    const p = JSON.parse(baca(KUNCI_PERANGKAT) ?? "null") as Partial<Pilihan> | null;
    return p?.nrp && p?.nama ? { nrp: p.nrp, nama: p.nama } : null;
  } catch {
    return null;
  }
}

// Bersihkan semua ingatan perangkat (dipakai tombol "Lupakan perangkat ini" di Pengaturan).
export function lupakanPerangkat() {
  tulis(KUNCI_PERANGKAT, null);
  tulis(KUNCI_KODE, null);
}

export default function Masuk({ mode, onMasuk }: { mode: "siswa" | "bendahara"; onMasuk: () => Promise<void> }) {
  const [langkah, setLangkah] = useState<"memuat" | "kode" | "nama" | "pin">(mode === "siswa" ? "memuat" : "kode");
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

  // Muat daftar nama dengan kode. Bila kode tersimpan sudah diganti bendahara, minta kode baru.
  const muatDaftar = useCallback(async (kodeCoba: string, otomatis: boolean) => {
    setGalat("");
    setLangkah(otomatis ? "memuat" : "kode");
    setSibuk(true);
    try {
      const hasil = await ambilDaftarNama(kodeCoba);
      tulis(KUNCI_KODE, kodeCoba.trim());
      setDaftar(hasil);
      setCari("");
      setLangkah("nama");
    } catch (e) {
      const pesan = e instanceof Error ? e.message : "Terjadi kesalahan. Coba lagi.";
      if (otomatis && pesan === "Kode kelas salah.") {
        tulis(KUNCI_KODE, null);
        setGalat("Kode kelas sudah diganti. Masukkan kode yang baru.");
      } else setGalat(pesan);
      setLangkah("kode");
    } finally {
      setSibuk(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== "siswa") return;
    const ingat = bacaPerangkat();
    if (ingat) {
      setPilih(ingat);
      setLangkah("pin");
      return;
    }
    const tersimpan = baca(KUNCI_KODE);
    if (tersimpan) void muatDaftar(tersimpan, true);
    else setLangkah("kode");
  }, [mode, muatDaftar]);

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

  const masuk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pilih) return;
    void jalankan(async () => {
      await masukSiswa(pilih.nrp, pin);
      tulis(KUNCI_PERANGKAT, JSON.stringify(pilih));
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

  function gantiNama() {
    tulis(KUNCI_PERANGKAT, null);
    setPilih(null);
    setPin("");
    setGalat("");
    const tersimpan = baca(KUNCI_KODE);
    if (tersimpan) void muatDaftar(tersimpan, true);
    else setLangkah("kode");
  }

  function gantiKode() {
    tulis(KUNCI_KODE, null);
    setKode("");
    setGalat("");
    setLangkah("kode");
  }

  const tersaring = daftar.filter((s) => s.nama.toLowerCase().includes(cari.trim().toLowerCase()));

  return (
    <div className="login-wrap">
      <div className="login-paper">
        <div className="brand-mark">K</div>
        <h1>{mode === "bendahara" ? "Masuk bendahara." : "KasKelas."}</h1>
        {mode === "siswa" && <p>Buku kas kelas yang dicap.</p>}

        {mode === "siswa" && langkah === "memuat" && <p role="status">Membuka daftar nama.</p>}

        {mode === "siswa" && langkah === "kode" && (
          <form onSubmit={(e) => { e.preventDefault(); void muatDaftar(kode, false); }}>
            <label className="field-label">Kode kelas
              <input value={kode} onChange={(e) => setKode(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} required />
            </label>
            <p className="field-hint">Minta kodenya ke bendahara. Cukup sekali di perangkat ini.</p>
            {galat && <p className="field-error" role="alert">{galat}</p>}
            <Button type="submit" disabled={sibuk || kode.trim().length < 3}>{sibuk ? "Memeriksa kode" : "Lanjut"}</Button>
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
            <button type="button" className="text-button" onClick={gantiKode}>Ganti kode kelas</button>
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
            <button type="button" className="text-button" onClick={gantiNama}>Bukan {pilih.nama}? Ganti nama</button>
          </form>
        )}

        {mode === "bendahara" && (
          <form onSubmit={masukSebagaiBendahara}>
            <label className="field-label">Email bendahara
              <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="field-label">Kata sandi
              <input type="password" autoComplete="current-password" value={kataSandi} onChange={(e) => setKataSandi(e.target.value)} required />
            </label>
            {galat && <p className="field-error" role="alert">{galat}</p>}
            <Button type="submit" disabled={sibuk}>{sibuk ? "Memeriksa" : "Masuk"}</Button>
            <a className="text-button" href="/">Halaman masuk siswa</a>
          </form>
        )}
      </div>
    </div>
  );
}
