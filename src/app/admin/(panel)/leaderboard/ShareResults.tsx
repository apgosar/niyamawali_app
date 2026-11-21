"use client";
import { useRef, useState } from "react";
import { FitToWidth } from "@/components/FitToWidth";
import { TopThreeCard, type TopRow } from "@/components/TopThreeCard";
import { usePreparedPng } from "@/lib/render";
import { downloadBlob, shareImage } from "@/lib/share";

interface Props {
  month: string;
  monthEn: string;
  monthGu: string;
  rows: TopRow[];
  donor: string | null;
}

const MEDAL = ["🥇", "🥈", "🥉"];

export function ShareResults({ month, monthEn, monthGu, rows, donor }: Props) {
  const card = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState<string | null>(null);
  // The picture is built as soon as this section opens, so Share works at the first tap (phones require that).
  const picture = usePreparedPng(card, "top3");
  const ready = picture.status === "ready" && !!picture.blob;
  const file = `niyamawali-top3-${month}.png`;

  const link = () => `${window.location.origin}/results/${month}`;
  const message = () =>
    [
      `🏆 Niyamawali – ${monthEn} Top 3 🏆`,
      ...rows.map((r) => `${MEDAL[r.rank - 1] ?? r.rank + "."} ${r.name}`),
      "",
      "તમારા પોઇન્ટ, રેન્ક અને પ્રમાણપત્ર જોવા લિંક ખોલો 👇",
      "Open the link to see your own points, rank and certificate 👇",
      link(),
    ].join("\n");

  async function share() {
    if (!picture.blob) return;
    setNote(null);
    try {
      const r = await shareImage(picture.blob, file, message());
      if (r === "downloaded") setNote("Your browser cannot attach pictures directly. The picture was saved and WhatsApp opened with the message — attach the saved picture before sending. (On a phone the picture and message are shared together.)");
    } catch {
      setNote("Could not open sharing. Use “Download picture” and “Copy message” instead.");
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(message()); setNote("Message copied."); }
    catch { setNote(message()); }
  }

  return (
    <section className="card grid gap-5 p-4 md:grid-cols-[minmax(0,22rem)_1fr]">
      <div className="overflow-hidden rounded-2xl shadow-soft">
        <FitToWidth width={360}>
          <div ref={card}><TopThreeCard monthEn={monthEn} monthGu={monthGu} rows={rows} donor={donor} /></div>
        </FitToWidth>
      </div>
      <div>
        <h2 className="text-lg font-bold text-gold-700">Share this month’s result</h2>
        <p className="mt-1 text-sm text-muted">
          Posts the picture above with a message and a link. Students who open the link must log in, and then see this picture, only
          their own points and rank, and a button for their certificate.
        </p>
        <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-xl bg-gold-50 p-3 text-xs">{`🏆 Niyamawali – ${monthEn} Top 3 🏆\n${rows.map((r) => `${MEDAL[r.rank - 1] ?? r.rank + "."} ${r.name}`).join("\n")}\n\n… link to /results/${month}`}</pre>
        <div className="mt-4 flex flex-wrap gap-2">
          {picture.status === "error" ? (
            <button type="button" className="btn btn-gold" onClick={picture.retry}>Try again</button>
          ) : (
            <>
              <button type="button" className="btn bg-[#25D366] text-white shadow-soft" disabled={!ready} onClick={share}>
                {ready ? "Share on WhatsApp" : "Preparing picture…"}
              </button>
              <button type="button" className="btn btn-ghost" disabled={!ready} onClick={() => picture.blob && downloadBlob(picture.blob, file)}>⬇ Download picture</button>
            </>
          )}
          <button type="button" className="btn btn-ghost" onClick={copy}>Copy message</button>
        </div>
        {picture.status === "error" && <p role="alert" className="err mt-3">The picture could not be created. Check the connection and try again.</p>}
        {note && <p role="status" className="mt-3 rounded-xl bg-gold-50 p-3 text-sm text-gold-700">{note}</p>}
      </div>
    </section>
  );
}
