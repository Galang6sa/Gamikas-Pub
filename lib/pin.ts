// Aturan PIN yang sama dengan skrip pembuat akun (buat_akun.mjs).
export function pinLemah(pin: string, nrp?: string | null): boolean {
  const d = [...pin].map(Number);
  if (new Set(d).size <= 2) return true;
  const naik = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  const turun = d.every((x, i) => i === 0 || x === d[i - 1] - 1);
  if (naik || turun) return true;
  if (nrp && (pin.startsWith(nrp) || pin.endsWith(nrp))) return true;
  return false;
}

export function periksaPinBaru(pin: string, ulang: string, nrp: string | null, pinLama?: string): string | null {
  if (!/^\d{6}$/.test(pin)) return "PIN harus 6 angka.";
  if (pin !== ulang) return "Kedua PIN belum sama. Ketik ulang.";
  if (pinLama && pin === pinLama) return "PIN baru harus berbeda dari PIN awal.";
  if (pinLemah(pin, nrp)) return "PIN terlalu mudah ditebak. Hindari angka berurutan, kembar, atau NRP.";
  return null;
}
