import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateContractInput, UpdateContractInput } from "@zm/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.client.contract.findMany({
      include: { payments: { orderBy: { date: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const contract = await this.prisma.client.contract.findUnique({
      where: { id },
      include: { payments: { orderBy: { date: "asc" } } },
    });
    if (!contract) throw new NotFoundException("Contrat introuvable");
    return contract;
  }

  create(data: CreateContractInput) {
    return this.prisma.client.contract.create({
      data: { ...data, startDate: new Date(`${data.startDate}T00:00:00Z`) },
      include: { payments: true },
    });
  }

  async update(id: string, data: UpdateContractInput) {
    await this.findOne(id);
    return this.prisma.client.contract.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(`${data.startDate}T00:00:00Z`) : undefined,
      },
      include: { payments: { orderBy: { date: "asc" } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.client.contract.delete({ where: { id } });
    return { ok: true };
  }
}
