import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const service = new PasswordService();

  it("hash puis vérifie un mot de passe correct", async () => {
    const hash = await service.hash("correct-password");
    await expect(service.verify(hash, "correct-password")).resolves.toBe(true);
  });

  it("rejette un mauvais mot de passe", async () => {
    const hash = await service.hash("correct-password");
    await expect(service.verify(hash, "wrong-password")).resolves.toBe(false);
  });

  it("verifyOrDummy renvoie false sans hash (compte inexistant) sans lever d'erreur", async () => {
    await expect(service.verifyOrDummy(null, "anything")).resolves.toBe(false);
  });
});
