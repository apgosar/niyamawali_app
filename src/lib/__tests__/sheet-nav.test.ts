import { describe, expect, it } from "vitest";
import { safeNext } from "../nav";
import { buildSheet, parsePart } from "../sheet";

describe("safeNext (login redirect)", () => {
  it("keeps on-site paths", () => {
    expect(safeNext("/results/2026-10")).toBe("/results/2026-10");
    expect(safeNext("/sheet?month=2026-11&part=first")).toBe("/sheet?month=2026-11&part=first");
  });
  it("refuses anything that could leave the site", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "evil", "", null, undefined]) {
      expect(safeNext(bad as string | null | undefined), String(bad)).toBe("/");
    }
  });
});

describe("printable sheet data", () => {
  it("covers the right days for each period (30-day and 28-day months)", async () => {
    const full = await buildSheet("2026-11", "full", "en");
    expect(full.days).toHaveLength(30);
    expect(full.days[0]).toMatchObject({ date: "2026-11-01", day: 1, dow: 0 }); // 1 Nov 2026 is a Sunday
    const first = await buildSheet("2026-11", "first", "en");
    expect(first.days.map((d) => d.day)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    const second = await buildSheet("2026-11", "second", "en");
    expect(second.days[0].day).toBe(16);
    expect(second.days.at(-1)!.day).toBe(30);
    expect((await buildSheet("2027-02", "second", "en")).days.at(-1)!.day).toBe(28);
    expect((await buildSheet("2026-12", "full", "en")).days).toHaveLength(31);
  });

  it("lists the niyams with their points, in Gujarati and English", async () => {
    const en = await buildSheet("2026-11", "full", "en");
    const gu = await buildSheet("2026-11", "full", "gu");
    expect(en.rows).toHaveLength(31);
    expect(en.rows[0]).toMatchObject({ no: 1, points: "10", kind: "boolean" });
    expect(en.rows.find((r) => r.kind === "count")!.points).toBe("20×"); // gatha
    expect(en.rows.find((r) => r.kind === "choice")!.points).toBe("30–60"); // biyasana … upvas
    expect(en.rows[0].name).toMatch(/Navkar/);
    expect(gu.rows[0].name).toMatch(/નવકાર/);
    expect(en.rows.find((r) => r.kind === "multi")).toMatchObject({ no: 31, points: "50–100" }); // Rai / Devsi
    expect(en.choiceLegend).toBe("B = Biyasana · E = Ekasana · A = Ayambil · U = Upvas · R = Rai · D = Devsi");
    expect(gu.choiceLegend.split(" · ")).toHaveLength(6);
    expect(en.hasCount).toBe(true);
  });

  it("falls back to the full month for unknown periods", () => {
    expect(parsePart(undefined)).toBe("full");
    expect(parsePart("nonsense")).toBe("full");
    expect(parsePart("first")).toBe("first");
  });
});
