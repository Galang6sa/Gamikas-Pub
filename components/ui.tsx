"use client";

import type { ReactNode } from "react";

export function playFeedbackSound(kind: "tap" | "tear" | "stamp", enabled: boolean) {
  if (!enabled || typeof window === "undefined" || !window.AudioContext) return;
  const context = new window.AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const settings = {
    tap: { frequency: 520, duration: 0.045 },
    tear: { frequency: 260, duration: 0.09 },
    stamp: { frequency: 150, duration: 0.14 },
  }[kind];
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(settings.frequency, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(settings.frequency * 0.68, context.currentTime + settings.duration);
  gain.gain.setValueAtTime(0.035, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + settings.duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + settings.duration);
  oscillator.addEventListener("ended", () => void context.close(), { once: true });
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

export function StatusStamp({ status }: { status: "lunas" | "cek" | "ditolak" | "libur" | "bebas" | "belum" }) {
  const labels = { lunas: "Lunas", cek: "Perlu dicek", ditolak: "Ditolak", libur: "Libur", bebas: "Dibebaskan", belum: "Belum bayar" };
  const stampText = { lunas: "LUNAS", cek: "DICEK", ditolak: "DITOLAK", libur: "LIBUR", bebas: "BEBAS", belum: "BELUM" };
  return (
    <span className={`stamp stamp-${status}`} role="img" aria-label={labels[status]}>
      <svg className="stamp-graphic" viewBox="0 0 120 40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {status === "lunas" && <><circle cx="60" cy="20" r="17" /><circle cx="60" cy="20" r="13" /></>}
        {status === "cek" && <path d="M12 3h96l9 8v18l-9 8H12l-9-8V11z" />}
        {status === "ditolak" && <><rect x="7" y="5" width="106" height="30" rx="2" /><path d="m10 32 100-24" /></>}
        {status === "libur" && <rect x="8" y="5" width="104" height="30" strokeDasharray="3 4" />}
        {status === "bebas" && <ellipse cx="60" cy="20" rx="52" ry="15" />}
        {status === "belum" && <rect x="8" y="5" width="104" height="30" strokeDasharray="5 5" />}
        <text x="60" y="20" fill="currentColor" stroke="none" textAnchor="middle" dominantBaseline="middle">{stampText[status]}</text>
      </svg>
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
