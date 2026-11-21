"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "./I18nProvider";

interface Props {
  /** Blob/File or same-origin URL of the original picture. */
  source: Blob | string;
  onDone: (blob: Blob) => void;
  onCancel: () => void;
}

const VIEW = 280; // on-screen square (shown through a circular mask)
const OUT = 480; // exported size

async function loadBitmap(source: Blob | string): Promise<ImageBitmap> {
  const blob = typeof source === "string" ? await (await fetch(source)).blob() : source;
  return createImageBitmap(blob, { imageOrientation: "from-image" });
}

export function PhotoCropper({ source, onDone, onCancel }: Props) {
  const { t } = useI18n();
  const canvas = useRef<HTMLCanvasElement>(null);
  const img = useRef<ImageBitmap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = just covers the circle
  const [rot, setRot] = useState(0); // quarter turns
  const pos = useRef({ x: 0, y: 0 }); // pan offset in VIEW pixels
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number } | null>(null);

  /** Draws the picture into a size×size canvas using the current pan / zoom / rotation. */
  const draw = useCallback((c: HTMLCanvasElement, size: number) => {
    const bmp = img.current;
    const ctx = c.getContext("2d");
    if (!bmp || !ctx) return;
    const turned = rot % 2 === 1;
    const w = turned ? bmp.height : bmp.width;
    const h = turned ? bmp.width : bmp.height;
    const k = size / VIEW; // scale from on-screen px to output px
    const base = (VIEW / Math.min(w, h)) * zoom;
    // keep the picture covering the whole circle
    const maxX = Math.max(0, (w * base - VIEW) / 2);
    const maxY = Math.max(0, (h * base - VIEW) / 2);
    pos.current.x = Math.min(maxX, Math.max(-maxX, pos.current.x));
    pos.current.y = Math.min(maxY, Math.max(-maxY, pos.current.y));
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2 + pos.current.x * k, size / 2 + pos.current.y * k);
    ctx.rotate((rot * Math.PI) / 2);
    ctx.scale(base * k, base * k);
    ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
    ctx.restore();
  }, [rot, zoom]);

  useEffect(() => {
    let alive = true;
    loadBitmap(source).then((b) => { if (alive) { img.current = b; setReady(true); } }).catch(() => alive && setFailed(true));
    return () => { alive = false; img.current?.close?.(); img.current = null; };
  }, [source]);

  useEffect(() => {
    if (ready && canvas.current) draw(canvas.current, VIEW * 2); // 2× for sharp screens
  }, [ready, draw]);

  // Lock page scroll while the editor is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const redraw = () => canvas.current && draw(canvas.current, VIEW * 2);

  function down(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: pos.current.x, oy: pos.current.y };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    pos.current = { x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) };
    redraw();
  }
  const up = () => { drag.current = null; };

  function save() {
    const out = document.createElement("canvas");
    out.width = out.height = OUT;
    draw(out, OUT);
    out.toBlob((b) => b && onDone(b), "image/jpeg", 0.85);
  }

  const btn = "flex h-11 min-w-11 items-center justify-center rounded-full border-2 border-gold-300 bg-white px-3 text-lg font-bold text-gold-700 active:scale-95";

  // Portal to <body>: an animated ancestor (transform) would otherwise become the containing block for `fixed`.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t.register.photoAdjust}
      className="safe-overlay fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-y-auto bg-gold-900/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-ivory p-5 shadow-xl">
        <h2 className="text-center text-xl font-bold text-gold-700">{t.register.photoAdjust}</h2>
        <p className="mb-3 mt-1 text-center text-sm text-muted">{t.register.photoAdjustHint}</p>

        <div className="relative mx-auto touch-none select-none" style={{ width: VIEW, height: VIEW }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <canvas ref={canvas} width={VIEW * 2} height={VIEW * 2}
            className="cursor-grab rounded-full border-[3px] border-gold-300 bg-sand active:cursor-grabbing" style={{ width: VIEW, height: VIEW }} />
          {!ready && <span className="absolute inset-0 flex items-center justify-center text-sm text-muted">{failed ? t.common.somethingWrong : t.common.loading}</span>}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="button" className={btn} aria-label="−" onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}>−</button>
          <input type="range" min={1} max={3} step={0.01} value={zoom} aria-label={t.register.photoZoom}
            onChange={(e) => setZoom(Number(e.target.value))} className="h-2 flex-1 accent-[#b8862b]" />
          <button type="button" className={btn} aria-label="+" onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}>+</button>
          <button type="button" className={btn} aria-label={t.register.photoRotate} onClick={() => setRot((r) => (r + 1) % 4)}>⟳</button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{t.common.cancel}</button>
          <button type="button" className="btn btn-gold" disabled={!ready} onClick={save}>{t.common.save}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
