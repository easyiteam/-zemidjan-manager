export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  /** URL de lecture temporaire (ou data URL en mode mémoire). */
  signedGetUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
