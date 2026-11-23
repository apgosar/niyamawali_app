import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { query } from "../db";
import { findExact, normalizeVillage, rankMatches } from "../village-text";
import { listVillages, resolveVillage, resolveVillageNow } from "../villages";

const sql = (f: string) => fs.readFileSync(path.join(process.cwd(), "supabase", "migrations", f), "utf8");

describe("normalizeVillage", () => {
  it("tidies spacing and capitals", () => {
    expect(normalizeVillage("  kotda   roha ")).toBe("Kotda Roha");
    expect(normalizeVillage("BHUJ")).toBe("Bhuj");
    expect(normalizeVillage("navavas / durgapur")).toBe("Navavas / Durgapur");
    expect(normalizeVillage("moti-khakhar")).toBe("Moti-Khakhar");
  });
  it("leaves mixed case and other scripts alone, and caps the length", () => {
    expect(normalizeVillage("MaNdvi")).toBe("MaNdvi");
    expect(normalizeVillage("ભુજ")).toBe("ભુજ");
    expect(normalizeVillage("x".repeat(200))).toHaveLength(60);
  });
});

describe("live search", () => {
  const list = ["Bhuj", "Bhujpur", "Kotda Roha", "Kotdi Mahadevpuri", "Moti Khakhar", "Nani Khakhar", "Mundra"];
  it("puts names that start with the typing first, then names containing it", () => {
    expect(rankMatches(list, "bhuj")).toEqual(["Bhuj", "Bhujpur"]);
    expect(rankMatches(list, "KOT")).toEqual(["Kotda Roha", "Kotdi Mahadevpuri"]);
    expect(rankMatches(list, "khak")).toEqual(["Moti Khakhar", "Nani Khakhar"]); // a later word counts too
    expect(rankMatches(list, "mu")).toEqual(["Mundra"]);
    expect(rankMatches(list, "  ")).toEqual(list);
    expect(rankMatches(list, "zzz")).toEqual([]);
  });
  it("finds an exact match whatever the capitals or spacing", () => {
    expect(findExact(list, "kotda  roha")).toBe("Kotda Roha");
    expect(findExact(list, "Kotda")).toBeNull();
    expect(findExact(list, "")).toBeNull();
  });
});

describe("the village list in the database", () => {
  it("starts with the 94 villages from the official list, A to Z", async () => {
    const all = await listVillages();
    expect(all.length).toBeGreaterThanOrEqual(94);
    for (const v of ["Bada", "Bhuj", "Navavas / Durgapur", "Ratadia Ganeshwala", "Vinjan", "Mota Asambia", "Varandi Moti", "Moti Varandi"]) expect(all, v).toContain(v);
    const lower = all.map((v) => v.toLowerCase());
    expect(lower).toEqual([...lower].sort());
    expect(new Set(lower).size).toBe(lower.length);
  });

  it("an existing village comes back in the list's own spelling", async () => {
    const before = (await listVillages()).length;
    expect(await resolveVillageNow("bhuj")).toBe("Bhuj");
    expect(await resolveVillageNow("  BHUJ ")).toBe("Bhuj");
    expect(await resolveVillageNow("kotda   roha")).toBe("Kotda Roha");
    expect((await listVillages()).length).toBe(before);
  });

  it("a new village is accepted and added once, for everyone", async () => {
    const before = (await listVillages()).length;
    expect(await resolveVillageNow("zzz pur")).toBe("Zzz Pur");
    expect(await resolveVillageNow("ZZZ PUR")).toBe("Zzz Pur"); // same village, typed differently
    expect(await resolveVillageNow("Zzz   Pur")).toBe("Zzz Pur");
    const after = await listVillages();
    expect(after.length).toBe(before + 1);
    expect(after).toContain("Zzz Pur");
    const row = (await query<{ source: string }>("select source from villages where name = 'Zzz Pur'"))[0];
    expect(row.source).toBe("student");
  });

  it("can be part of a transaction, and rejects empty input", async () => {
    await expect(resolveVillageNow(" ")).rejects.toThrow();
    await expect(resolveVillageNow("a")).rejects.toThrow();
    const { tx } = await import("../db");
    const name = await tx((q) => resolveVillage(q, "inside tx"));
    expect(name).toBe("Inside Tx");
  });
});

describe("migration 0004", () => {
  it("adds villages that earlier students typed, skips ones already on the list, and can be re-run", async () => {
    const pg = new PGlite("memory://");
    await pg.exec(sql("0001_init.sql"));
    const ins = (first: string, village: string) =>
      pg.query(
        `insert into students (first_name, surname, photo_key, dob, village, father_name, father_phone, residence, sangh,
            dharmik_abhyas, pathshala, pin_hash, referral_code)
         values ($1,'V','x','2012-01-01',$2,'F','9820000001','R','S','A',false,'x',$3)`,
        [first, village, first.toUpperCase().padEnd(6, "X")],
      );
    await ins("One", "Palitana");
    await ins("Two", "  palitana ");
    await ins("Three", "BHUJ"); // already on the official list
    await ins("Four", "Surat");
    await pg.exec(sql("0002_locks_ids_grants.sql"));
    await pg.exec(sql("0004_villages.sql"));
    const rows = (await pg.query<{ name: string; source: string }>("select name, source from villages order by lower(name)")).rows;
    const byName = new Map(rows.map((r) => [r.name, r.source]));
    expect(rows.filter((r) => r.source === "list")).toHaveLength(94);
    expect(byName.get("Palitana")).toBe("student");
    expect(byName.get("Surat")).toBe("student");
    expect(rows.filter((r) => r.name.toLowerCase() === "palitana")).toHaveLength(1); // one spelling only
    expect(rows.filter((r) => r.name.toLowerCase() === "bhuj")).toHaveLength(1); // not duplicated
    expect(byName.get("Bhuj")).toBe("list");
    await pg.exec(sql("0004_villages.sql")); // again
    expect((await pg.query("select 1 from villages")).rows).toHaveLength(rows.length);
  });
});
