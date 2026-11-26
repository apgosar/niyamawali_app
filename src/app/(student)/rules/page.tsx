import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { rules } from "@/i18n/rules";
import { LangToggle } from "@/components/LangToggle";
import { LinkSpinner } from "@/components/LinkSpinner";

export const metadata = { title: "Rules" };

export default async function RulesPage() {
  await requireStudent("/rules");
  const { lang } = await getT();
  const r = rules[lang];

  return (
    <>
      <header className="safe-top rounded-b-[2rem] border-b border-gold-100 bg-gradient-to-b from-peach/70 via-gold-50 to-cream px-4 pb-5 pt-5 text-center">
        <div className="mb-1 flex justify-end"><LangToggle /></div>
        <h1 className="text-3xl font-bold text-gold-700">{r.title}</h1>
        <p className="mt-1 text-sm font-semibold uppercase tracking-widest text-gold-600">{r.subtitle}</p>
      </header>

      <main className="space-y-4 px-4 pt-5">
        {r.sections.map((s, i) => (
          <section key={s.title} className="card p-4">
            <h2 className="mb-3 flex items-center gap-3 text-lg font-bold text-gold-700">
              <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-100 text-base text-gold-700">{i + 1}</span>
              {s.title}
            </h2>

            {s.bullets && (
              <ul className="space-y-2.5">
                {s.bullets.map((b) => (
                  <li key={b.text} className="flex gap-2.5 text-[15px] leading-relaxed">
                    <span aria-hidden className="text-gold-500">◆</span>
                    <span>
                      {b.lead && <b className="text-gold-900">{b.lead} </b>}{b.text}
                      {b.link && (
                        <Link href={b.link.href} className="mt-2 flex w-fit min-h-10 items-center gap-2 rounded-full border border-gold-300 bg-gold-50 px-4 text-sm font-semibold text-gold-700 active:scale-95">
                          🏅 {b.link.label} <LinkSpinner /><span aria-hidden>›</span>
                        </Link>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {s.paragraphs?.map((p) => <p key={p} className="mt-2.5 text-[15px] leading-relaxed first-of-type:mt-0">{p}</p>)}

            {s.prizes && (
              <table className="w-full text-[15px]">
                <tbody className="divide-y divide-gold-100">
                  {s.prizes.rows.map((row, n) => (
                    <tr key={row.place}>
                      <th scope="row" className="py-2 text-left font-medium"><span aria-hidden className="mr-2 inline-block w-5">{["🥇", "🥈", "🥉"][n] ?? "🎁"}</span>{row.place}</th>
                      <td className="num py-2 text-right text-xl text-gold-900">{row.amount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gold-300">
                    <th scope="row" className="pt-3 text-left font-bold text-gold-700">{s.prizes.totalLabel}</th>
                    <td className="num pt-3 text-right text-2xl text-gold-700">{s.prizes.total}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </section>
        ))}
      </main>
    </>
  );
}
