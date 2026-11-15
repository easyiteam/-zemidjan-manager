import type { ImportContractInput } from "@zm/shared";
import { DAY_MS, isoDate, parseDate } from "../composables/useContractCalc";

function excelCellToIso(v: unknown): string | null {
  if (v instanceof Date) return isoDate(new Date(v.getFullYear(), v.getMonth(), v.getDate(), 12));
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * DAY_MS));
    return isoDate(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
  }
  const m = String(v || "").match(/(\d{1,2})\D+0*(\d{1,2})\D+(\d{4})/);
  return m ? `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}` : null;
}

/** Un onglet = un conducteur. Colonnes attendues : N° échéance, Montant, Date. */
export async function parseExcelFile(file: File): Promise<ImportContractInput[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { cellDates: true });
  const result: ImportContractInput[] = [];

  for (const sheetName of wb.SheetNames) {
    const rows = (XLSX.utils.sheet_to_json(wb.Sheets[sheetName]!, { header: 1, raw: true }) as unknown[][]).filter(
      (r) => typeof r[0] === "number",
    );
    if (!rows.length) continue;

    const payments: ImportContractInput["payments"] = [];
    let prevDate: string | null = null;
    rows.forEach((row) => {
      const amount = Number(row[1]);
      if (!(amount > 0)) return;
      const date = excelCellToIso(row[2]) ?? (prevDate ? isoDate(new Date(+parseDate(prevDate) + 7 * DAY_MS)) : null);
      if (!date) return;
      prevDate = date;
      payments.push({ date, amount, mode: "CASH", note: "Import Excel" });
    });
    if (!payments.length) continue;

    const freq = new Map<number, number>();
    for (const p of payments) freq.set(p.amount, (freq.get(p.amount) ?? 0) + 1);
    const installmentAmount = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]![0];

    result.push({
      driverName: sheetName.trim(),
      vehicleType: "MOTO",
      periodicity: "WEEKLY",
      installmentAmount,
      startDate: payments[0]!.date,
      installmentCount: rows.length,
      initialDeposit: 0,
      status: "ACTIVE",
      notes: `Importé de ${file.name} — vérifier type, immatriculation et versement.`,
      payments,
    });
  }
  return result;
}
