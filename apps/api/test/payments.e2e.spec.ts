import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./helpers/app";
import { loginAs } from "./helpers/auth";

describe("Payments (e2e)", () => {
  let app: INestApplication;
  let token: string;
  let contractId: string;

  beforeAll(async () => {
    app = await createTestApp();
    ({ accessToken: token } = await loginAs(app, "payments@zm.test", "password123", "Testeur"));
    const create = await request(app.getHttpServer())
      .post("/api/contracts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        driverName: "HABIB",
        vehicleType: "TRICYCLE",
        periodicity: "WEEKLY",
        installmentAmount: 22500,
        startDate: "2026-01-05",
        installmentCount: 120,
      });
    contractId = create.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = (req: request.Test) => req.set("Authorization", `Bearer ${token}`);

  it("enregistre un versement espèces", async () => {
    const res = await auth(
      request(app.getHttpServer()).post(`/api/contracts/${contractId}/payments`),
    ).send({ date: "2026-01-05", amount: 22500, mode: "CASH" });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(22500);
  });

  it("rejette un versement MoMo avec un ID de transaction déjà utilisé", async () => {
    const first = await auth(
      request(app.getHttpServer()).post(`/api/contracts/${contractId}/payments`),
    ).send({ date: "2026-01-12", amount: 22500, mode: "MOMO_MTN", reference: "TX-DUP-1" });
    expect(first.status).toBe(201);

    const dup = await auth(
      request(app.getHttpServer()).post(`/api/contracts/${contractId}/payments`),
    ).send({ date: "2026-01-19", amount: 22500, mode: "MOMO_MTN", reference: "TX-DUP-1" });
    expect(dup.status).toBe(409);
  });

  it("supprime un versement", async () => {
    const created = await auth(
      request(app.getHttpServer()).post(`/api/contracts/${contractId}/payments`),
    ).send({ date: "2026-01-26", amount: 22500, mode: "CASH" });

    await auth(request(app.getHttpServer()).delete(`/api/payments/${created.body.id}`)).expect(200);
  });

  it("404 sur un versement attaché à un contrat inconnu", async () => {
    const res = await auth(
      request(app.getHttpServer()).post("/api/contracts/00000000-0000-0000-0000-000000000000/payments"),
    ).send({ date: "2026-01-05", amount: 1000, mode: "CASH" });
    expect(res.status).toBe(404);
  });
});
