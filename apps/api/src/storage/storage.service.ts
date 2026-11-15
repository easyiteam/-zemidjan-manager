import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { StorageDriver } from "./storage-driver.interface";
import { FILE_STORAGE } from "./storage.tokens";

const MAX_SIZE = 20 * 1024 * 1024; // 20 Mo, comme l'artefact d'origine

const MAGIC_BYTES: Array<{ ext: string; contentType: string; bytes: number[] }> = [
  { ext: "jpg", contentType: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { ext: "png", contentType: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "webp", contentType: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

function detect(buffer: Buffer) {
  return MAGIC_BYTES.find((m) => m.bytes.every((b, i) => buffer[i] === b));
}

@Injectable()
export class StorageService {
  constructor(@Inject(FILE_STORAGE) private readonly driver: StorageDriver) {}

  async storeMomoCapture(paymentId: string, buffer: Buffer): Promise<string> {
    if (buffer.length > MAX_SIZE) throw new BadRequestException("Image trop lourde (20 Mo max)");
    const detected = detect(buffer);
    if (!detected) throw new BadRequestException("Format d'image non reconnu (jpeg/png/webp attendus)");

    const key = `payments/${paymentId}/${randomUUID()}.${detected.ext}`;
    await this.driver.put(key, buffer, detected.contentType);
    return key;
  }

  async delete(key: string): Promise<void> {
    await this.driver.delete(key);
  }

  signedGetUrl(key: string): Promise<string> {
    return this.driver.signedGetUrl(key);
  }
}
