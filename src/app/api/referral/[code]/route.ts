import { NextResponse } from "next/server";
import { findReferrer } from "@/lib/referrals";
import { getSettings } from "@/lib/settings";

// Public: only reveals the referrer's name (so the invite screen can say "Invited by …").
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const s = await getSettings();
  if (!s.referralsEnabled) return NextResponse.json({ found: false });
  const r = await findReferrer(code);
  if (!r) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, name: `${r.first_name} ${r.surname}`, bonus: s.referralBonus });
}
