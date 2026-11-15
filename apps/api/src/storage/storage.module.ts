import { Global, Module, type OnModuleInit } from "@nestjs/common";
import { MemoryStorageDriver } from "./drivers/memory-storage.driver";
import { S3StorageDriver } from "./drivers/s3-storage.driver";
import { StorageService } from "./storage.service";
import { FILE_STORAGE } from "./storage.tokens";

@Global()
@Module({
  providers: [
    {
      provide: FILE_STORAGE,
      useFactory: () => {
        const driver = process.env.STORAGE_DRIVER ?? "memory";
        if (driver === "s3") return new S3StorageDriver();
        if (process.env.NODE_ENV === "production") {
          throw new Error("STORAGE_DRIVER=memory interdit en production — configurez S3_*");
        }
        return new MemoryStorageDriver();
      },
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule implements OnModuleInit {
  async onModuleInit() {
    if (process.env.STORAGE_DRIVER === "s3") {
      const driver = new S3StorageDriver();
      await driver.ensureBucket();
    }
  }
}
