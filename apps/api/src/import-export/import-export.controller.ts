import { Body, Controller, Get, Header, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { importRequestSchema, type ImportRequestInput } from "@zm/shared";
import { ZodPipe } from "../common/zod.pipe";
import { ImportExportService } from "./import-export.service";

@Controller()
export class ImportExportController {
  constructor(private readonly svc: ImportExportService) {}

  @Post("import/excel")
  import(@Body(new ZodPipe(importRequestSchema)) body: ImportRequestInput) {
    return this.svc.importContracts(body.contracts);
  }

  @Get("export/payments.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  async export(@Res() res: Response) {
    const csv = await this.svc.exportPaymentsCsv();
    const filename = `versements_zemidjan_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
