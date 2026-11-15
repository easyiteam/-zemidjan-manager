import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { createPaymentSchema, type CreatePaymentInput } from "@zm/shared";
import { ZodPipe } from "../common/zod.pipe";
import { PaymentsService } from "./payments.service";

const UPLOAD_OPTS = {
  storage: memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
};

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("contracts/:contractId/payments")
  create(
    @Param("contractId") contractId: string,
    @Body(new ZodPipe(createPaymentSchema)) body: CreatePaymentInput,
  ) {
    return this.payments.create(contractId, body);
  }

  @Delete("payments/:id")
  remove(@Param("id") id: string) {
    return this.payments.remove(id);
  }

  @Post("payments/:id/capture")
  @UseInterceptors(FileInterceptor("file", UPLOAD_OPTS))
  attachCapture(@Param("id") id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("Fichier image requis");
    return this.payments.attachCapture(id, file.buffer);
  }

  @Get("payments/:id/capture-url")
  captureUrl(@Param("id") id: string) {
    return this.payments.captureUrl(id);
  }
}
