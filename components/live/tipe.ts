import type { Sesi } from "@/lib/api";
import type { DataKelas } from "./useKelas";

export type Screen = "beranda" | "bayar" | "papan" | "kas" | "bendahara" | "pengaturan";

export type Ctx = {
  sesi: Sesi;
  kelas: DataKelas;
  muat: () => Promise<void>;
  sekarang: Date;
  notify: (pesan: string) => void;
  go: (screen: Screen) => void;
  bunyi: boolean;
};
