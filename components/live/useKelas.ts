"use client";

import { useCallback, useEffect, useState } from "react";
import {
  galat, muatKonfigurasi, muatPapan, muatPembayaran, muatPengeluaran, muatRingkasan, muatSaldo, muatTanpaPemilik,
  type GopayTanpaPemilik, type Konfigurasi, type PembayaranPublik, type Pengeluaran, type Saldo, type Sesi,
} from "@/lib/api";
import type { PapanRow, Ringkasan } from "@/lib/papan";

export type DataKelas = {
  status: "memuat" | "siap" | "galat";
  pesan: string; // galat terakhir; bila status "siap" berarti data lama masih ditampilkan
  diperbarui: Date | null;
  papan: PapanRow[];
  ringkasan: Ringkasan[];
  saldo: Saldo | null;
  konfigurasi: Konfigurasi | null;
  pengeluaran: Pengeluaran[];
  pembayaran: PembayaranPublik[];
  tanpaPemilik: GopayTanpaPemilik[];
};

const awal: DataKelas = {
  status: "memuat", pesan: "", diperbarui: null, papan: [], ringkasan: [], saldo: null, konfigurasi: null,
  pengeluaran: [], pembayaran: [], tanpaPemilik: [],
};

export function useKelas(sesi: Sesi) {
  const [data, setData] = useState<DataKelas>(awal);

  const muat = useCallback(async () => {
    try {
      const [papan, saldo, konfigurasi, pengeluaran, pembayaran, ringkasan, tanpaPemilik] = await Promise.all([
        muatPapan(), muatSaldo(), muatKonfigurasi(), muatPengeluaran(), muatPembayaran(),
        sesi.role === "siswa" ? muatRingkasan() : Promise.resolve([] as Ringkasan[]),
        sesi.role === "bendahara" ? muatTanpaPemilik() : Promise.resolve([] as GopayTanpaPemilik[]),
      ]);
      setData({ status: "siap", pesan: "", diperbarui: new Date(), papan, ringkasan, saldo, konfigurasi, pengeluaran, pembayaran, tanpaPemilik });
    } catch (e) {
      setData((d) => ({ ...d, status: d.diperbarui ? "siap" : "galat", pesan: galat(e).message }));
    }
  }, [sesi.role]);

  useEffect(() => {
    void muat();
  }, [muat]);

  return { data, muat };
}
