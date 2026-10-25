import { describe, expect, it } from "vitest";
import { calculatePenalty, getWeekRange } from "./domain";

describe("calculatePenalty", () => {
  const enabled = { enabled: true };
  const paidOnOct21 = new Date("2026-10-21T10:00:00+07:00").getTime();

  it("menghitung denda dan total tiga minggu sesuai kasus PRD", () => {
    const first = calculatePenalty(getWeekRange("2026-10-05"), paidOnOct21, enabled);
    const second = calculatePenalty(getWeekRange("2026-10-12"), paidOnOct21, enabled);
    const third = calculatePenalty(getWeekRange("2026-10-19"), paidOnOct21, enabled);
    expect(first).toEqual({
      weeksLate: 2,
      penalty: 1_500,
      total: 6_500,
    });
    expect(second).toEqual({
      weeksLate: 1,
      penalty: 1_000,
      total: 6_000,
    });
    expect(third).toEqual({
      weeksLate: 0,
      penalty: 0,
      total: 5_000,
    });
    expect(first.total + second.total + third.total).toBe(17_500);
    expect(
      [getWeekRange("2026-10-05"), getWeekRange("2026-10-12"), getWeekRange("2026-10-19")]
        .reduce((sum, week) => sum + calculatePenalty(week, paidOnOct21, { enabled: false }).total, 0),
    ).toBe(15_000);
  });

  it("menghormati batas Minggu dan mulai mendenda pada Senin berikutnya", () => {
    const week = getWeekRange("2026-10-19");
    expect(calculatePenalty(week, week.dueAt, enabled).penalty).toBe(0);
    expect(
      calculatePenalty(week, new Date("2026-10-26T00:00:00+07:00").getTime(), enabled)
        .penalty,
    ).toBe(1_000);
  });

  it("menggunakan kenaikan progresif dan waktu pengaktifan saklar yang terbaru", () => {
    expect(
      calculatePenalty(
        getWeekRange("2026-10-05"),
        new Date("2026-11-01T10:00:00+07:00").getTime(),
        enabled,
      ).penalty,
    ).toBe(2_000);
    expect(
      calculatePenalty(getWeekRange("2026-10-05"), paidOnOct21, {
        enabled: true,
        enabledAt: new Date("2026-10-20T12:00:00+07:00").getTime(),
      }).penalty,
    ).toBe(1_000);
  });

  it("tidak menghitung denda ketika kebijakan mati", () => {
    expect(
      calculatePenalty(getWeekRange("2026-10-05"), paidOnOct21, { enabled: false }).total,
    ).toBe(5_000);
  });
});
