// Ekspor CSV di browser. Sel yang diawali = + - @ diberi petik agar tidak dibaca sebagai rumus oleh Excel atau Sheets.
export function keCsv(kepala: string[], baris: (string | number | null)[][]): string {
  const esc = (v: string | number | null) => {
    let t = v === null ? "" : String(v);
    if (/^[=+\-@]/.test(t) && typeof v === "string") t = `'${t}`;
    return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return "\uFEFF" + [kepala, ...baris].map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
}

export function unduhCsv(nama: string, isi: string): void {
  const url = URL.createObjectURL(new Blob([isi], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
