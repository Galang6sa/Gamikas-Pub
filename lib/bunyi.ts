// Bunyi umpan balik. Dibuat dengan Web Audio, tanpa berkas audio.
// Penyebab bunyi tidak terdengar sebelumnya: konteks audio dibuat baru di setiap bunyi (diblokir browser bila bukan dari sentuhan
// langsung), tidak ada awalan "unlock" untuk iOS, dan volumenya terlalu kecil. Sekarang konteks dipakai ulang dan dibuka saat
// pengguna menyalakan bunyi.

export type JenisBunyi = "tap" | "sobek" | "cap" | "berhasil";

type KelasAudio = typeof AudioContext;
let konteks: AudioContext | null = null;
let derau: AudioBuffer | null = null;

function kelasAudio(): KelasAudio | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: KelasAudio }).webkitAudioContext;
}

function ambil(): AudioContext | null {
  const Kelas = kelasAudio();
  if (!Kelas) return null;
  konteks ??= new Kelas();
  if (konteks.state === "suspended") void konteks.resume();
  return konteks;
}

function bufferDerau(c: AudioContext): AudioBuffer {
  if (derau && derau.sampleRate === c.sampleRate) return derau;
  const panjang = Math.floor(c.sampleRate * 0.4);
  derau = c.createBuffer(1, panjang, c.sampleRate);
  const data = derau.getChannelData(0);
  for (let i = 0; i < panjang; i++) data[i] = Math.random() * 2 - 1;
  return derau;
}

function nada(c: AudioContext, mulai: number, dari: number, ke: number, durasi: number, volume: number, tipe: OscillatorType) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = tipe;
  osc.frequency.setValueAtTime(dari, mulai);
  osc.frequency.exponentialRampToValueAtTime(Math.max(ke, 1), mulai + durasi);
  gain.gain.setValueAtTime(volume, mulai);
  gain.gain.exponentialRampToValueAtTime(0.001, mulai + durasi);
  osc.connect(gain).connect(c.destination);
  osc.start(mulai);
  osc.stop(mulai + durasi + 0.02);
}

function desis(c: AudioContext, mulai: number, durasi: number, volume: number, tipe: BiquadFilterType, frekuensi: number) {
  const sumber = c.createBufferSource();
  const saring = c.createBiquadFilter();
  const gain = c.createGain();
  sumber.buffer = bufferDerau(c);
  saring.type = tipe;
  saring.frequency.setValueAtTime(frekuensi, mulai);
  gain.gain.setValueAtTime(volume, mulai);
  gain.gain.exponentialRampToValueAtTime(0.001, mulai + durasi);
  sumber.connect(saring).connect(gain).connect(c.destination);
  sumber.start(mulai);
  sumber.stop(mulai + durasi + 0.02);
}

// Panggil dari dalam sentuhan pengguna (misalnya saat menyalakan saklar bunyi) agar browser mengizinkan audio.
export function siapkanBunyi(): void {
  const c = ambil();
  if (!c) return;
  const sumber = c.createBufferSource();
  sumber.buffer = c.createBuffer(1, 1, c.sampleRate);
  sumber.connect(c.destination);
  sumber.start(0);
}

export function mainkan(jenis: JenisBunyi, aktif: boolean): void {
  if (!aktif) return;
  const c = ambil();
  if (!c) return;
  const t = c.currentTime + 0.005;
  switch (jenis) {
    case "tap":
      nada(c, t, 900, 560, 0.05, 0.22, "triangle");
      break;
    case "sobek":
      desis(c, t, 0.17, 0.5, "bandpass", 2200);
      nada(c, t, 320, 180, 0.08, 0.12, "sawtooth");
      break;
    case "cap":
      nada(c, t, 150, 50, 0.2, 0.7, "sine");
      desis(c, t, 0.07, 0.4, "lowpass", 900);
      break;
    case "berhasil":
      nada(c, t, 660, 660, 0.09, 0.22, "triangle");
      nada(c, t + 0.1, 880, 880, 0.16, 0.22, "triangle");
      break;
  }
}
