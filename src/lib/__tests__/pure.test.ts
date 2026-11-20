import { describe, expect, it } from "vitest";
import { addDays, ageOn, editableDates, isEditable, monthRange, todayIST } from "../dates";
import { scoreEntry, type NiyamDef, type OptionDef } from "../points";
import { computeStreak, longestStreak, parseStreakBonuses } from "../streaks";
import { normalizePhone } from "../auth";

const boolN: NiyamDef = { id: 1, sort_order: 1, name_gu: "", name_en: "", type: "boolean", points: 10, points_per_unit: 0, max_count: 0 };
const countN: NiyamDef = { id: 6, sort_order: 6, name_gu: "", name_en: "", type: "count", points: 0, points_per_unit: 20, max_count: 10 };
const choiceN: NiyamDef = { id: 12, sort_order: 12, name_gu: "", name_en: "", type: "choice", points: 0, points_per_unit: 0, max_count: 0 };
const opts: OptionDef[] = [
  { id: 1, niyam_id: 12, code: "biyasana", label_gu: "", label_en: "", points: 30, sort_order: 1 },
  { id: 4, niyam_id: 12, code: "upvas", label_gu: "", label_en: "", points: 60, sort_order: 4 },
];

describe("dates (IST)", () => {
  it("computes today in India, not UTC", () => {
    // 20:00 UTC on 19 Nov is already 01:30 on 20 Nov in IST
    expect(todayIST(new Date("2026-11-19T20:00:00Z"))).toBe("2026-11-20");
    expect(todayIST(new Date("2026-11-19T18:00:00Z"))).toBe("2026-11-19");
  });
  it("edit window: today + previous N-1 days", () => {
    expect(editableDates("2026-11-20", 3)).toEqual(["2026-11-20", "2026-11-19", "2026-11-18"]);
    expect(isEditable("2026-11-18", "2026-11-20", 3)).toBe(true);
    expect(isEditable("2026-11-17", "2026-11-20", 3)).toBe(false);
    expect(isEditable("2026-11-21", "2026-11-20", 3)).toBe(false); // future
    expect(isEditable("2026-11-19", "2026-11-20", 1)).toBe(false);
  });
  it("handles month borders", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(monthRange("2026-12")).toEqual(["2026-12-01", "2027-01-01"]);
    expect(ageOn("2012-05-14", "2026-05-13")).toBe(13);
    expect(ageOn("2012-05-14", "2026-05-14")).toBe(14);
  });
});

describe("scoring", () => {
  it("yes/no niyam", () => {
    expect(scoreEntry(boolN, 1, [])).toBe(10);
    expect(scoreEntry(boolN, 2, [])).toBeNull();
  });
  it("gatha count is value x 20 and bounded", () => {
    expect(scoreEntry(countN, 3, [])).toBe(60);
    expect(scoreEntry(countN, 0, [])).toBeNull();
    expect(scoreEntry(countN, 11, [])).toBeNull();
  });
  it("choice uses the option's points and rejects foreign options", () => {
    expect(scoreEntry(choiceN, 4, opts)).toBe(60);
    expect(scoreEntry(choiceN, 1, opts)).toBe(30);
    expect(scoreEntry(choiceN, 99, opts)).toBeNull();
  });
});

describe("streaks", () => {
  it("counts consecutive days ending today", () => {
    expect(computeStreak(["2026-11-20", "2026-11-19", "2026-11-18", "2026-11-15"], "2026-11-20")).toBe(3);
  });
  it("stays alive when only today is still empty", () => {
    expect(computeStreak(["2026-11-19", "2026-11-18"], "2026-11-20")).toBe(2);
  });
  it("breaks after a missed day", () => {
    expect(computeStreak(["2026-11-18"], "2026-11-20")).toBe(0);
    expect(computeStreak([], "2026-11-20")).toBe(0);
  });
  it("backfilling a gap repairs the streak", () => {
    expect(computeStreak(["2026-11-20", "2026-11-18"], "2026-11-20")).toBe(1);
    expect(computeStreak(["2026-11-20", "2026-11-19", "2026-11-18"], "2026-11-20")).toBe(3);
  });
  it("longest streak", () => {
    expect(longestStreak(["2026-01-01", "2026-01-02", "2026-01-04", "2026-01-05", "2026-01-06"])).toBe(3);
  });
  it("parses bonus settings and ignores junk", () => {
    expect(parseStreakBonuses("21:100, 7:50,bad,0:5")).toEqual([{ days: 7, points: 50 }, { days: 21, points: 100 }]);
    expect(parseStreakBonuses("")).toEqual([]);
  });
});

describe("phone numbers", () => {
  it("normalises common formats", () => {
    expect(normalizePhone("+91 98200 12345")).toBe("9820012345");
    expect(normalizePhone("098200-12345")).toBe("9820012345");
    expect(normalizePhone("12345")).toBe("");
    expect(normalizePhone("5820012345")).toBe(""); // Indian mobiles start 6-9
  });
});
