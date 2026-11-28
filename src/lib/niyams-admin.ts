import "server-only";
import { query, tx } from "./db";

export interface NiyamEdit {
  id: number;
  sort_order: number;
  name_gu: string;
  name_en: string;
  active: boolean;
  /** only for Yes/No niyams */
  points?: number;
  /** only for count niyams */
  points_per_unit?: number;
  max_count?: number;
}

export interface OptionEdit {
  id: number;
  label_gu: string;
  label_en: string;
  points: number;
  active: boolean;
}

export class EditError extends Error {}

export interface SaveResult {
  /** niyams + options that actually changed */
  changed: number;
  /** niyams whose past entries were re-scored */
  rescored: number;
}

/** Re-score what students already logged for one niyam, using its current points. */
export async function rescoreNiyam(id: number) {
  await query(
    `update daily_logs l set points = n.points from niyams n
      where l.niyam_id = n.id and n.id = $1 and n.type = 'boolean'`, [id]);
  await query(
    `update daily_logs l set points = l.value * n.points_per_unit from niyams n
      where l.niyam_id = n.id and n.id = $1 and n.type = 'count'`, [id]);
  await query(
    `update daily_logs l set points = o.points from niyam_options o, niyams n
      where l.niyam_id = $1 and n.id = l.niyam_id and n.type = 'choice' and o.niyam_id = l.niyam_id and o.id = l.value`, [id]);
  // multi-choice: add up the ticked options (the bits match optionBit in points.ts)
  await query(
    `update daily_logs l set points = (
        select coalesce(sum(o.points), 0)::int from niyam_options o
         where o.niyam_id = l.niyam_id and (l.value & (1 << (o.sort_order - 1))) <> 0)
      from niyams n where l.niyam_id = $1 and n.id = l.niyam_id and n.type = 'multi'`, [id]);
}

/**
 * Saves a whole page of edits in one go. Only rows that really changed are written.
 * With `rescore`, past entries are re-scored for the niyams whose POINTS changed (names / order / active never touch scores).
 * Throws EditError (and saves nothing) when something is invalid.
 */
export async function saveNiyamEdits(niyamEdits: NiyamEdit[], optionEdits: OptionEdit[], rescore: boolean): Promise<SaveResult> {
  const nonNeg = (v: number | undefined) => v === undefined || (Number.isInteger(v) && v >= 0);
  const oldNiyams = new Map((await query<{
    id: number; sort_order: number; name_gu: string; name_en: string; type: string; points: number; points_per_unit: number; max_count: number; active: boolean;
  }>("select id, sort_order, name_gu, name_en, type, points, points_per_unit, max_count, active from niyams")).map((r) => [r.id, r]));
  const oldOptions = new Map((await query<{
    id: number; niyam_id: number; label_gu: string; label_en: string; points: number; active: boolean;
  }>("select id, niyam_id, label_gu, label_en, points, active from niyam_options")).map((r) => [r.id, r]));

  const niyamUpdates: NiyamEdit[] = [];
  const optionUpdates: OptionEdit[] = [];
  const pointsChanged = new Set<number>();

  for (const e of niyamEdits) {
    const old = oldNiyams.get(e.id);
    if (!old) continue;
    const label = `Niyam ${old.sort_order}`;
    if (!e.name_gu.trim() || !e.name_en.trim()) throw new EditError(`${label}: please fill in both the Gujarati and the English name.`);
    if (!Number.isInteger(e.sort_order)) throw new EditError(`${label}: the number (order) must be a whole number.`);
    if (!nonNeg(e.points) || !nonNeg(e.points_per_unit)) throw new EditError(`${label}: points must be 0 or more.`);
    if (e.max_count !== undefined && (!Number.isInteger(e.max_count) || e.max_count < 1)) throw new EditError(`${label}: max count must be at least 1.`);

    const next = {
      sort_order: e.sort_order,
      name_gu: e.name_gu.trim(),
      name_en: e.name_en.trim(),
      active: e.active,
      points: old.type === "boolean" && e.points !== undefined ? e.points : old.points,
      points_per_unit: old.type === "count" && e.points_per_unit !== undefined ? e.points_per_unit : old.points_per_unit,
      max_count: old.type === "count" && e.max_count !== undefined ? e.max_count : old.max_count,
    };
    const differs =
      next.sort_order !== old.sort_order || next.name_gu !== old.name_gu || next.name_en !== old.name_en || next.active !== old.active ||
      next.points !== old.points || next.points_per_unit !== old.points_per_unit || next.max_count !== old.max_count;
    if (differs) niyamUpdates.push({ id: e.id, ...next });
    if (next.points !== old.points || next.points_per_unit !== old.points_per_unit) pointsChanged.add(e.id);
  }

  for (const e of optionEdits) {
    const old = oldOptions.get(e.id);
    if (!old) continue;
    if (!e.label_gu.trim() || !e.label_en.trim()) throw new EditError("Please fill in both names for every option.");
    if (!Number.isInteger(e.points) || e.points < 0) throw new EditError(`Option “${old.label_en}”: points must be 0 or more.`);
    const next = { label_gu: e.label_gu.trim(), label_en: e.label_en.trim(), points: e.points, active: e.active };
    if (next.label_gu !== old.label_gu || next.label_en !== old.label_en || next.points !== old.points || next.active !== old.active) {
      optionUpdates.push({ id: e.id, ...next });
    }
    if (next.points !== old.points) pointsChanged.add(old.niyam_id);
  }

  await tx(async (q) => {
    for (const u of niyamUpdates) {
      await q.query(
        `update niyams set sort_order = $2, name_gu = $3, name_en = $4, active = $5, points = $6, points_per_unit = $7, max_count = $8 where id = $1`,
        [u.id, u.sort_order, u.name_gu, u.name_en, u.active, u.points, u.points_per_unit, u.max_count],
      );
    }
    for (const u of optionUpdates) {
      await q.query("update niyam_options set label_gu = $2, label_en = $3, points = $4, active = $5 where id = $1", [u.id, u.label_gu, u.label_en, u.points, u.active]);
    }
  });

  let rescored = 0;
  if (rescore) {
    for (const id of pointsChanged) {
      await rescoreNiyam(id);
      rescored++;
    }
  }
  return { changed: niyamUpdates.length + optionUpdates.length, rescored };
}

export async function addNiyamRow(input: { name_gu: string; name_en: string; type: "boolean" | "count"; points: number }) {
  const gu = input.name_gu.trim();
  const en = input.name_en.trim();
  if (!gu && !en) throw new EditError("Enter a name (Gujarati or English).");
  if (!Number.isInteger(input.points) || input.points < 0) throw new EditError("Points must be 0 or more.");
  const max = await query<{ m: number }>("select coalesce(max(sort_order),0)::int as m from niyams");
  const no = (max[0]?.m ?? 0) + 1;
  await query(
    `insert into niyams (sort_order, name_gu, name_en, type, points, points_per_unit, max_count) values ($1,$2,$3,$4,$5,$6,10)`,
    [no, gu || en, en || gu, input.type, input.type === "boolean" ? input.points : 0, input.type === "count" ? input.points : 0],
  );
  return no;
}
