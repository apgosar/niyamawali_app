import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

/**
 * Photo storage.
 *  - Production: a PRIVATE Supabase Storage bucket (SUPABASE_URL + SUPABASE_SERVICE_KEY).
 *  - Local dev:  files under ./.data/photos
 * Photos are never public: they are streamed through /api/photo/[key] to logged-in users only.
 */

const BUCKET = process.env.SUPABASE_BUCKET || "photos";
const supabaseUrl = () => process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = () => process.env.SUPABASE_SERVICE_KEY;
const hasSupabase = () => Boolean(supabaseUrl() && serviceKey());
/**
 * Works with both key styles: the new `sb_secret_…` keys (sent as `apikey`) and the legacy JWT `service_role` key
 * (which also needs `Authorization: Bearer`).
 */
const authHeaders = (): Record<string, string> => {
  const key = serviceKey()!;
  return key.startsWith("eyJ") ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
};
const LOCAL_DIR = path.join(process.cwd(), ".data", "photos");

/** Resize to a 480px square JPEG – also strips EXIF/location data. */
export async function normalizePhoto(input: Buffer): Promise<Buffer> {
  return sharp(input).rotate().resize(480, 480, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
}

export async function savePhoto(input: Buffer, folder: "students" | "donors"): Promise<string> {
  const body = await normalizePhoto(input);
  const key = `${folder}/${randomUUID()}.jpg`;
  if (hasSupabase()) {
    const res = await fetch(`${supabaseUrl()}/storage/v1/object/${BUCKET}/${key}`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "image/jpeg", "x-upsert": "true" },
      body: new Uint8Array(body),
    });
    if (!res.ok) throw new Error(`Photo upload failed: ${res.status} ${await res.text()}`);
  } else {
    const file = path.join(LOCAL_DIR, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
  }
  return key;
}

export async function readPhoto(key: string): Promise<Buffer | null> {
  if (!/^(students|donors)\/[0-9a-f-]{36}\.jpg$/.test(key)) return null;
  if (hasSupabase()) {
    const res = await fetch(`${supabaseUrl()}/storage/v1/object/${BUCKET}/${key}`, {
      headers: authHeaders(),
    });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  }
  try {
    return await fs.readFile(path.join(LOCAL_DIR, key));
  } catch {
    return null;
  }
}

export async function deletePhoto(key: string | null | undefined) {
  if (!key || !/^(students|donors)\/[0-9a-f-]{36}\.jpg$/.test(key)) return;
  if (hasSupabase()) {
    await fetch(`${supabaseUrl()}/storage/v1/object/${BUCKET}/${key}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).catch(() => {});
  } else {
    await fs.rm(path.join(LOCAL_DIR, key), { force: true });
  }
}
