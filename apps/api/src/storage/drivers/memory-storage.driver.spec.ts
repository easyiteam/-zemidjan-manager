import { MemoryStorageDriver } from "./memory-storage.driver";

describe("MemoryStorageDriver", () => {
  it("stocke puis relit un fichier sous forme de data URL", async () => {
    const driver = new MemoryStorageDriver();
    const body = Buffer.from([0xff, 0xd8, 0xff]);
    await driver.put("k1", body, "image/jpeg");

    const url = await driver.signedGetUrl("k1");
    expect(url).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("lève une erreur pour une clé inconnue", async () => {
    const driver = new MemoryStorageDriver();
    await expect(driver.signedGetUrl("inconnu")).rejects.toThrow();
  });

  it("supprime un fichier", async () => {
    const driver = new MemoryStorageDriver();
    await driver.put("k2", Buffer.from("x"), "image/png");
    await driver.delete("k2");
    await expect(driver.signedGetUrl("k2")).rejects.toThrow();
  });
});
