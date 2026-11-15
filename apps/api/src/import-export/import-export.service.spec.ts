import { ImportExportService } from "./import-export.service";
import type { PrismaService } from "../prisma/prisma.service";

function fakePrisma(contracts: unknown[]): PrismaService {
  return {
    client: {
      contract: { findMany: async () => contracts },
    },
  } as unknown as PrismaService;
}

describe("ImportExportService — export CSV", () => {
  it("neutralise une valeur qui ressemble à une formule (injection CSV)", async () => {
    const svc = new ImportExportService(
      fakePrisma([
        {
          driverName: '=cmd|"/c calc"!A1',
          vehicleType: "MOTO",
          plateNumber: "@SUM(1+1)",
          payments: [
            { date: new Date("2026-01-05"), amount: 1000, mode: "CASH", reference: "+1", senderPhone: "", captureKey: null },
          ],
        },
      ]),
    );

    const csv = await svc.exportPaymentsCsv();
    expect(csv).toContain("\"'=cmd");
    expect(csv).toContain("\"'@SUM");
    expect(csv).toContain("\"'+1\"");
  });

  it("laisse une valeur normale intacte", async () => {
    const svc = new ImportExportService(
      fakePrisma([
        {
          driverName: "ASSOGBA Cyr",
          vehicleType: "TRICYCLE",
          plateNumber: "AB-1234",
          payments: [
            { date: new Date("2026-01-05"), amount: 25000, mode: "CASH", reference: "", senderPhone: "", captureKey: null },
          ],
        },
      ]),
    );

    const csv = await svc.exportPaymentsCsv();
    expect(csv).toContain("ASSOGBA Cyr");
    expect(csv).not.toContain("'ASSOGBA");
  });
});
