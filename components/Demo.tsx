"use client";

import {
  addDaysToDate,
  calculatePenalty,
  formatDateShort,
  formatRupiah,
  formatWeek,
  getCurrentWeekStart,
  getWeekRange,
  type InvoiceWeek,
} from "@/lib/domain";
import { Button, Icon, playFeedbackSound, StatusStamp } from "@/components/ui";
import { useEffect, useMemo, useState } from "react";

type Role = "siswa" | "bendahara";
type Screen =
  | "beranda"
  | "bayar"
  | "papan"
  | "kas"
  | "bendahara"
  | "pengaturan"
  | "masuk"
  | "ganti-pin";
type PaymentState = "lolos" | "cek" | "nominal" | "duplikat" | "merchant" | "jaringan";
type InvoiceStatus = "lunas" | "telat-lunas" | "tunai" | "menunggu" | "dibebaskan" | "libur" | "tertunggak" | "belum";
type Student = { nrp: string; name: string; number: number; paid: boolean };
type Expense = { name: string; category: string; amount: number; date: string };
type AppState = {
  role: Role;
  screen: Screen;
  theme: "siang" | "malam" | "perangkat";
  sound: boolean;
  notifications: boolean;
  finesEnabled: boolean;
  finesEnabledAt: number;
  date: string;
  selected: string[];
  proofName: string;
  paymentStep: "pilih" | "qris" | "unggah" | "hasil";
  paymentResult: PaymentState | null;
  boardMode: "denah" | "papan";
  boardMonth: string;
  pinChanged: boolean;
  pendingFineChange: boolean | null;
  demoStatus: "normal" | "memuat" | "kosong" | "galat" | "offline";
  unclaimedAssigned: boolean;
  paidWeeks: string[];
  pendingWeeks: string[];
  cashPayments: { nrp: string; amount: number; date: string; weekId: string }[];
  reviewedPayments: string[];
  reminders: Record<string, { status: "dibuka" | "terkirim"; updatedAt: number }>;
  expenses: Expense[];
  toast: string;
};

const STORAGE_KEY = "kaskelas-prototype-v1";
const INITIAL_DATE = "2026-10-23";
const studentNames = [
  "Alya", "Bagas", "Citra", "Damar", "Elin", "Farhan", "Rani", "Gita", "Hafiz", "Intan",
  "Jovan", "Kirana", "Luthfi", "Mira", "Naufal", "Olin", "Putra", "Qila", "Raka", "Salsa",
  "Tegar", "Uli", "Vino", "Wulan", "Xavier", "Yasmin", "Zidan", "Nara", "Bima",
];
const students: Student[] = studentNames.map((name, index) => ({
  nrp: String(101 + index),
  name,
  number: index + 1,
  paid: index !== 4 && index !== 6,
}));
const sampleReviewItems = [
  ["104", "Rp5.000", "Tanggal di bukti tidak terbaca."],
  ["118", "Rp10.000", "Ada dua transaksi dengan nominal sama."],
  ["121", "Rp5.000", "Bukti perlu dicocokkan dengan laporan."],
];

const initialState: AppState = {
  role: "siswa",
  screen: "beranda",
  theme: "perangkat",
  sound: false,
  notifications: false,
  finesEnabled: true,
  finesEnabledAt: 0,
  date: INITIAL_DATE,
  selected: ["2026-10-19"],
  proofName: "",
  paymentStep: "pilih",
  paymentResult: null,
  boardMode: "denah",
  boardMonth: "2026-10",
  pinChanged: false,
  pendingFineChange: null,
  demoStatus: "normal",
  unclaimedAssigned: false,
  paidWeeks: [],
  pendingWeeks: [],
  cashPayments: [],
  reviewedPayments: [],
  reminders: {},
  expenses: [
    { name: "Spidol papan tulis", category: "Alat kelas", amount: 12_000, date: "2026-10-21" },
    { name: "Fotokopi bahan belajar", category: "Fotokopi", amount: 18_500, date: "2026-10-19" },
    { name: "Kertas warna", category: "Alat kelas", amount: 9_000, date: "2026-10-15" },
  ],
  toast: "",
};

function createWeeks(date: string): InvoiceWeek[] {
  const latest = getCurrentWeekStart(date);
  return Array.from({ length: 17 }, (_, index) => {
    const start = addDaysToDate(latest, (index - 12) * 7);
    return getWeekRange(start);
  });
}

function getInvoiceStatus(start: string): InvoiceStatus {
  const samples: Record<string, InvoiceStatus> = {
    "2026-08-03": "lunas",
    "2026-08-10": "telat-lunas",
    "2026-08-17": "tunai",
    "2026-08-24": "lunas",
    "2026-08-31": "libur",
    "2026-09-07": "dibebaskan",
    "2026-09-14": "menunggu",
    "2026-09-21": "tunai",
    "2026-09-28": "tertunggak",
    "2026-10-05": "tertunggak",
    "2026-10-12": "tertunggak",
    "2026-10-19": "belum",
  };
  return samples[start] ?? (start > "2026-10-19" ? "belum" : "lunas");
}

function readSavedState(): Partial<AppState> {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Partial<AppState>) : {};
}

export default function Demo() {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Alat kelas");
  const [expenseDate, setExpenseDate] = useState(INITIAL_DATE);
  const [cashStudent, setCashStudent] = useState("107");
  const [cashAmount, setCashAmount] = useState("5000");
  const [cashDate, setCashDate] = useState(INITIAL_DATE);
  const [cashWeek, setCashWeek] = useState("2026-10-19");
  const [feedback, setFeedback] = useState("");
  const weeks = useMemo(() => createWeeks(state.date), [state.date]);
  const currentWeek = weeks.find((week) => week.start === getCurrentWeekStart(state.date)) ?? weeks[12];
  const me = students[6];
  const paidCount = students.filter((student) => student.paid).length + (state.paidWeeks.includes(currentWeek.id) ? 1 : 0);

  useEffect(() => {
    try {
      const saved = readSavedState();
      setState((current) => ({
        ...current,
        ...saved,
        paidWeeks: Array.isArray(saved.paidWeeks) ? saved.paidWeeks : current.paidWeeks,
        pendingWeeks: Array.isArray(saved.pendingWeeks) ? saved.pendingWeeks : current.pendingWeeks,
        cashPayments: Array.isArray(saved.cashPayments) ? saved.cashPayments : current.cashPayments,
        reviewedPayments: Array.isArray(saved.reviewedPayments) ? saved.reviewedPayments : current.reviewedPayments,
        reminders: saved.reminders && typeof saved.reminders === "object" ? saved.reminders : current.reminders,
        toast: "",
      }));
    } catch {
      setState((current) => ({ ...current, toast: "Data demo lama tidak dapat dibaca. Perubahan baru tidak dimuat." }));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, toast: "" }));
    document.documentElement.dataset.tema = state.theme;
  }, [state, ready]);

  useEffect(() => {
    if (!state.toast) return;
    const timer = window.setTimeout(() => patch({ toast: "" }), 4_500);
    return () => window.clearTimeout(timer);
  }, [state.toast]);

  function patch(changes: Partial<AppState>) {
    setState((current) => ({ ...current, ...changes }));
  }

  function personalStatus(week: InvoiceWeek): InvoiceStatus {
    if (state.paidWeeks.includes(week.id)) return "lunas";
    if (state.pendingWeeks.includes(week.id)) return "menunggu";
    return getInvoiceStatus(week.start);
  }

  function notify(message: string) {
    patch({ toast: message });
  }

  function go(screen: Screen) {
    patch({ screen, ...(screen === "papan" ? { boardMode: "papan" as const } : {}) });
    setFeedback("");
  }

  function assignUnclaimed(nrp: string) {
    const student = students.find((item) => item.nrp === nrp);
    if (!student) {
      notify("Siswa tidak ditemukan. Pilih nama dari daftar.");
      return;
    }
    patch({ unclaimedAssigned: true, toast: `Uang Rp10.000 dicatat atas NRP ${student.nrp}.` });
  }

  function openPayment(weekId?: string) {
    const payable = (id: string) => {
      const week = weeks.find((item) => item.id === id);
      return week !== undefined && ["tertunggak", "belum"].includes(personalStatus(week));
    };
    const picked = weekId && payable(weekId)
      ? [weekId]
      : state.selected.filter(payable).length
        ? state.selected.filter(payable)
        : [weeks.find((week) => payable(week.id))?.id ?? currentWeek.id];
    patch({ screen: "bayar", selected: picked, paymentStep: "pilih", paymentResult: null });
  }

  const total = state.selected.reduce((sum, id) => {
    const week = weeks.find((item) => item.id === id);
    if (!week) return sum + 5_000;
    return sum + calculatePenalty(week, new Date(`${state.date}T12:00:00+07:00`).getTime(), {
      enabled: state.finesEnabled,
      enabledAt: state.finesEnabledAt || undefined,
    }).total;
  }, 0);
  const unpaidWeeks = weeks.filter((week) => week.start < currentWeek.start && ["tertunggak", "belum"].includes(personalStatus(week))).slice(-2);
  const balance = 318_000 + state.cashPayments.reduce((sum, payment) => sum + payment.amount, 0) - state.expenses.reduce((sum, expense) => sum + expense.amount, 0);

  function toggleWeek(week: InvoiceWeek) {
    if (week.holiday || !["tertunggak", "belum"].includes(personalStatus(week))) return;
    playFeedbackSound("tear", state.sound);
    const selected = state.selected.includes(week.id)
      ? state.selected.filter((id) => id !== week.id)
      : [...state.selected, week.id];
    patch({ selected, paymentStep: "pilih" });
  }

  function finishPayment(result: PaymentState) {
    patch({
      paymentResult: result,
      paymentStep: "hasil",
      paidWeeks: result === "lolos" ? [...new Set([...state.paidWeeks, ...state.selected])] : state.paidWeeks,
      pendingWeeks: result === "cek" ? [...new Set([...state.pendingWeeks, ...state.selected])] : state.pendingWeeks,
    });
    if (result === "lolos") playFeedbackSound("stamp", state.sound);
    if (result === "lolos" && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(18);
    }
  }

  async function copyPaymentAmount() {
    try {
      await navigator.clipboard.writeText(formatRupiah(total));
      notify("Nominal disalin.");
    } catch {
      notify("Browser belum mengizinkan menyalin nominal.");
    }
  }

  function submitExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(expenseAmount);
    if (!expenseName.trim() || amount <= 0) {
      setFeedback("Isi nama pengeluaran dan nominal yang benar.");
      return;
    }
    setFeedback("");
    playFeedbackSound("tap", state.sound);
    patch({
      expenses: [{ name: expenseName.trim(), category: expenseCategory, amount, date: expenseDate }, ...state.expenses],
      toast: "Pengeluaran dicatat.",
    });
    setExpenseName("");
    setExpenseAmount("");
  }

  function recordCashPayment() {
    const amount = Number(cashAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedback("Isi nominal tunai yang benar.");
      return;
    }
    if (!cashDate) {
      setFeedback("Isi tanggal pembayaran tunai.");
      return;
    }
    const week = weeks.find((item) => item.id === cashWeek);
    if (!week) {
      setFeedback("Pilih minggu tagihan yang masih tersedia.");
      return;
    }
    const paidAt = new Date(`${cashDate}T23:59:59+07:00`).getTime();
    const amountDue = calculatePenalty(week, paidAt, {
      enabled: state.finesEnabled,
      enabledAt: state.finesEnabledAt || undefined,
    }).total;
    setFeedback("");
    playFeedbackSound("tap", state.sound);
    patch({
      cashPayments: [...state.cashPayments, { nrp: cashStudent, amount, date: cashDate, weekId: cashWeek }],
      paidWeeks: cashStudent === "107" && amount >= amountDue ? [...new Set([...state.paidWeeks, cashWeek])] : state.paidWeeks,
      toast: `Pembayaran tunai NRP ${cashStudent} dicatat.`,
    });
    setCashAmount("5000");
  }

  function renderNavigation() {
    const items: { screen: Screen; label: string; icon: string }[] = [
      { screen: "beranda", label: "Beranda", icon: "beranda" },
      { screen: "bayar", label: "Bayar", icon: "bayar" },
      { screen: "papan", label: "Papan", icon: "papan" },
      { screen: "kas", label: "Kas", icon: "kas" },
      ...(state.role === "bendahara" ? [{ screen: "bendahara" as Screen, label: "Meja bendahara", icon: "bendahara" }] : []),
    ];
    return (
      <nav className="navigation" aria-label="Navigasi utama">
        {items.map((item) => (
          <button key={item.screen} className={`nav-item ${state.screen === item.screen ? "active" : ""}`} onClick={() => item.screen === "bayar" ? openPayment() : go(item.screen)} aria-current={state.screen === item.screen ? "page" : undefined}>
            <Icon name={item.icon} filled={state.screen === item.screen} />
            <span>{item.label}</span>
          </button>
        ))}
        <button className={`nav-item nav-settings ${state.screen === "pengaturan" ? "active" : ""}`} onClick={() => go("pengaturan")}><Icon name="pengaturan" filled={state.screen === "pengaturan"} /><span>Pengaturan</span></button>
      </nav>
    );
  }

  function renderTicket(week: InvoiceWeek, isCurrent = false) {
    const invoiceStatus = personalStatus(week);
    const canSelect = ["tertunggak", "belum"].includes(invoiceStatus);
    const selected = canSelect && state.selected.includes(week.id);
    const isLate = invoiceStatus === "tertunggak";
    const penalty = calculatePenalty({ ...week, holiday: invoiceStatus === "libur" }, new Date(`${state.date}T12:00:00+07:00`).getTime(), {
      enabled: state.finesEnabled,
      enabledAt: state.finesEnabledAt || undefined,
    });
    const status: "lunas" | "cek" | "ditolak" | "libur" | "bebas" | "belum" =
      invoiceStatus === "lunas" || invoiceStatus === "telat-lunas" || invoiceStatus === "tunai" ? "lunas"
        : invoiceStatus === "menunggu" ? "cek"
          : invoiceStatus === "dibebaskan" ? "bebas"
            : invoiceStatus === "libur" ? "libur" : "belum";
    const detail = invoiceStatus === "telat-lunas"
      ? "Lunas. Denda keterlambatan sudah dibayar."
      : invoiceStatus === "tunai"
        ? "Lunas dengan pembayaran tunai."
        : invoiceStatus === "menunggu"
          ? "Bukti pembayaran menunggu cek."
          : invoiceStatus === "dibebaskan"
            ? "Dibebaskan bendahara."
            : invoiceStatus === "libur"
              ? "Minggu libur. Tidak ada tagihan."
              : isLate && state.finesEnabled
                ? `Telat ${penalty.weeksLate} minggu. Denda ${formatRupiah(penalty.penalty)}.`
                : "Jatuh tempo Minggu malam.";
    return (
      <article className={`ticket ${selected ? "ticket-selected" : ""} ${isLate ? "ticket-late" : ""}`} key={week.id}>
        <button className="ticket-select" aria-label={`${canSelect ? (selected ? "Hapus pilihan" : "Pilih") : "Status"} minggu ${formatWeek(week)}`} aria-pressed={selected} onClick={() => toggleWeek(week)} disabled={!canSelect}>
          <span className="ticket-info">
            <strong>{week.id === currentWeek.id ? "Minggu ini" : formatWeek(week)}</strong>
            <span>{detail}</span>
          </span>
          {selected && <span className="ticket-selection-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg></span>}
          <span className="ticket-coupon">
            <strong>{formatRupiah(penalty.total)}</strong>
            <StatusStamp status={status} />
          </span>
        </button>
      </article>
    );
  }

  function renderFloorplan() {
    return (
      <section className="paper section-block floorplan-block">
        <div className="section-heading">
          <div><h2>Denah bangku</h2><p>{paidCount} dari {students.length} sudah bayar minggu ini.</p></div>
          <div className="segmented" role="group" aria-label="Tampilan pembayaran">
            <button className={state.boardMode === "denah" ? "selected" : ""} onClick={() => patch({ boardMode: "denah" })}>Denah</button>
            <button className={state.boardMode === "papan" ? "selected" : ""} onClick={() => patch({ boardMode: "papan" })}>Papan</button>
          </div>
        </div>
        {state.boardMode === "denah" ? (
          <div className="floorplan" aria-label="Denah kelas, tekan bangku untuk melihat status">
            <div className="teacher-desk">Meja guru</div>
            <div className="desk-grid">
              {students.map((student) => {
                const paid = student.nrp === "107" ? personalStatus(currentWeek) === "lunas" : student.paid;
                return <button key={student.nrp} className={`desk ${paid ? "desk-paid" : "desk-unpaid"} ${student.nrp === "107" ? "desk-me" : ""}`} onClick={() => setSelectedStudent(student)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.getData("text/plain") === "uang-tanpa-pemilik") assignUnclaimed(student.nrp); }} aria-label={`Bangku ${student.number}, ${student.name}, ${paid ? "lunas" : "belum bayar"}`}>
                  <span>{student.number}</span>
                  {paid && <small>Lunas</small>}
                </button>;
              })}
            </div>
          </div>
        ) : renderBoard()}
      </section>
    );
  }

  function renderBoard() {
    const months = [...new Set(weeks.map((week) => week.start.slice(0, 7)))];
    const activeMonth = months.includes(state.boardMonth) ? state.boardMonth : currentWeek.start.slice(0, 7);
    const monthIndex = months.indexOf(activeMonth);
    const monthTitle = (month: string) => new Date(`${month}-01T12:00:00+07:00`).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
    const renderMonth = (month: string) => {
      const monthWeeks = weeks.filter((week) => week.start.slice(0, 7) === month);
      return (
        <div className="month-board" key={month}>
          <h3>{monthTitle(month)}</h3>
          <div className="board-scroll" role="region" aria-label={`Papan pembayaran ${monthTitle(month)}`} tabIndex={0}>
            <table className="payment-board">
              <thead><tr><th scope="col">Siswa</th>{monthWeeks.map((week) => <th scope="col" key={week.id}>{formatDateShort(week.start)}</th>)}<th scope="col">Tunggakan</th></tr></thead>
              <tbody>
                {[me, ...students.filter((student) => student.nrp !== me.nrp)].map((student) => (
                  <tr key={student.nrp} className={student.nrp === me.nrp ? "board-me" : ""}>
                    <th scope="row"><span className="student-number">{student.number}</span> {student.name}</th>
                    {monthWeeks.map((week, index) => <td key={week.id}><StatusStamp status={getInvoiceStatus(week.start) === "libur" ? "libur" : student.nrp === "107" ? (personalStatus(week) === "menunggu" ? "cek" : personalStatus(week) === "dibebaskan" ? "bebas" : ["lunas", "telat-lunas", "tunai"].includes(personalStatus(week)) ? "lunas" : "belum") : student.paid || (student.number + index) % 9 > 1 ? "lunas" : "belum"} /></td>)}
                    <td>{student.paid ? "Rp0" : "Rp10.000"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    };
    return (
      <>
        <div className="board-month-nav">
          <div className="month-control"><Button kind="secondary" onClick={() => patch({ boardMonth: months[monthIndex - 1] })} disabled={monthIndex <= 0} ariaLabel="Bulan sebelumnya">Sebelumnya</Button>{monthIndex <= 0 && <small>Tidak ada bulan sebelumnya.</small>}</div>
          <strong>{monthTitle(activeMonth)}</strong>
          <div className="month-control"><Button kind="secondary" onClick={() => patch({ boardMonth: months[monthIndex + 1] })} disabled={monthIndex >= months.length - 1} ariaLabel="Bulan berikutnya">Berikutnya</Button>{monthIndex >= months.length - 1 && <small>Ini bulan paling baru.</small>}</div>
        </div>
        <p className="board-hint">Gulir mendatar untuk melihat minggu dan nama lainnya.</p>
        <div className="board-month-grid">{[activeMonth, months[monthIndex + 1]].filter(Boolean).map(renderMonth)}</div>
      </>
    );
  }

  function renderHome() {
    const lateWeek = weeks.find((week) => week.start === "2026-10-05") ?? weeks[weeks.length - 2];
    const stampCount = 5;
    return (
      <>
        <div className="welcome-row">
          <div><p className="eyebrow">{todayLabel}</p><h1>Halo, {state.role === "siswa" ? "Rani" : "Bendahara"}.</h1><p>Catatan kas kelasmu, rapi di satu tempat.</p></div>
          <button className="account-chip" onClick={() => go("masuk")}><span className="avatar-mark">{state.role === "siswa" ? "R" : "B"}</span><span>{state.role === "siswa" ? "NRP 107" : "Akun bendahara"}</span></button>
        </div>
        {state.role === "siswa" && !state.finesEnabled && <p className="notice notice-blue home-fine-notice">Denda sedang dinonaktifkan. Kamu hanya membayar tagihan pokok.</p>}
        {state.role === "siswa" ? (
          <div className="home-layout">
            <div className="home-main">
              <section className="hero-ticket">
                <div className="hero-ticket-copy"><p className="eyebrow">Karcis minggu ini</p><h2>{personalStatus(currentWeek) === "lunas" ? "Lunas" : formatRupiah(calculatePenalty(currentWeek, new Date(`${state.date}T12:00:00+07:00`).getTime(), { enabled: state.finesEnabled }).total)}</h2><p>{personalStatus(currentWeek) === "lunas" ? "Pembayaran minggu ini sudah tercatat." : `Jatuh tempo Minggu, ${formatDateShort(currentWeek.end)} pukul 23.59.`}</p><Button onClick={() => personalStatus(currentWeek) === "lunas" ? go("papan") : openPayment(currentWeek.id)}>{personalStatus(currentWeek) === "lunas" ? "Lihat pembayaran" : "Bayar minggu ini"}</Button></div>
                <div className="hero-stamp">{personalStatus(currentWeek) === "lunas" ? "LUNAS" : <>BELUM<br />BAYAR</>}</div>
              </section>
              <section className="arrears-section">
                <div className="section-heading"><div><h2>Karcis tertunggak</h2><p>Pelan-pelan, pilih minggu yang ingin dibayar.</p></div><button className="text-button" onClick={() => openPayment(lateWeek.id)}>Lihat semua</button></div>
                <div className="ticket-stack">{unpaidWeeks.length ? unpaidWeeks.map((week) => renderTicket(week)) : <p className="empty-message">Tidak ada tunggakan yang perlu dibayar.</p>}</div>
              </section>
              {renderFloorplan()}
            </div>
            <aside className="home-side">
              <section className="paper streak-paper"><div className="stamp-stack" aria-label={`${stampCount} stempel`}>{Array.from({ length: stampCount }, (_, index) => <span key={index} style={{ "--stack-index": index } as React.CSSProperties}>Tepat</span>)}</div><h2>Tepat waktu {stampCount} minggu berturut-turut</h2><p>Setiap minggu lunas menambah satu stempel.</p></section>
              <section className="class-fund"><p>Saldo kas kelas</p><strong>{formatRupiah(balance)}</strong><button onClick={() => go("kas")}>Lihat catatan kas</button></section>
            </aside>
          </div>
        ) : renderTreasurerHome()}
      </>
    );
  }

  function renderTreasurerHome() {
    const reviewCount = sampleReviewItems.length - state.reviewedPayments.length;
    return (
      <div className="treasurer-home">
        <div className="summary-strip">
          <div><span>Perlu dicek</span><strong>{reviewCount} bukti</strong></div>
          <div><span>Uang tanpa pemilik</span><strong>{state.unclaimedAssigned ? "Rp0" : "Rp10.000"}</strong></div>
          <div><span>Kas tercatat</span><strong>{formatRupiah(balance)}</strong></div>
        </div>
        <section className="paper section-block"><div className="section-heading"><div><h2>Yang perlu dibereskan</h2><p>{reviewCount ? `${reviewCount} bukti menunggu keputusanmu.` : "Antrean pemeriksaan sudah kosong."}</p></div><Button kind="info" onClick={() => go("bendahara")}>Buka meja bendahara</Button></div>
          {sampleReviewItems.filter(([nrp]) => !state.reviewedPayments.includes(nrp)).slice(0, 2).map(([nrp, amount, note]) => <div className="queue-line" key={nrp}><StatusStamp status="cek" /><div><strong>NRP {nrp}, pembayaran {amount}</strong><span>{note}</span></div><Button kind="secondary" onClick={() => go("bendahara")}>Periksa</Button></div>)}
        </section>
        {renderFloorplan()}
      </div>
    );
  }

  function renderPay() {
    const resultText: Record<PaymentState, { title: string; body: string }> = {
      lolos: { title: "Tercatat. Bukti cocok.", body: `${formatRupiah(total)} dibayar ${formatDateShort(state.date)}. Bendahara akan mencocokkannya dengan laporan QRIS.` },
      cek: { title: "Bukti menunggu cek.", body: "Tanggal di bukti tidak terbaca. Bendahara akan mengeceknya." },
      nominal: { title: "Nominal belum cocok.", body: `Nominal di bukti Rp5.000, sedangkan pilihanmu ${formatRupiah(total)}. Ganti pilihan minggu atau unggah bukti lain.` },
      duplikat: { title: "Bukti ini pernah dipakai.", body: "Unggah bukti pembayaran yang baru." },
      merchant: { title: "Merchant tidak cocok.", body: "Pastikan pembayaran dikirim ke QRIS kas kelas, lalu coba lagi." },
      jaringan: { title: "Jaringan sedang bermasalah.", body: "Bukti belum terkirim. Periksa koneksi, lalu coba lagi." },
    };
    return (
      <div className="content-narrow">
        <div className="page-heading"><p className="eyebrow">Bayar kas kelas</p><h1>Pilih karcisnya.</h1><p>Pilih satu atau beberapa minggu. Totalnya ikut berubah.</p></div>
        {feedback && <p className="field-error" role="alert">{feedback}</p>}
        {state.paymentStep === "pilih" && <>
          <div className="ticket-list">{weeks.filter((week) => week.start >= "2026-10-05").map((week) => renderTicket(week, week.id === currentWeek.id))}</div>
          {!state.finesEnabled && <p className="notice notice-blue">Denda sedang dinonaktifkan. Kamu hanya membayar tagihan pokok.</p>}
          <div className="pay-total"><div><span>Total yang dibayar</span><strong>{formatRupiah(total)}</strong></div><div><Button onClick={() => patch({ paymentStep: "qris" })} disabled={!state.selected.length || state.demoStatus === "offline"}>Lanjut ke QRIS</Button>{state.demoStatus === "offline" ? <small className="disabled-reason">Sambungkan jaringan untuk melanjutkan.</small> : !state.selected.length && <small className="disabled-reason">Pilih minimal satu minggu.</small>}</div></div>
        </>}
        {state.paymentStep === "qris" && <section className="paper payment-step">
          <div className="step-label">Langkah satu. Bayar dengan QRIS.</div><h2>{formatRupiah(total)}</h2><p>Pindai QR contoh ini dari aplikasi pembayaranmu. QR ini tidak menerima uang sungguhan.</p>
          <div className="qris-code" role="img" aria-label="Contoh QRIS, bukan kode pembayaran aktif"><div className="qr-pattern">{Array.from({ length: 81 }, (_, i) => <i key={i} className={(i * 7 + i % 5) % 3 ? "dark" : ""} />)}</div><span>Contoh QRIS</span></div>
          <div className="button-row"><Button kind="secondary" onClick={copyPaymentAmount}>Salin nominal</Button><Button onClick={() => patch({ paymentStep: "unggah" })}>Saya sudah bayar</Button></div>
        </section>}
        {state.paymentStep === "unggah" && <section className="paper payment-step">
          <div className="step-label">Langkah dua. Unggah bukti.</div><h2>Bukti pembayaran</h2><p>Foto atau tangkapan layar dari aplikasi pembayaran. Ini simulasi, berkas tidak dikirim ke mana pun.</p>
          <label className="upload-zone"><Icon name="unggah" /><strong>{state.proofName || "Pilih gambar bukti"}</strong><span>PNG atau JPG. Maksimal 10 MB.</span><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 10 * 1024 * 1024) { setFeedback("Berkas lebih besar dari 10 MB. Pilih gambar yang lebih kecil."); event.target.value = ""; return; } setFeedback(""); patch({ proofName: file.name }); }} /></label>
          <div className="demo-results"><p>Simulasikan hasil pemeriksaan:</p>{(["lolos", "cek", "nominal", "duplikat", "merchant", "jaringan"] as PaymentState[]).map((result) => <button key={result} onClick={() => finishPayment(result)} disabled={state.demoStatus === "offline" && result !== "jaringan"}>{result === "lolos" ? "Lolos" : result === "cek" ? "Perlu dicek" : result === "nominal" ? "Nominal tak cocok" : result === "duplikat" ? "Bukti kembar" : result === "merchant" ? "Merchant salah" : "Galat jaringan"}</button>)}</div>
          <Button kind="secondary" onClick={() => patch({ paymentStep: "qris" })}>Kembali ke QRIS</Button>
        </section>}
        {state.paymentStep === "hasil" && state.paymentResult && <section className="paper result-panel" aria-live="polite">
          <div className={`result-stamp ${state.paymentResult === "lolos" ? "result-success" : "result-review"}`}>{state.paymentResult === "lolos" ? "LUNAS" : state.paymentResult === "jaringan" ? "GAGAL" : "DICEK"}</div>
          <h2>{resultText[state.paymentResult].title}</h2><p>{resultText[state.paymentResult].body}</p>
          {state.paymentResult === "jaringan" || state.paymentResult === "nominal" || state.paymentResult === "merchant" || state.paymentResult === "duplikat" ? <Button onClick={() => patch({ paymentStep: "unggah" })}>Coba lagi</Button> : <Button onClick={() => go("beranda")}>Kembali ke beranda</Button>}
        </section>}
      </div>
    );
  }

  function renderBoardScreen() {
    return <><div className="page-heading"><p className="eyebrow">Buku absen pembayaran</p><h1>Papan kelas.</h1><p>Nama dan status pembayaran teman sekelas dalam satu pandangan.</p></div>{renderFloorplan()}</>;
  }

  function renderLedger() {
    return (
      <>
        <div className="page-heading"><p className="eyebrow">Catatan terbuka untuk kelas</p><h1>Kas kelas.</h1><p>Pemasukan dan pengeluaran yang tercatat.</p></div>
        <section className="ledger-balance"><span>Saldo kas</span><strong>{formatRupiah(balance)}</strong><p>Data contoh per {formatDateShort(state.date)}.</p></section>
        <section className="paper ledger-section"><h2>Riwayat transaksi</h2><div className="ledger-date">Oktober 2026</div>
          <div className="ledger-row"><span className="ledger-mark income-mark">Masuk</span><div><strong>Iuran kas minggu ini</strong><small>29 siswa. QRIS dan tunai.</small></div><b>+ Rp145.000</b></div>
          <div className="ledger-row"><span className="ledger-mark income-mark">Masuk</span><div><strong>Pembayaran gabungan</strong><small>NRP 112. Kas dan denda.</small></div><b>+ Rp11.000</b></div>
          {state.cashPayments.map((payment, index) => <div className="ledger-row" key={`cash-${index}`}><span className="ledger-mark income-mark">Masuk</span><div><strong>Pembayaran tunai NRP {payment.nrp}</strong><small>{formatWeek(getWeekRange(payment.weekId))}. {formatDateShort(payment.date)}.</small></div><b>+ {formatRupiah(payment.amount)}</b></div>)}
          {state.expenses.map((expense, index) => <div className="ledger-row" key={`${expense.name}-${index}`}><span className="ledger-mark expense-mark">Keluar</span><div><strong>{expense.name}</strong><small>{expense.category}. {formatDateShort(expense.date)}.</small></div><b className="amount-out">− {formatRupiah(expense.amount)}</b></div>)}
          <div className="ledger-date">September 2026</div><div className="ledger-row"><span className="ledger-mark income-mark">Masuk</span><div><strong>Iuran kas minggu lalu</strong><small>27 siswa membayar.</small></div><b>+ Rp135.000</b></div>
          <div className="ledger-date">Agustus 2026</div><div className="ledger-row"><span className="ledger-mark income-mark">Masuk</span><div><strong>Pemasukan kas sebelumnya</strong><small>Catatan awal Agustus.</small></div><b>+ Rp27.000</b></div>
        </section>
      </>
    );
  }

  function renderTreasurer() {
    const reviewQueue = sampleReviewItems.filter(([nrp]) => !state.reviewedPayments.includes(nrp));
    return (
      <>
        <div className="page-heading"><p className="eyebrow">Ruang kerja bendahara</p><h1>Meja bendahara.</h1><p>Periksa yang belum jelas. Sisanya bisa menunggu.</p></div>
        <div className="treasurer-tabs"><button className="selected">Antrean cek <span>{reviewQueue.length}</span></button><button onClick={() => setFeedback("Pratinjau contoh CSV tampil di bawah.")}>Impor CSV</button><button onClick={() => setFeedback("Ada satu transaksi Rp10.000 belum punya pemilik.")}>Tanpa pemilik</button></div>
        {feedback && <p className="notice notice-blue" role="status">{feedback}</p>}
        <section className="paper section-block"><div className="section-heading"><div><h2>Antrean pemeriksaan</h2><p>Setiap keputusan masuk ke catatan aktivitas.</p></div><span className="count-seal">{reviewQueue.length}</span></div>
          {reviewQueue.length ? reviewQueue.map(([nrp, amount, note]) => <article className="review-slip" key={nrp}><div className="slip-top"><StatusStamp status="cek" /><span>NRP {nrp}</span></div><h3>Pembayaran {amount}</h3><p>{note}</p><div className="button-row"><Button kind="primary" onClick={() => patch({ reviewedPayments: [...state.reviewedPayments, nrp], toast: `Pembayaran NRP ${nrp} dikonfirmasi.` })}>Konfirmasi</Button><Button kind="secondary" onClick={() => patch({ reviewedPayments: [...state.reviewedPayments, nrp], toast: `Bukti NRP ${nrp} ditolak.` })}>Tolak bukti</Button></div></article>) : <p className="empty-message">Antrean pemeriksaan sudah kosong.</p>}
        </section>
        <section className="paper section-block"><div className="section-heading"><div><h2>Uang tanpa pemilik</h2><p>Transaksi masuk yang belum dikenali.</p></div><StatusStamp status="cek" /></div>{state.unclaimedAssigned ? <p className="empty-message">Transaksi contoh sudah diberi pemilik.</p> : <div className="unclaimed-row"><div><strong draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", "uang-tanpa-pemilik")} className="draggable-amount">Rp10.000</strong><span>19 Okt 2026 pukul 13.25 WIB. QRIS.</span><small className="drag-hint">Seret nominal ke bangku, atau pilih nama dari daftar.</small></div><label className="field-label">Pilih siswa<select value={cashStudent} onChange={(event) => setCashStudent(event.target.value)}>{students.map((student) => <option value={student.nrp} key={student.nrp}>NRP {student.nrp}, {student.name}</option>)}</select></label><Button kind="info" onClick={() => assignUnclaimed(cashStudent)}>Tetapkan pemilik</Button></div>}
          {!state.unclaimedAssigned && <div className="assignment-map"><p>Atau seret transaksi ke bangku yang sesuai.</p>{renderFloorplan()}</div>}
          <div className="csv-preview"><h3>Pratinjau impor CSV</h3><p>Data contoh. Belum ada berkas yang diunggah.</p><table><thead><tr><th>Waktu dibuat</th><th>Nominal</th><th>Status</th></tr></thead><tbody><tr><td>19 Okt 2026, 13.25</td><td>Rp10.000</td><td>Berhasil</td></tr><tr><td>19 Okt 2026, 13.12</td><td>Rp5.000</td><td>Berhasil</td></tr></tbody></table><Button kind="secondary" onClick={() => notify("Pratinjau contoh CSV selesai diperiksa.")}>Periksa pratinjau</Button></div>
        </section>
        <section className="paper section-block"><h2>Catat pembayaran tunai</h2><div className="form-grid"><label className="field-label">Siswa<select value={cashStudent} onChange={(event) => setCashStudent(event.target.value)}>{students.map((student) => <option key={student.nrp} value={student.nrp}>NRP {student.nrp}, {student.name}</option>)}</select></label><label className="field-label">Minggu tagihan<select value={cashWeek} onChange={(event) => setCashWeek(event.target.value)}>{weeks.filter((week) => week.start <= currentWeek.start).map((week) => <option key={week.id} value={week.id}>{formatWeek(week)}</option>)}</select></label><label className="field-label">Nominal<input type="number" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} min="1" /></label><label className="field-label">Tanggal bayar<input type="date" value={cashDate} onChange={(event) => setCashDate(event.target.value)} /></label></div><Button onClick={recordCashPayment}>Catat tunai</Button></section>
        <section className="paper section-block"><h2>Catat pengeluaran</h2><form className="form-grid" onSubmit={submitExpense}><label className="field-label">Keperluan<input value={expenseName} onChange={(event) => setExpenseName(event.target.value)} placeholder="Misalnya, spidol papan tulis" /></label><label className="field-label">Kategori<select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)}><option>Alat kelas</option><option>Fotokopi</option><option>Kebersihan</option><option>Kegiatan</option></select></label><label className="field-label">Nominal<input value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} inputMode="numeric" type="number" min="1" placeholder="12000" /></label><label className="field-label">Tanggal<input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} /></label><Button type="submit">Simpan pengeluaran</Button></form></section>
        <section className="paper section-block fine-policy"><div><h2>Kebijakan denda</h2><p>{state.finesEnabled ? "Denda berlaku untuk pembayaran baru." : "Denda sedang dinonaktifkan."}</p></div><button className={`switch ${state.finesEnabled ? "switch-on" : ""}`} role="switch" aria-checked={state.finesEnabled} aria-label="Kebijakan denda" onClick={() => patch({ pendingFineChange: !state.finesEnabled })}><span /></button><span className="fine-policy-hint">Tekan saklar untuk meninjau perubahan.</span></section>
        <section className="paper section-block"><h2>Pengingat kelas</h2><p>Pengingat hanya membuka WhatsApp. Bendahara tetap menandai pesan setelah dikirim.</p>{students.filter((student) => !student.paid).map((student) => {
          const reminder = state.reminders[student.nrp];
          const reminderText = reminder?.status === "terkirim" ? `Sudah diingatkan, ${formatDateShort(new Date(reminder.updatedAt).toISOString().slice(0, 10))}.` : reminder?.status === "dibuka" ? "WhatsApp dibuka. Pesan belum ditandai terkirim." : "Belum diingatkan minggu ini.";
          return <div className="reminder-row" key={student.nrp}><div><strong>{student.name}, NRP {student.nrp}</strong><span>{reminderText}</span></div><div className="reminder-actions"><a className="button button-secondary" href={`https://wa.me/?text=${encodeURIComponent(`Halo ${student.name}, kas kelas minggu ini Rp5.000. Silakan bayar sebelum Minggu malam.`)}`} onClick={(event) => { const previous = state.reminders[student.nrp]; if (previous?.status === "terkirim" && Date.now() - previous.updatedAt < 24 * 60 * 60 * 1000) { event.preventDefault(); notify("Pengingat sudah dicatat hari ini. Periksa sebelum mengirim ulang."); return; } patch({ reminders: { ...state.reminders, [student.nrp]: { status: "dibuka", updatedAt: Date.now() } } }); }} target="_blank" rel="noreferrer"><Icon name="wa" /> WhatsApp</a>{reminder?.status !== "terkirim" ? <Button kind="secondary" onClick={() => patch({ reminders: { ...state.reminders, [student.nrp]: { status: "terkirim", updatedAt: Date.now() } }, toast: `Pengingat ${student.name} ditandai terkirim.` })}>Tandai terkirim</Button> : null}</div></div>;
        })}</section>
      </>
    );
  }

  function renderSettings() {
    return <><div className="page-heading"><p className="eyebrow">Pilihanmu</p><h1>Pengaturan.</h1><p>Atur tampilan dan pengingat sesukamu.</p></div><section className="paper settings-list">
      <div className="setting-row"><div><strong>Tema</strong><p>Pilih suasana kertas kasmu.</p></div><select value={state.theme} onChange={(event) => patch({ theme: event.target.value as AppState["theme"] })}><option value="perangkat">Ikuti perangkat</option><option value="siang">Siang</option><option value="malam">Malam</option></select></div>
      <div className="setting-row"><div><strong>Bunyi</strong><p>Bunyi tekan dan stempel. Mati secara bawaan.</p></div><button className={`switch ${state.sound ? "switch-on" : ""}`} role="switch" aria-checked={state.sound} onClick={() => patch({ sound: !state.sound })}><span /></button></div>
      <div className="setting-row"><div><strong>Notifikasi</strong><p>Pengingat tagihan dan kabar kelas.</p></div><button className={`switch ${state.notifications ? "switch-on" : ""}`} role="switch" aria-checked={state.notifications} onClick={() => patch({ notifications: !state.notifications })}><span /></button></div>
      <div className="setting-row"><div><strong>PIN masuk</strong><p>Ganti PIN enam digit untuk akun ini.</p></div><Button kind="secondary" onClick={() => go("ganti-pin")}>Ganti PIN</Button></div>
    </section></>;
  }

  function renderDemoState() {
    if (state.demoStatus === "normal") return null;
    const messages = {
      memuat: ["Memuat data", "Kerangka kertas statis tampil saat catatan sedang dibaca."],
      kosong: ["Belum ada catatan", "Keadaan kosong mengajak pengguna melakukan langkah berikutnya."],
      galat: ["Data belum dapat dibuka", "Coba muat ulang. Pilihanmu tetap tersimpan di perangkat."],
      offline: ["Mode offline", `Data terakhir tersimpan per ${formatDateShort(state.date)}. Aksi unggah bukti dinonaktifkan.`],
    } as const;
    const [title, description] = messages[state.demoStatus];
    return <aside className={`demo-state demo-state-${state.demoStatus}`} role="status" aria-live="polite"><strong>{title}</strong><p>{description}</p></aside>;
  }

  function renderLogin() {
    return (
      <div className="login-wrap">
        <div className="login-paper">
          <div className="brand-mark">K</div>
          <h1>KasKelas.</h1>
          <p>Buku kas kelas yang dicap.</p>
          <form onSubmit={(event) => {
            event.preventDefault();
            patch({ screen: state.role === "siswa" && !state.pinChanged ? "ganti-pin" : "beranda" });
          }}>
            {state.role === "siswa" ? (
              <label className="field-label">NRP<input type="text" inputMode="numeric" minLength={3} maxLength={3} defaultValue="107" required /></label>
            ) : (
              <label className="field-label">Kata sandi bendahara<input type="password" autoComplete="current-password" minLength={12} required /></label>
            )}
            {state.role === "siswa" ? (
              <label className="field-label">PIN enam digit
                <span className="pin-entry">
                  <input type={pinVisible ? "text" : "password"} inputMode="numeric" minLength={6} maxLength={6} defaultValue="123456" required />
                  <button type="button" onClick={() => setPinVisible(!pinVisible)} aria-label={pinVisible ? "Sembunyikan PIN" : "Lihat PIN"}><Icon name="kunci" /></button>
                </span>
              </label>
            ) : null}
            <Button type="submit">Masuk</Button>
          </form>
          <div className="role-switch">
            <span>Masuk sebagai</span>
            <button className={state.role === "siswa" ? "selected" : ""} onClick={() => patch({ role: "siswa" })}>Siswa Rani</button>
            <button className={state.role === "bendahara" ? "selected" : ""} onClick={() => patch({ role: "bendahara" })}>Bendahara</button>
          </div>
          <p className="sample-note">Akun ini hanya contoh. Tidak ada data sungguhan.</p>
        </div>
      </div>
    );
  }

  function renderChangePin() {
    return <div className="content-narrow"><div className="page-heading"><p className="eyebrow">Keamanan akun</p><h1>Ganti PIN awal.</h1><p>Buat PIN enam digit yang mudah kamu ingat dan tidak dipakai di tempat lain.</p></div><form className="paper pin-form" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); if (values.get("newPin") !== values.get("confirmPin")) { setFeedback("PIN belum sama. Periksa kedua kolom, lalu coba lagi."); return; } patch({ pinChanged: true, screen: "beranda", toast: "PIN baru disimpan." }); }}><label className="field-label">PIN baru<input name="newPin" type="password" inputMode="numeric" minLength={6} maxLength={6} required /></label><label className="field-label">Ulangi PIN baru<input name="confirmPin" type="password" inputMode="numeric" minLength={6} maxLength={6} required /></label>{feedback && <p className="field-error" role="alert">{feedback}</p>}<Button type="submit">Simpan PIN</Button><Button kind="secondary" onClick={() => go("beranda")}>Kembali</Button></form></div>;
  }

  const screenTitle: Record<Screen, string> = { beranda: "Beranda", bayar: "Bayar", papan: "Papan", kas: "Kas", bendahara: "Meja bendahara", pengaturan: "Pengaturan", masuk: "Masuk", "ganti-pin": "Ganti PIN" };
  const todayLabel = new Date(`${state.date}T12:00:00+07:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const isFullScreen = state.screen === "masuk" || state.screen === "ganti-pin";
  return (
    <main className={isFullScreen ? "app app-auth" : "app"}>
      {isFullScreen ? state.screen === "masuk" ? renderLogin() : renderChangePin() : <>
        <header className="topbar"><a href="#" className="wordmark" onClick={(event) => { event.preventDefault(); go("beranda"); }}><span className="brand-mark">K</span><span>KasKelas</span></a><div className="topbar-right"><span className="sync-state"><span className="sync-dot" />Data contoh tersimpan</span><button className="offline-toggle" onClick={() => patch({ demoStatus: state.demoStatus === "offline" ? "normal" : "offline" })}>{state.demoStatus === "offline" ? "Sambungkan kembali" : "Mode offline"}</button><button className="account-chip" onClick={() => go("masuk")}><span className="avatar-mark">{state.role === "siswa" ? "R" : "B"}</span><span>{state.role === "siswa" ? "Rani" : "Bendahara"}</span></button></div></header>
        <div className="app-shell"><aside className="desktop-rail">{renderNavigation()}</aside><div className="page-area" key={state.screen} aria-label={screenTitle[state.screen]}>
          {renderDemoState()}
          {state.screen === "beranda" && renderHome()}
          {state.screen === "bayar" && renderPay()}
          {state.screen === "papan" && renderBoardScreen()}
          {state.screen === "kas" && renderLedger()}
          {state.screen === "bendahara" && renderTreasurer()}
          {state.screen === "pengaturan" && renderSettings()}
        </div></div>
        <div className="mobile-navigation">{renderNavigation()}</div>
        {process.env.NODE_ENV === "development" && state.role === "bendahara" && <details className="dev-panel"><summary>Panel pengembang</summary><div><label>Hari ini<input type="date" value={state.date} onChange={(event) => patch({ date: event.target.value })} /></label><label>Keadaan layar<select value={state.demoStatus} onChange={(event) => patch({ demoStatus: event.target.value as AppState["demoStatus"] })}><option value="normal">Normal</option><option value="memuat">Memuat</option><option value="kosong">Kosong</option><option value="galat">Galat</option><option value="offline">Offline</option></select></label><Button kind="secondary" onClick={() => patch({ date: addDaysToDate(state.date, 7) })}>Majukan satu minggu</Button><Button kind="secondary" onClick={() => patch({ date: INITIAL_DATE, finesEnabled: true, finesEnabledAt: 0, demoStatus: "normal" })}>Atur ulang demo</Button></div></details>}
        {state.toast && <div className="toast" role="status"><span>{state.toast}</span><button aria-label="Tutup pemberitahuan" onClick={() => patch({ toast: "" })}><Icon name="tutup" /></button></div>}
        {selectedStudent && <div className="sheet-backdrop" onClick={() => setSelectedStudent(null)}><section className="student-sheet" role="dialog" aria-modal="true" aria-labelledby="student-sheet-title" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" /><button className="sheet-close" aria-label="Tutup" onClick={() => setSelectedStudent(null)}><Icon name="tutup" /></button><p className="eyebrow">Bangku {selectedStudent.number}</p><h2 id="student-sheet-title">{selectedStudent.name}</h2><p>NRP {selectedStudent.nrp}. Status minggu ini: {(selectedStudent.nrp === "107" ? personalStatus(currentWeek) === "lunas" : selectedStudent.paid) ? "lunas." : "belum bayar."}</p><StatusStamp status={(selectedStudent.nrp === "107" ? personalStatus(currentWeek) === "lunas" : selectedStudent.paid) ? "lunas" : "belum"} /></section></div>}
        {state.pendingFineChange !== null && <div className="sheet-backdrop"><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="fine-dialog-title" aria-describedby="fine-dialog-description"><p className="eyebrow">Kebijakan untuk seluruh kelas</p><h2 id="fine-dialog-title">{state.pendingFineChange ? "Aktifkan denda?" : "Nonaktifkan denda?"}</h2><p id="fine-dialog-description">{state.pendingFineChange ? "Tagihan berikutnya kembali mengikuti aturan denda. Perubahan ini tidak berlaku surut." : "Pembayaran baru tidak dikenai denda. Denda yang sudah tercatat tidak berubah."}</p><div className="button-row"><Button kind="secondary" onClick={() => patch({ pendingFineChange: null })}>Kembali</Button><Button kind={state.pendingFineChange ? "primary" : "danger"} onClick={() => patch({ finesEnabled: state.pendingFineChange as boolean, finesEnabledAt: state.pendingFineChange ? new Date(`${state.date}T12:00:00+07:00`).getTime() : state.finesEnabledAt, pendingFineChange: null, toast: state.pendingFineChange ? "Denda diaktifkan." : "Denda dinonaktifkan." })}>{state.pendingFineChange ? "Aktifkan denda" : "Nonaktifkan denda"}</Button></div></section></div>}
      </>}
    </main>
  );
}
