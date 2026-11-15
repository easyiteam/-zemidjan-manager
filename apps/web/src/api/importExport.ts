import type { ImportContractInput } from "@zm/shared";
import { apiDownload, apiFetch } from "./client";

export const importContracts = (contracts: ImportContractInput[]) =>
  apiFetch<{ created: number; replaced: number }>("/import/excel", {
    method: "POST",
    body: { contracts },
  });

export async function downloadPaymentsCsv(filename: string): Promise<void> {
  const blob = await apiDownload("/export/payments.csv");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
