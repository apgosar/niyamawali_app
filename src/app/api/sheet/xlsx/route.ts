import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getStudent } from "@/lib/auth";
import { getLang } from "@/lib/lang";
import { dictionaries } from "@/i18n";
import { monthOf, todayIST } from "@/lib/dates";
import { buildSheet, parsePart, sheetMonth } from "@/lib/sheet";

const thin = { style: "thin" as const, color: { argb: "FF444444" } };
const border = { top: thin, left: thin, bottom: thin, right: thin };
const DOW = { en: ["S", "M", "T", "W", "T", "F", "S"], gu: ["ર", "સો", "મં", "બુ", "ગુ", "શુ", "શ"] };

/** The printable niyam sheet as an Excel file (landscape A4, fits on one page). */
export async function GET(req: Request) {
  const student = await getStudent();
  if (!student) return new NextResponse("Unauthorized", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const month = sheetMonth(sp.get("month") ?? undefined, monthOf(todayIST()));
  const part = parsePart(sp.get("part") ?? undefined);
  const lang = await getLang();
  const t = dictionaries[lang].sheet;
  const data = await buildSheet(month, part, lang);
  const font = lang === "gu" ? "Nirmala UI" : "Calibri";
  const name = `${student.first_name} ${student.surname}`;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Niyamawali", {
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } },
  });
  const nDays = data.days.length;
  const lastCol = 3 + nDays;
  ws.columns = [
    { width: 5 }, { width: 62 }, { width: 8 },
    ...data.days.map(() => ({ width: nDays > 16 ? 4.3 : 8 })),
  ];

  const title = ws.addRow(["Divine Sanskar Shibir – Niyamawali · " + t.sheetTitle]);
  ws.mergeCells(1, 1, 1, lastCol);
  title.font = { name: font, size: 16, bold: true, color: { argb: "FF7E5818" } };
  title.height = 26;
  const info = ws.addRow([`${name}   |   ID: ${student.student_code}   |   ${data.monthText}`]);
  ws.mergeCells(2, 1, 2, lastCol);
  info.font = { name: font, size: 12, bold: true };
  info.height = 20;
  ws.addRow([]);

  const head = ws.addRow(["#", t.niyam, t.points, ...data.days.map((d) => d.day)]);
  const dow = ws.addRow(["", "", "", ...data.days.map((d) => DOW[lang][d.dow])]);
  for (const r of [head, dow]) {
    r.font = { name: font, size: 10, bold: true };
    r.alignment = { horizontal: "center", vertical: "middle" };
    r.height = 18;
  }
  ws.mergeCells(head.number, 1, dow.number, 1);
  ws.mergeCells(head.number, 2, dow.number, 2);
  ws.mergeCells(head.number, 3, dow.number, 3);

  for (const r of data.rows) {
    const row = ws.addRow([r.no, r.name, r.points]);
    row.height = 20;
    row.font = { name: font, size: 11 };
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(2).alignment = { vertical: "middle", wrapText: false };
    row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
  }
  const total = ws.addRow(["", t.total]);
  total.height = 22;
  total.font = { name: font, size: 11, bold: true };
  total.getCell(2).alignment = { horizontal: "right", vertical: "middle" };

  // borders + light shading on Sundays
  for (let r = head.number; r <= total.number; r++) {
    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(r, c);
      cell.border = border;
      if (c > 3 && data.days[c - 4].dow === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFE3C8" } };
    }
  }
  for (let c = 1; c <= lastCol; c++) {
    for (const r of [head, dow]) ws.getCell(r.number, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5E6BD" } };
  }

  ws.addRow([]);
  const legend = [t.legendTick, data.hasCount ? t.legendCount : "", data.choiceLegend ? t.legendChoice.replace("{opts}", data.choiceLegend) : ""].filter(Boolean).join("  ");
  const l = ws.addRow([legend]);
  ws.mergeCells(l.number, 1, l.number, lastCol);
  l.font = { name: font, size: 10 };
  const sign = ws.addRow([`${t.signStudent}: ____________________      ${t.signWarden}: ____________________      ${t.signParent}: ____________________`]);
  ws.mergeCells(sign.number, 1, sign.number, lastCol);
  sign.font = { name: font, size: 11 };
  sign.height = 30;
  const foot = ws.addRow([t.footer.replace("{id}", student.student_code)]);
  ws.mergeCells(foot.number, 1, foot.number, lastCol);
  foot.font = { name: font, size: 9, italic: true };

  ws.views = [{ state: "frozen", xSplit: 3, ySplit: dow.number }];

  const buf = await wb.xlsx.writeBuffer();
  const file = `niyam-sheet-${student.student_code}-${month}${part === "full" ? "" : "-" + part}.xlsx`;
  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
