import { StorageService } from "./storage.service";
import { MemoryStorageDriver } from "./drivers/memory-storage.driver";

describe("StorageService", () => {
  it("accepte une image JPEG valide et renvoie une clé namespacée au versement", async () => {
    const driver = new MemoryStorageDriver();
    const svc = new StorageService(driver);
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from("fake-rest")]);

    const key = await svc.storeMomoCapture("payment-1", jpeg);
    expect(key).toMatch(/^payments\/payment-1\//);
  });

  it("rejette un contenu qui n'est pas une image reconnue", async () => {
    const driver = new MemoryStorageDriver();
    const svc = new StorageService(driver);
    await expect(svc.storeMomoCapture("payment-1", Buffer.from("not-an-image"))).rejects.toThrow();
  });

  it("rejette un fichier trop lourd", async () => {
    const driver = new MemoryStorageDriver();
    const svc = new StorageService(driver);
    const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(21 * 1024 * 1024)]);
    await expect(svc.storeMomoCapture("payment-1", big)).rejects.toThrow();
  });
});
