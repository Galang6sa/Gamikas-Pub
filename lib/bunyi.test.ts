import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class Param { setValueAtTime = vi.fn(); exponentialRampToValueAtTime = vi.fn(); }
const dibuat: FakeKonteks[] = [];
class FakeKonteks {
  state: "suspended" | "running" = "suspended";
  currentTime = 1;
  sampleRate = 8000;
  destination = {};
  resume = vi.fn(() => { this.state = "running"; return Promise.resolve(); });
  osc = 0; buf = 0;
  constructor() { dibuat.push(this); }
  createOscillator() { this.osc++; return { type: "", frequency: new Param(), connect: (x: unknown) => x, start: vi.fn(), stop: vi.fn() }; }
  createGain() { return { gain: new Param(), connect: (x: unknown) => x }; }
  createBiquadFilter() { return { type: "", frequency: new Param(), connect: (x: unknown) => x }; }
  createBuffer(_k: number, panjang: number) { return { sampleRate: this.sampleRate, getChannelData: () => new Float32Array(panjang) }; }
  createBufferSource() { this.buf++; return { buffer: null, connect: (x: unknown) => x, start: vi.fn(), stop: vi.fn() }; }
}

beforeEach(() => { vi.resetModules(); dibuat.length = 0; vi.stubGlobal("window", { AudioContext: FakeKonteks }); });
afterEach(() => vi.unstubAllGlobals());

describe("bunyi", () => {
  it("tidak membuat apa pun saat dimatikan", async () => {
    const { mainkan } = await import("./bunyi");
    mainkan("cap", false);
    expect(dibuat).toHaveLength(0);
  });
  it("memakai ulang satu konteks dan membukanya bila tertahan browser", async () => {
    const { mainkan } = await import("./bunyi");
    mainkan("tap", true);
    mainkan("sobek", true);
    mainkan("cap", true);
    mainkan("berhasil", true);
    expect(dibuat).toHaveLength(1);
    expect(dibuat[0].resume).toHaveBeenCalledTimes(1); // hanya sekali, lalu running
    expect(dibuat[0].osc).toBe(5); // tap 1, sobek 1, cap 1, berhasil 2
    expect(dibuat[0].buf).toBe(2); // sobek dan cap memakai derau
  });
  it("siapkanBunyi membuka konteks lewat sentuhan pengguna", async () => {
    const { siapkanBunyi } = await import("./bunyi");
    siapkanBunyi();
    expect(dibuat).toHaveLength(1);
    expect(dibuat[0].state).toBe("running");
  });
  it("mendukung Safari lama (webkitAudioContext) dan tidak gagal bila audio tidak ada", async () => {
    vi.stubGlobal("window", { webkitAudioContext: FakeKonteks });
    let { mainkan } = await import("./bunyi");
    mainkan("tap", true);
    expect(dibuat).toHaveLength(1);
    vi.resetModules();
    vi.stubGlobal("window", {});
    ({ mainkan } = await import("./bunyi"));
    expect(() => mainkan("tap", true)).not.toThrow();
  });
});
