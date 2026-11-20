"use client";
import { useEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/image";
import { useI18n } from "./I18nProvider";

interface Props {
  onChange: (blob: Blob | null) => void;
  existingUrl?: string | null;
  invalid?: boolean;
}

export function PhotoPicker({ onChange, existingUrl, invalid }: Props) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await compressImage(file);
      setPreview(URL.createObjectURL(blob));
      onChange(blob);
    } catch {
      onChange(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={() => input.current?.click()}
        className={`relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-gold-50 text-gold-600 transition active:scale-95 ${
          invalid ? "border-danger" : "border-gold-300"}`}
        aria-label={t.register.photo}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center text-4xl">📷<span className="mt-1 px-3 text-xs font-medium leading-tight">{t.register.photoAdd}</span></span>
        )}
        {busy && <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm">…</span>}
      </button>
      {preview && <button type="button" className="text-sm font-semibold text-gold-600" onClick={() => input.current?.click()}>{t.register.photoChange}</button>}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
