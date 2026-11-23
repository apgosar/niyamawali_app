import { NextResponse } from "next/server";
import { getAdmin, getStudent } from "@/lib/auth";
import { readPhoto } from "@/lib/storage";

export async function GET(_req: Request, ctx: { params: Promise<{ folder: string; file: string }> }) {
  const { folder, file } = await ctx.params;
  // Photos of students (minors): only logged-in students and admins. Donor photos are public: they are shown on the opening screen.
  if (folder !== "donors" && !(await getStudent()) && !(await getAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const buf = await readPhoto(`${folder}/${file}`);
  if (!buf) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": folder === "donors" ? "public, max-age=3600" : "private, max-age=86400, immutable" },
  });
}
