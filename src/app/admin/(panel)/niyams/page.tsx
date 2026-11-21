import { query } from "@/lib/db";
import { AddNiyamForm, NiyamsForm, type NiyamRow, type OptionRow } from "./NiyamsForm";

export const metadata = { title: "Niyams" };

export default async function NiyamsPage() {
  const niyams = await query<NiyamRow>("select id, sort_order, name_gu, name_en, type, points, points_per_unit, max_count, active from niyams order by sort_order, id");
  const options = await query<OptionRow>("select id, niyam_id, label_gu, label_en, points, active from niyam_options order by niyam_id, sort_order, id");

  return (
    <div className="space-y-5">
      <NiyamsForm niyams={niyams} options={options} />
      <AddNiyamForm />
    </div>
  );
}
