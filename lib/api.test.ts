import { describe, expect, it, vi } from "vitest";

const semuaBaris = Array.from({ length: 2500 }, (_, i) => ({ tagihan_id: `t${i}` }));
const panggilan: [number, number][] = [];

vi.mock("@/lib/supabase", () => ({
  emailSiswa: (nrp: string) => `${nrp}@contoh`,
  supabase: () => ({
    from: () => {
      const q = {
        select: () => q,
        order: () => q,
        range: (dari: number, sampai: number) => {
          panggilan.push([dari, sampai]);
          return Promise.resolve({ data: semuaBaris.slice(dari, sampai + 1), error: null });
        },
      };
      return q;
    },
  }),
}));

import { muatPapan } from "./api";

describe("muatPapan", () => {
  it("mengambil semua halaman agar data lebih dari 1000 baris tidak terpotong", async () => {
    const hasil = await muatPapan();
    expect(hasil).toHaveLength(2500);
    expect(panggilan).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });
});
