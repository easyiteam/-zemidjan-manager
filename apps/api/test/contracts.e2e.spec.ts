import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./helpers/app";
import { loginAs } from "./helpers/auth";

describe("Contracts (e2e)", () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    ({ accessToken: token } = await loginAs(app, "contracts@zm.test", "password123", "Testeur"));
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = (req: request.Test) => req.set("Authorization", `Bearer ${token}`);

  it("crée un contrat puis le retrouve dans la liste", async () => {
    const create = await auth(request(app.getHttpServer()).post("/api/contracts")).send({
      driverName: "ASSOGBA Cyr",
      vehicleType: "TRICYCLE",
      periodicity: "WEEKLY",
      installmentAmount: 25000,
      startDate: "2026-01-05",
      installmentCount: 120,
    });
    expect(create.status).toBe(201);
    expect(create.body.driverName).toBe("ASSOGBA Cyr");

    const list = await auth(request(app.getHttpServer()).get("/api/contracts"));
    expect(list.status).toBe(200);
    expect(list.body.some((c: { id: string }) => c.id === create.body.id)).toBe(true);
  });

  it("rejette un contrat sans champs obligatoires", async () => {
    const res = await auth(request(app.getHttpServer()).post("/api/contracts")).send({
      driverName: "",
    });
    expect(res.status).toBe(400);
  });

  it("modifie puis supprime un contrat", async () => {
    const create = await auth(request(app.getHttpServer()).post("/api/contracts")).send({
      driverName: "HOUNNOUNVI",
      vehicleType: "MOTO",
      periodicity: "WEEKLY",
      installmentAmount: 12000,
      startDate: "2026-02-01",
      installmentCount: 70,
    });
    const id = create.body.id;

    const patch = await auth(request(app.getHttpServer()).patch(`/api/contracts/${id}`)).send({
      status: "SUSPENDED",
    });
    expect(patch.status).toBe(200);
    expect(patch.body.status).toBe("SUSPENDED");

    await auth(request(app.getHttpServer()).delete(`/api/contracts/${id}`)).expect(200);
    await auth(request(app.getHttpServer()).get(`/api/contracts/${id}`)).expect(404);
  });
});
