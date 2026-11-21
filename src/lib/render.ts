"use client";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { getFontEmbedCSS, toBlob } from "html-to-image";

/**
 * Turns a card on screen into a PNG.
 *
 * Why this exists: sharing must start right after the person taps the button, or the phone refuses to open its share
 * sheet. Building the picture takes a few seconds (it has to fetch the fonts), so we build it as soon as the screen
 * opens (usePreparedPng) and the button only has to hand over the finished picture.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

/** Wait until every <img> inside the card has loaded (or failed), so photos are not missing from the picture. */
async function imagesReady(node: HTMLElement) {
  const pending = [...node.querySelectorAll("img")]
    .filter((img) => !(img.complete && img.naturalWidth > 0))
    .map((img) => new Promise<void>((res) => {
      img.addEventListener("load", () => res(), { once: true });
      img.addEventListener("error", () => res(), { once: true });
    }));
  await withTimeout(Promise.all(pending), 10000).catch(() => {});
}

// The font data only has to be fetched once per kind of card.
const fontCss = new Map<string, string>();
const isSafari = () => typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export async function renderPng(node: HTMLElement, key: string, pixelRatio = 3): Promise<Blob> {
  await document.fonts?.ready;
  await imagesReady(node);
  let css = fontCss.get(key);
  if (css === undefined) {
    css = await withTimeout(getFontEmbedCSS(node), 60000);
    fontCss.set(key, css);
  }
  const opts = { pixelRatio, backgroundColor: "#fbf6ec", fontEmbedCSS: css };
  let blob = await withTimeout(toBlob(node, opts), 30000);
  if (isSafari()) blob = await withTimeout(toBlob(node, opts), 30000); // Safari draws pictures blank on the first pass
  if (!blob) throw new Error("render failed");
  return blob;
}

export interface Prepared {
  status: "idle" | "loading" | "ready" | "error";
  blob: Blob | null;
  retry: () => void;
}

/** Builds the picture of `ref` in the background as soon as it is on screen. `enabled=false` skips the work. */
export function usePreparedPng(ref: RefObject<HTMLElement | null>, key: string, enabled = true): Prepared {
  const [state, setState] = useState<{ status: Prepared["status"]; blob: Blob | null }>({ status: enabled ? "loading" : "idle", blob: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      try {
        await sleep(150); // let the card finish laying out
        const blob = await renderPng(ref.current!, key);
        if (alive) setState({ status: "ready", blob });
      } catch {
        if (alive) setState({ status: "error", blob: null });
      }
    })();
    return () => { alive = false; };
  }, [ref, key, enabled, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading", blob: null });
    setAttempt((a) => a + 1);
  }, []);

  return { ...state, retry };
}
