"use client";
import { useRef, useState } from "react";
import { FitToWidth } from "@/components/FitToWidth";
import { TopThreeCard, type TopRow } from "@/components/TopThreeCard";
import { usePreparedPng } from "@/lib/render";
import { downloadBlob } from "@/lib/share";

interface Props {
  month: string;
  monthEn: string;
  monthGu: string;
  rows: TopRow[];
  donor: string | null;
}

/**
 * After a month ends: the Top 3 picture for the admins' own use, and a message with the results link for students.
 * The message and the page behind the link carry no names and no ranks.
 */
export function ResultsPanel({ month, monthEn, monthGu, rows, donor }: Props) {
  const card = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState<string | null>(null);
  const picture = usePreparedPng(card, "top3", rows.length > 0);
  const ready = picture.status === "ready" && !!picture.blob;

  const message = (link: string) =>
    [
      `📿 Niyamawali – ${monthEn}`,
      "",
      "તમારા પોઇન્ટ અને પ્રમાણપત્ર જોવા લિંક ખોલો 👇",
      "Open the link to see your own points and certificate 👇",
      link,
    ].join("\n");

  async function copy() {
    const text = message(`${window.location.origin}/results/${month}`);
    try { await navigator.clipboard.writeText(text); setNote("Message copied."); }
    catch { setNote(text); }
  }

  return (
    <div className="space-y-4">
      {rows.length > 0 && (
        <section className="card grid gap-5 p-4 md:grid-cols-[minmax(0,22rem)_1fr]">
          <div className="overflow-hidden rounded-2xl shadow-soft">
            <FitToWidth width={360}>
              <div ref={card}><TopThreeCard monthEn={monthEn} monthGu={monthGu} rows={rows} donor={donor} /></div>
            </FitToWidth>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gold-700">Top 3 (for admins)</h2>
            <p className="mt-1 text-sm text-muted">Students do not see this picture or any ranking.</p>
            <div className="mt-4">
              {picture.status === "error" ? (
                <button type="button" className="btn btn-gold" onClick={picture.retry}>Try again</button>
              ) : (
                <button type="button" className="btn btn-ghost" disabled={!ready}
                  onClick={() => picture.blob && downloadBlob(picture.blob, `niyamawali-top3-${month}.png`)}>
                  {ready ? "⬇ Download picture" : "Preparing picture…"}
                </button>
              )}
            </div>
            {picture.status === "error" && <p role="alert" className="err mt-3">The picture could not be created. Check the connection and try again.</p>}
          </div>
        </section>
      )}

      <section className="card p-4">
        <h2 className="text-lg font-bold text-gold-700">Results link for students</h2>
        <p className="mt-1 text-sm text-muted">
          Students who open the link must log in, and then see only their own points and a button for their certificate.
        </p>
        <pre className="mt-3 overflow-auto whitespace-pre-wrap rounded-xl bg-gold-50 p-3 text-xs">{message(`… link to /results/${month}`)}</pre>
        <button type="button" className="btn btn-gold mt-3" onClick={copy}>Copy message</button>
        {note && <p role="status" className="mt-3 whitespace-pre-wrap rounded-xl bg-gold-50 p-3 text-sm text-gold-700">{note}</p>}
      </section>
    </div>
  );
}
