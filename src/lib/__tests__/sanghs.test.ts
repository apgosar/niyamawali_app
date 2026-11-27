import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { query, tx } from "../db";
import { findExact, normalizeSangh, rankMatches } from "../village-text";
import { listSanghs, resolveSangh, resolveSanghNow } from "../sanghs";

const sql = fs.readFileSync(path.join(process.cwd(), "supabase", "migrations", "0007_sanghs.sql"), "utf8");

describe("the Sangh list", () => {
  it("has the 103 entries (one duplicate merged), including wrapped names and the two translated ones", async () => {
    const listed = await query<{ n: number }>("select count(*)::int as n from sanghs where source = 'list'");
    expect(listed[0].n).toBe(103);
    const all = await listSanghs();
    for (const s of [
      "Shree Kutchhi Visa Oswal Jain Sangh Ambernath",
      "Shree Bandongari Achalgachha Jain Sangh (Shree Kurar Village Achalgachha Sangh Sanchalit)",
      "Shree Nalasopara Station Achalgachha Jain Sangh, Sanghmata Jayaben Vishanji Palan Maru Charitable Trust",
      "Shree Adinath Jinalay, Sanpada, Navi Mumbai",
      "Thane (Wagle Estate) Mandan Achalgachha Sangh",
      "Shree Achalgachha Jain Sangh Worli",
      "Shree Achalgachha Jain Sangh Dombivali",
    ]) expect(all, s).toContain(s);
    expect(all).not.toContain("Shree Achhalgach Jain Sangh Dombivali");
    expect(all.join(" ")).not.toMatch(/[઀-૿]/); // no Gujarati-only names left
  });

  it("can be loaded twice without duplicates", async () => {
    const pg = new PGlite("memory://");
    await pg.exec(sql);
    await pg.exec(sql);
    expect((await pg.query("select 1 from sanghs")).rows).toHaveLength(103);
  });
});

describe("searching long Sangh names", () => {
  const find = async (typed: string) => rankMatches(await listSanghs(), typed);

  it("finds a word anywhere, and words in any order", async () => {
    expect(await find("dombivali")).toHaveLength(2);
    expect(await find("dahisar sangh")).toEqual(["Shree Dahisar Achalgachha Jain Sangh"]);
    expect(await find("worli achalgach")).toContain("Shree Achalgachha Jain Sangh Worli");
    expect(await find("sanpada")).toEqual(["Shree Adinath Jinalay, Sanpada, Navi Mumbai"]);
  });
  it("copes with the different spellings", async () => {
    for (const typed of ["Dahisar Achalgach", "dahisar achhalgachh", "DAHISAR ACHALGACHCH"])
      expect(await find(typed), typed).toContain("Shree Dahisar Achalgachha Jain Sangh");
    expect(await find("kutchi matunga")).toContain("Shree Matunga Kutcchi Murtipujak Jain Shwetamber Sangh Funds Trust");
  });
  it("shows nothing for a Sangh that is not listed", async () => {
    expect(await find("nowhere town")).toEqual([]);
  });
});

describe("choosing or adding a Sangh", () => {
  it("keeps the list's spelling whatever the capitals, spaces or commas", async () => {
    const before = (await listSanghs()).length;
    expect(await resolveSanghNow("shree  dahisar achalgachha jain sangh")).toBe("Shree Dahisar Achalgachha Jain Sangh");
    expect(await resolveSanghNow("Shree Vardhaman Nagar Achalgachha Sangh Ambernath East")).toBe("Shree Vardhaman Nagar Achalgachha Sangh, Ambernath East");
    expect(await listSanghs()).toHaveLength(before);
  });

  it("adds a new one once, tidied, for everyone", async () => {
    const before = (await listSanghs()).length;
    expect(await tx((q) => resolveSangh(q, "shree sangli kvo jain sangh"))).toBe("Shree Sangli KVO Jain Sangh");
    expect(await resolveSanghNow("SHREE SANGLI KVO JAIN SANGH")).toBe("Shree Sangli KVO Jain Sangh");
    expect(await listSanghs()).toHaveLength(before + 1);
    expect((await query<{ source: string }>("select source from sanghs where name = 'Shree Sangli KVO Jain Sangh'"))[0].source).toBe("student");
  });

  it("allows long names and rejects empty ones", () => {
    expect(normalizeSangh("a".repeat(300)).length).toBe(150);
    expect(findExact(["Shri Sewri Jain Sangh"], "shri sewri jain sangh.")).toBe("Shri Sewri Jain Sangh");
    return expect(resolveSanghNow(" ")).rejects.toThrow();
  });
});
