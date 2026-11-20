import { NextResponse } from "next/server";
import { getAdmin, getStudent } from "@/lib/auth";
import { readPhoto } from "@/lib/storage";

export async function GET(_req: Request, ctx: { params: Promise<{ folder: string; file: string }> }) {
  const { folder, file } = await ctx.params;
  // Photos of minors: only logged-in students and admins may see them.
  if (!(await getStudent()) && !(await getAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const buf = await readPhoto(`${folder}/${file}`);
  if (!buf) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400, immutable" },
  });
}
