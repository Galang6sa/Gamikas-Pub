"use client";

import type { ReactNode } from "react";
import { mainkan } from "@/lib/bunyi";

export function playFeedbackSound(kind: "tap" | "tear" | "stamp", enabled: boolean) {
  mainkan(kind === "tear" ? "sobek" : kind === "stamp" ? "cap" : "tap", enabled);
}

export function Icon({ name, filled = false }: { name: string; filled?: boolean }) {
  const common = {
    fill: filled ? "currentColor" : "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths: Record<string, ReactNode> = {
    beranda: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></>,
    bayar: <><path d="M4 6h16M4 10h16M4 14h10M4 18h8" /><path d="m17 16 2 2 3-4" /></>,
    papan: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11M15 9v11" /></>,
    kas: <><path d="M4 6h16v14H4zM7 6V4h10v2" /><path d="M8 11h8M8 15h4" /></>,
    bendahara: <><path d="M3 10h18M5 10V6l7-3 7 3v4M5 10v9h14v-9" /><path d="M9 19v-5h6v5" /></>,
    pengaturan: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.5 2.6-1.7-.6a8 8 0 0 1-1.4.8l-.3 1.8h-3l-.3-1.8a8 8 0 0 1-1.4-.8l-1.7.6-1.5-2.6L7.5 15a8 8 0 0 1 0-1.7L6.1 12l1.5-2.6 1.7.6a8 8 0 0 1 1.4-.8l.3-1.8h3l.3 1.8a8 8 0 0 1 1.4.8l1.7-.6 1.5 2.6-1.4 1.2a8 8 0 0 1-.1 1.8z" /></>,
    unggah: <><path d="M12 16V4m-4 4 4-4 4 4" /><path d="M4 15v5h16v-5" /></>,
    jam: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    tutup: <><path d="m6 6 12 12M18 6 6 18" /></>,
    kamera: <><path d="M4 8h4l2-3h4l2 3h4v11H4z" /><circle cx="12" cy="13" r="3" /></>,
    kunci: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    wa: <><path d="M4 19 5.5 15A8 8 0 1 1 9 18.5z" /><path d="M9 9c.5 2 2 3.5 4 4l1-1 2 1c-.3 2-2 2-3 2-3-1-5-3-6-6 0-1 .5-2 2-2l1 2z" /></>,
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" {...common}>
      {paths[name] ?? paths.kas}
    </svg>
  );
}

export type StampStatus = "lunas" | "cek" | "tinjau" | "ditolak" | "libur" | "bebas" | "belum";

const LABEL_STEMPEL: Record<StampStatus, string> = {
  lunas: "Lunas", cek: "Perlu dicek", tinjau: "Perlu ditinjau", ditolak: "Ditolak", libur: "Libur", bebas: "Dibebaskan", belum: "Belum bayar",
};
const TEKS_STEMPEL: Record<StampStatus, string> = {
  lunas: "LUNAS", cek: "DICEK", tinjau: "TINJAU", ditolak: "DITOLAK", libur: "LIBUR", bebas: "BEBAS", belum: "BELUM",
};

// Teks stempel adalah teks sungguhan (bukan gambar yang diperkecil), jadi ukurannya mengikuti pengaturan pengguna dan terbaca.
export function StatusStamp({ status, compact = false }: { status: StampStatus; compact?: boolean }) {
  return (
    <span className={`stamp stamp-${status} ${compact ? "stamp-compact" : ""}`} role="img" aria-label={LABEL_STEMPEL[status]}>
      <span aria-hidden="true">{TEKS_STEMPEL[status]}</span>
    </span>
  );
}

export function Button({
  children,
  kind = "primary",
  onClick,
  disabled = false,
  className = "",
  type = "button",
  ariaLabel,
}: {
  children: ReactNode;
  kind?: "primary" | "secondary" | "info" | "warning" | "danger";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
  ariaLabel?: string;
}) {
  return <button className={`button button-${kind} ${className}`} onClick={onClick} disabled={disabled} type={type} aria-label={ariaLabel}>{children}</button>;
}
