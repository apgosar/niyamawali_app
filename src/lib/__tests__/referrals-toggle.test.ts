import { beforeAll, describe, expect, it } from "vitest";
import { query } from "../db";
import { addDays, todayIST } from "../dates";
import { getNiyams, saveEntry, submitDay } from "../logs";
import { getSettings, saveSettings } from "../settings";

const today = todayIST();
let yesNo = 0;
let referrer = "", referee = "";

async function mk(first: string, code: string, referredBy?: string) {
  const [r] = await query<{ id: string }>(
    `insert into students (first_name, surname, photo_key, dob, village, mother_name, mother_phone, residence, sangh,
        dharmik_abhyas, pathshala, pin_hash, referral_code, referred_by)
     values ($1,'Toggle','students/x.jpg','2012-01-01','V','M','9820000066','R','S','A',false,'x',$2,$3) returning id`,
    [first, code, referredBy ?? null],
  );
  if (referredBy) await query("insert into referrals (referee_id, referrer_id) values ($1,$2)", [r.id, referredBy]);
  return r.id;
}
const referralBonuses = async () => (await query<{ n: number }>("select count(*)::int as n from bonus_points where kind = 'referral'"))[0].n;
const status = async () => (await query<{ status: string }>("select status from referrals where referee_id = $1", [referee]))[0].status;

beforeAll(async () => {
  yesNo = (await getNiyams()).niyams.find((n) => n.type === "boolean")!.id;
  referrer = await mk("Inviter", "TGL001");
  referee = await mk("Invitee", "TGL002", referrer);
});

describe("referrals on/off", () => {
  it("is OFF until an admin turns it on", async () => {
    expect((await getSettings()).referralsEnabled).toBe(false);
  });

  it("pays nothing while off, however many days the new student logs", async () => {
    for (const back of [0, 1, 2]) {
      await saveEntry(referee, addDays(today, -back), yesNo, 1);
      await submitDay(referee, addDays(today, -back));
    }
    expect(await referralBonuses()).toBe(0);
    expect(await status()).toBe("pending");
  });

  it("when turned on, the waiting referral is paid on the next submit (both sides, once)", async () => {
    await saveSettings({ referrals_enabled: "1" });
    expect((await getSettings()).referralsEnabled).toBe(true);
    const r2 = await submitDay(referee, today);
    expect(r2.bonuses.some((b) => b.kind === "referral")).toBe(true);
    expect(await status()).toBe("awarded");
    expect(await referralBonuses()).toBe(2);
  });

  it("turning it off again does not take back what was paid, and stops new payments", async () => {
    await saveSettings({ referrals_enabled: "0" });
    expect(await referralBonuses()).toBe(2);
    expect(await status()).toBe("awarded");
    // a brand-new referral made while off stays pending
    const newbie = await mk("Newbie", "TGL003", referrer);
    for (const back of [0, 1, 2]) {
      await saveEntry(newbie, addDays(today, -back), yesNo, 1);
      await submitDay(newbie, addDays(today, -back));
    }
    expect(await referralBonuses()).toBe(2);
    expect((await query<{ status: string }>("select status from referrals where referee_id = $1", [newbie]))[0].status).toBe("pending");
  });

  it("only the exact value 1 means on (anything else is off)", async () => {
    for (const v of ["0", "", "true", "on", "yes"]) {
      await saveSettings({ referrals_enabled: v });
      expect((await getSettings()).referralsEnabled, `"${v}"`).toBe(false);
    }
    await saveSettings({ referrals_enabled: "1" });
    expect((await getSettings()).referralsEnabled).toBe(true);
  });
});
