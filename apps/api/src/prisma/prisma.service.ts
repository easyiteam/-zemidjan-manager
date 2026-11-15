import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Se connecte via APP_DATABASE_URL (rôle applicatif à droits limités), jamais
 * via DATABASE_URL (rôle propriétaire, réservé aux migrations).
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient;

  constructor() {
    const url = process.env.APP_DATABASE_URL;
    if (!url) {
      throw new Error("APP_DATABASE_URL manquant — voir apps/api/.env.example");
    }
    this.client = new PrismaClient({ datasources: { db: { url } } });
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
