import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./helpers/app";
import { createUser } from "./helpers/auth";

describe("Auth (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("refuses un login avec un email inconnu", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "inconnu@zm.test", password: "password123" })
      .expect(401);
  });

  it("connecte un utilisateur valide et pose un cookie de refresh", async () => {
    await createUser(app, "gerant@zm.test", "password123", "Le Gérant");

    const res = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "gerant@zm.test", password: "password123" })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe("gerant@zm.test");
    expect(res.headers["set-cookie"]?.[0]).toMatch(/zm_refresh=/);
  });

  it("refuse l'accès à une route protégée sans token", async () => {
    await request(app.getHttpServer()).get("/api/contracts").expect(401);
  });

  it("fait pivoter le refresh token et détecte le rejeu de l'ancien", async () => {
    await createUser(app, "rotate@zm.test", "password123", "Rotate");
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "rotate@zm.test", password: "password123" });
    const oldCookie = login.headers["set-cookie"][0];

    const refreshed = await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .set("Cookie", oldCookie)
      .expect(201);
    expect(refreshed.body.accessToken).toBeDefined();

    // Rejouer l'ancien cookie (déjà pivoté) doit révoquer la famille.
    await request(app.getHttpServer()).post("/api/auth/refresh").set("Cookie", oldCookie).expect(401);

    const newCookie = refreshed.headers["set-cookie"][0];
    await request(app.getHttpServer()).post("/api/auth/refresh").set("Cookie", newCookie).expect(401);
  });

  it("révoque la session au logout", async () => {
    await createUser(app, "logout@zm.test", "password123", "Logout");
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "logout@zm.test", password: "password123" });
    const cookie = login.headers["set-cookie"][0];

    await request(app.getHttpServer()).post("/api/auth/logout").set("Cookie", cookie).expect(201);
    await request(app.getHttpServer()).post("/api/auth/refresh").set("Cookie", cookie).expect(401);
  });
});
