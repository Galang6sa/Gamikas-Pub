// Nama pendek untuk ruang sempit (papan di HP). Sapaan umum seperti Muhammad dilewati agar nama pembeda yang tampil.
const SAPAAN = new Set(["muhammad", "mohammad", "mochammad", "moh", "muh", "m"]);

export function namaSingkat(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter(Boolean);
  if (kata.length === 0) return "";
  const mulai = SAPAAN.has(kata[0].toLowerCase().replace(/\./g, "")) && kata.length > 1 ? 1 : 0;
  const depan = kata[mulai];
  const berikut = kata[mulai + 1];
  return berikut ? `${depan} ${berikut[0].toUpperCase()}.` : depan;
}
