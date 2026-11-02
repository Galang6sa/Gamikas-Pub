"use client";

import { useCallback, useState } from "react";
import type { Ctx } from "../tipe";

// Pembungkus aksi bendahara: menahan klik ganda, menampilkan galat, memuat ulang data, lalu memberi tahu hasilnya.
export function useAksi(ctx: Ctx, sesudah?: () => Promise<void> | void) {
  const [galat, setGalat] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const lakukan = useCallback(async (aksi: () => Promise<void>, sukses: string) => {
    setGalat("");
    setSibuk(true);
    try {
      await aksi();
      await ctx.muat();
      await sesudah?.();
      ctx.notify(sukses);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Aksi belum berhasil. Coba lagi.");
    } finally {
      setSibuk(false);
    }
  }, [ctx, sesudah]);
  return { galat, sibuk, lakukan };
}
