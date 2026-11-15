import { Injectable } from "@nestjs/common";
import type { ImportContractInput } from "@zm/shared";
import { isMomoMode } from "@zm/shared";
import { PrismaService } from "../prisma/prisma.service";

// Neutralise l'injection de formule CSV (un conducteur/référence commençant
// par =, +, -, @ ou une tabulation serait interprété comme une formule par
// Excel/LibreOffice à l'ouverture du fichier exporté).
function csvCell(v: unknown): string {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

@Injectable()
export class ImportExportService {
  constructor(private readonly prisma: PrismaService) {}

  async importContracts(contracts: ImportContractInput[]) {
    let created = 0;
    let replaced = 0;
    for (const item of contracts) {
      const { payments, ...contractData } = item;
      const existing = await this.prisma.client.contract.findFirst({
        where: { driverName: { equals: contractData.driverName, mode: "insensitive" } },
      });
      const data = { ...contractData, startDate: new Date(`${contractData.startDate}T00:00:00Z`) };

      if (existing) {
        await this.prisma.client.payment.deleteMany({ where: { contractId: existing.id } });
        await this.prisma.client.contract.update({
          where: { id: existing.id },
          data: {
            ...data,
            payments: {
              create: payments.map((p) => ({ ...p, date: new Date(`${p.date}T00:00:00Z`) })),
            },
          },
        });
        replaced++;
      } else {
        await this.prisma.client.contract.create({
          data: {
            ...data,
            payments: {
              create: payments.map((p) => ({ ...p, date: new Date(`${p.date}T00:00:00Z`) })),
            },
          },
        });
        created++;
      }
    }
    return { created, replaced };
  }

  async exportPaymentsCsv(): Promise<string> {
    const contracts = await this.prisma.client.contract.findMany({
      include: { payments: { orderBy: { date: "asc" } } },
    });

    const header = [
      "Date",
      "Conducteur",
      "Type",
      "Immatriculation",
      "Montant (FCFA)",
      "Mode",
      "Référence / ID transaction",
      "Expéditeur MoMo",
      "Capture jointe",
      "Cumul contrat",
    ];
    const rows: string[] = [header.map(csvCell).join(";")];

    for (const c of contracts) {
      let cumul = 0;
      for (const p of c.payments) {
        cumul += p.amount;
        rows.push(
          [
            p.date.toISOString().slice(0, 10),
            c.driverName,
            c.vehicleType,
            c.plateNumber ?? "",
            p.amount,
            p.mode,
            p.reference ?? "",
            p.senderPhone ?? "",
            isMomoMode(p.mode) ? (p.captureKey ? "Oui" : "Non") : "",
            cumul,
          ]
            .map(csvCell)
            .join(";"),
        );
      }
    }
    return "﻿" + rows.join("\r\n");
  }
}
