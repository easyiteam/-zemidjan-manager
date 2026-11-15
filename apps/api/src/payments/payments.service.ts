import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreatePaymentInput } from "@zm/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(contractId: string, data: CreatePaymentInput) {
    const contract = await this.prisma.client.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException("Contrat introuvable");

    const ref = data.reference?.trim();
    if (ref) {
      const dup = await this.prisma.client.payment.findFirst({ where: { reference: ref } });
      if (dup) throw new ConflictException("Cet identifiant de transaction est déjà enregistré");
    }

    return this.prisma.client.payment.create({
      data: { ...data, contractId, date: new Date(`${data.date}T00:00:00Z`) },
    });
  }

  private async findOrThrow(id: string) {
    const payment = await this.prisma.client.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException("Versement introuvable");
    return payment;
  }

  async remove(id: string) {
    const payment = await this.findOrThrow(id);
    if (payment.captureKey) await this.storage.delete(payment.captureKey).catch(() => {});
    await this.prisma.client.payment.delete({ where: { id } });
    return { ok: true };
  }

  async attachCapture(id: string, buffer: Buffer) {
    const payment = await this.findOrThrow(id);
    const key = await this.storage.storeMomoCapture(id, buffer);
    if (payment.captureKey) await this.storage.delete(payment.captureKey).catch(() => {});
    return this.prisma.client.payment.update({ where: { id }, data: { captureKey: key } });
  }

  async captureUrl(id: string) {
    const payment = await this.findOrThrow(id);
    if (!payment.captureKey) throw new NotFoundException("Aucune capture jointe à ce versement");
    return { url: await this.storage.signedGetUrl(payment.captureKey) };
  }
}
