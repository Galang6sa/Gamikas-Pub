"use client";

import { useCallback, useEffect, useState } from "react";
import { muatAntrean, type KlaimAntrean } from "@/lib/api";
import Antrean from "./bendahara/Antrean";
import Atur from "./bendahara/Atur";
import Catat from "./bendahara/Catat";
import Laporan from "./bendahara/Laporan";
import Pengingat from "./bendahara/Pengingat";
import type { Ctx } from "./tipe";

type Tab = "antrean" | "catat" | "laporan" | "pengingat" | "atur";
const TAB: { kunci: Tab; label: string }[] = [
  { kunci: "antrean", label: "Antrean" }, { kunci: "catat", label: "Catat" }, { kunci: "laporan", label: "Laporan QRIS" },
  { kunci: "pengingat", label: "Pengingat" }, { kunci: "atur", label: "Atur" },
];

export default function MejaBendahara({ ctx }: { ctx: Ctx }) {
  const [tab, setTab] = useState<Tab>("antrean");
  const [klaim, setKlaim] = useState<KlaimAntrean[]>([]);
  const muatUlang = useCallback(async () => { setKlaim(await muatAntrean()); }, []);
  useEffect(() => { void muatUlang().catch(() => undefined); }, [muatUlang, ctx.kelas.diperbarui]);

  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Ruang kerja bendahara</p>
        <h1>Meja bendahara.</h1>
        <p>Setiap aksi tersimpan di catatan aktivitas.</p>
      </div>
      <div className="tab-bar" role="tablist" aria-label="Menu bendahara">
        {TAB.map((t) => (
          <button key={t.kunci} role="tab" id={`tab-${t.kunci}`} aria-selected={tab === t.kunci} aria-controls="panel-bendahara" onClick={() => setTab(t.kunci)}>
            {t.label}{t.kunci === "antrean" && klaim.length > 0 && <span className="count-seal">{klaim.length}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="panel-bendahara" aria-labelledby={`tab-${tab}`}>
        {tab === "antrean" && <Antrean ctx={ctx} klaim={klaim} muatUlang={muatUlang} />}
        {tab === "catat" && <Catat ctx={ctx} />}
        {tab === "laporan" && <Laporan ctx={ctx} />}
        {tab === "pengingat" && <Pengingat ctx={ctx} />}
        {tab === "atur" && <Atur ctx={ctx} />}
      </div>
    </>
  );
}
