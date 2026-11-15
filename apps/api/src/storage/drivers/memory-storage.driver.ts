import { Injectable } from "@nestjs/common";
import type { StorageDriver } from "../storage-driver.interface";

/** Driver de dev/test : garde les fichiers en mémoire du process. */
@Injectable()
export class MemoryStorageDriver implements StorageDriver {
  private readonly files = new Map<string, { body: Buffer; contentType: string }>();

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    this.files.set(key, { body, contentType });
  }

  async delete(key: string): Promise<void> {
    this.files.delete(key);
  }

  async signedGetUrl(key: string): Promise<string> {
    const file = this.files.get(key);
    if (!file) throw new Error(`Fichier introuvable en mémoire : ${key}`);
    return `data:${file.contentType};base64,${file.body.toString("base64")}`;
  }
}
