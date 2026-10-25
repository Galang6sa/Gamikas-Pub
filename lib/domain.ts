export const PRINCIPAL = 5_000;
export const DAY_MS = 24 * 60 * 60 * 1_000;
export const WEEK_MS = 7 * DAY_MS;

export type InvoiceWeek = {
  id: string;
  start: string;
  end: string;
  dueAt: number;
  holiday?: boolean;
};

export type PenaltyOptions = {
  enabled: boolean;
  enabledAt?: number;
  principal?: number;
  initialRate?: number;
  weeklyIncrease?: number;
  cap?: number;
};

export type PenaltyResult = {
  weeksLate: number;
  penalty: number;
  total: number;
};

export function calculatePenalty(
  invoice: InvoiceWeek,
  paidAt: number,
  options: PenaltyOptions,
): PenaltyResult {
  const principal = options.principal ?? PRINCIPAL;
  if (!options.enabled || invoice.holiday) {
    return { weeksLate: 0, penalty: 0, total: principal };
  }

  const penaltyStart = Math.max(invoice.dueAt, options.enabledAt ?? invoice.dueAt);
  const elapsed = paidAt - penaltyStart;
  const weeksLate = elapsed <= 0 ? 0 : Math.ceil(elapsed / WEEK_MS);
  if (weeksLate === 0) return { weeksLate, penalty: 0, total: principal };

  const rate =
    (options.initialRate ?? 0.2) +
    (options.weeklyIncrease ?? 0.1) * Math.max(0, weeksLate - 1);
  const rawPenalty = Math.round((principal * rate) / 50) * 50;
  const penalty =
    options.cap === undefined ? rawPenalty : Math.min(rawPenalty, options.cap);

  return { weeksLate, penalty, total: principal + penalty };
}

export function formatRupiah(value: number): string {
  return `Rp${Math.round(value).toLocaleString("id-ID")}`;
}

export function getWeekRange(start: string): InvoiceWeek {
  const startDate = new Date(`${start}T00:00:00+07:00`);
  const dueAt = startDate.getTime() + 6 * DAY_MS + DAY_MS - 1_000;
  const end = new Date(startDate.getTime() + 6 * DAY_MS)
    .toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  return { id: start, start, end, dueAt };
}

export function formatDateShort(date: string): string {
  return new Date(`${date}T12:00:00+07:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  });
}

export function addDaysToDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00+07:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function formatWeek(week: InvoiceWeek): string {
  return `${formatDateShort(week.start)} sampai ${formatDateShort(week.end)}`;
}

export function getCurrentWeekStart(date: string): string {
  const dateObj = new Date(`${date}T12:00:00+07:00`);
  const day = (dateObj.getUTCDay() + 6) % 7;
  return addDaysToDate(date, -day);
}
