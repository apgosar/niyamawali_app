import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { asLang, dictionaries, LANG_COOKIE, type Lang } from "@/i18n";

export const getLang = cache(async (): Promise<Lang> => asLang((await cookies()).get(LANG_COOKIE)?.value));

export async function getT() {
  const lang = await getLang();
  return { lang, t: dictionaries[lang] };
}
