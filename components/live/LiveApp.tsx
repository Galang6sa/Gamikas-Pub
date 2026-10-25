"use client";

import { useCallback, useEffect, useState } from "react";
import { galat, keluar, muatSesi, type Sesi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Button, Icon } from "@/components/ui";
import Bayar from "./Bayar";
import Beranda from "./Beranda";
import GantiPin from "./GantiPin";
import Kas from "./Kas";
import Masuk from "./Masuk";
import MejaBendahara from "./MejaBendahara";
import PapanKelas from "./PapanKelas";
import Pengaturan, { type Tema } from "./Pengaturan";
import type { Ctx, Screen } from "./tipe";
import { useKelas } from "./useKelas";

const KUNCI_TEMA = "kaskelas-tema";
const KUNCI_BUNYI = "kaskelas-bunyi";

function simpan(kunci: string, nilai: string) {
  try {
    window.localStorage.setItem(kunci, nilai);
  } catch {
    /* penyimpanan boleh gagal */
  }
}

export default function LiveApp() {
  const [fase, setFase] = useState<"memuat" | "masuk" | "siap" | "galat">("memuat");
  const [sesi, setSesi] = useState<Sesi | null>(null);
  const [pesanGalat, setPesanGalat] = useState("");
  const [gantiPinTerbuka, setGantiPinTerbuka] = useState(false);
  const [toast, setToast] = useState("");
  const [tema, setTemaState] = useState<Tema>("perangkat");
  const [bunyi, setBunyiState] = useState(false);

  const sinkron = useCallback(async () => {
    try {
      const s = await muatSesi();
      setSesi(s);
      setPesanGalat("");
      setFase(s ? "siap" : "masuk");
    } catch (e) {
      setPesanGalat(galat(e).message);
      setFase("galat");
    }
  }, []);

  useEffect(() => {
    try {
      const t = window.localStorage.getItem(KUNCI_TEMA);
      if (t === "siang" || t === "malam" || t === "perangkat") setTemaState(t);
      setBunyiState(window.localStorage.getItem(KUNCI_BUNYI) === "1");
    } catch {
      /* abaikan */
    }
    void sinkron();
    const { data } = supabase().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setSesi(null);
        setFase("masuk");
      }
    });
    return () => data.subscription.unsubscribe();
  }, [sinkron]);

  useEffect(() => {
    if (tema === "perangkat") delete document.documentElement.dataset.tema;
    else document.documentElement.dataset.tema = tema;
  }, [tema]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function keluarAkun() {
    await keluar();
    setSesi(null);
    setGantiPinTerbuka(false);
    setFase("masuk");
  }

  if (fase === "memuat") return <main className="app app-auth"><div className="login-wrap"><p>Membuka KasKelas.</p></div></main>;

  if (fase === "galat") {
    return (
      <main className="app app-auth">
        <div className="login-wrap"><div className="login-paper">
          <h1>Belum bisa dibuka.</h1>
          <p role="alert">{pesanGalat}</p>
          <div className="button-row"><Button onClick={() => { setFase("memuat"); void sinkron(); }}>Coba lagi</Button><Button kind="secondary" onClick={() => void keluarAkun()}>Keluar</Button></div>
        </div></div>
      </main>
    );
  }

  if (fase === "masuk" || !sesi) return <main className="app app-auth"><Masuk onMasuk={sinkron} /></main>;

  if (sesi.harusGantiPin || gantiPinTerbuka) {
    return (
      <main className="app app-auth">
        <GantiPin nrp={sesi.nrp} wajib={sesi.harusGantiPin}
          onSelesai={async () => { setGantiPinTerbuka(false); await sinkron(); setToast("PIN diganti."); }}
          onBatal={() => setGantiPinTerbuka(false)} />
      </main>
    );
  }

  return (
    <Aplikasi sesi={sesi} tema={tema} bunyi={bunyi} toast={toast} notify={setToast}
      setTema={(t) => { setTemaState(t); simpan(KUNCI_TEMA, t); }}
      setBunyi={(b) => { setBunyiState(b); simpan(KUNCI_BUNYI, b ? "1" : "0"); }}
      bukaGantiPin={() => setGantiPinTerbuka(true)} keluarAkun={keluarAkun} />
  );
}

function Aplikasi({ sesi, tema, setTema, bunyi, setBunyi, bukaGantiPin, keluarAkun, toast, notify }: {
  sesi: Sesi; tema: Tema; setTema: (t: Tema) => void; bunyi: boolean; setBunyi: (b: boolean) => void;
  bukaGantiPin: () => void; keluarAkun: () => Promise<void>; toast: string; notify: (p: string) => void;
}) {
  const { data, muat } = useKelas(sesi);
  const [screen, setScreen] = useState<Screen>("beranda");
  const [bayarAwal, setBayarAwal] = useState<string | undefined>();
  const [sekarang, setSekarang] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setSekarang(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const ctx: Ctx = { sesi, kelas: data, muat, sekarang, notify, go: setScreen, bunyi };
  const bukaBayar = (id?: string) => { setBayarAwal(id); setScreen("bayar"); };

  const item: { screen: Screen; label: string; icon: string }[] = [
    { screen: "beranda", label: "Beranda", icon: "beranda" },
    ...(sesi.role === "siswa" ? [{ screen: "bayar" as Screen, label: "Bayar", icon: "bayar" }] : []),
    { screen: "papan", label: "Papan", icon: "papan" },
    { screen: "kas", label: "Kas", icon: "kas" },
    ...(sesi.role === "bendahara" ? [{ screen: "bendahara" as Screen, label: "Meja bendahara", icon: "bendahara" }] : []),
  ];

  const navigasi = (
    <nav className="navigation" aria-label="Navigasi utama">
      {item.map((n) => (
        <button key={n.screen} className={`nav-item ${screen === n.screen ? "active" : ""}`} aria-current={screen === n.screen ? "page" : undefined}
          onClick={() => (n.screen === "bayar" ? bukaBayar() : setScreen(n.screen))}>
          <Icon name={n.icon} filled={screen === n.screen} /><span>{n.label}</span>
        </button>
      ))}
      <button className={`nav-item nav-settings ${screen === "pengaturan" ? "active" : ""}`} onClick={() => setScreen("pengaturan")}>
        <Icon name="pengaturan" filled={screen === "pengaturan"} /><span>Pengaturan</span>
      </button>
    </nav>
  );

  const jam = data.diperbarui?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  const awalNama = (sesi.nama ?? "Bendahara").charAt(0).toUpperCase();

  let isi: React.ReactNode;
  if (data.status === "memuat") isi = <p className="empty-message" role="status">Membuka catatan kas kelas.</p>;
  else if (data.status === "galat") {
    isi = <div className="content-narrow"><div className="page-heading"><h1>Data belum bisa dibuka.</h1><p role="alert">{data.pesan}</p></div><Button onClick={() => void muat()}>Coba lagi</Button></div>;
  } else {
    isi = (
      <>
        {data.pesan && <p className="notice" role="status">Data terakhir diperbarui pukul {jam}. {data.pesan} <button className="text-button" onClick={() => void muat()}>Muat ulang</button></p>}
        {screen === "beranda" && <Beranda ctx={ctx} bukaBayar={bukaBayar} />}
        {screen === "bayar" && <Bayar ctx={ctx} awal={bayarAwal} />}
        {screen === "papan" && <><div className="page-heading"><p className="eyebrow">Buku absen pembayaran</p><h1>Papan kelas.</h1><p>Nama dan status pembayaran teman sekelas dalam satu pandangan.</p></div><PapanKelas ctx={ctx} /></>}
        {screen === "kas" && <Kas ctx={ctx} />}
        {screen === "bendahara" && sesi.role === "bendahara" && <MejaBendahara ctx={ctx} />}
        {screen === "pengaturan" && <Pengaturan sesi={sesi} tema={tema} setTema={setTema} bunyi={bunyi} setBunyi={setBunyi} bukaGantiPin={bukaGantiPin} keluar={() => void keluarAkun()} />}
      </>
    );
  }

  return (
    <main className="app">
      <header className="topbar">
        <a href="#" className="wordmark" onClick={(e) => { e.preventDefault(); setScreen("beranda"); }}><span className="brand-mark">K</span><span>KasKelas</span></a>
        <div className="topbar-right">
          <span className="sync-state"><span className="sync-dot" />{data.pesan && data.diperbarui ? "Data lama" : jam ? `Diperbarui ${jam}` : "Memuat"}</span>
          <button className="offline-toggle" onClick={() => void muat()}>Muat ulang</button>
          <button className="account-chip" onClick={() => setScreen("pengaturan")}><span className="avatar-mark">{awalNama}</span><span>{sesi.role === "siswa" ? (sesi.nama ?? "Siswa").split(" ")[0] : "Bendahara"}</span></button>
        </div>
      </header>
      <div className="app-shell">
        <aside className="desktop-rail">{navigasi}</aside>
        <div className="page-area" key={screen} aria-label={item.find((n) => n.screen === screen)?.label ?? "Pengaturan"}>{isi}</div>
      </div>
      <div className="mobile-navigation">{navigasi}</div>
      {toast && <div className="toast" role="status"><span>{toast}</span><button aria-label="Tutup pemberitahuan" onClick={() => notify("")}><Icon name="tutup" /></button></div>}
    </main>
  );
}
