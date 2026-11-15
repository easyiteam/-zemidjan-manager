import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageModule } from "./storage/storage.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { ContractsModule } from "./contracts/contracts.module";
import { PaymentsModule } from "./payments/payments.module";
import { ImportExportModule } from "./import-export/import-export.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [PrismaModule, StorageModule, AuthModule, ContractsModule, PaymentsModule, ImportExportModule],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
