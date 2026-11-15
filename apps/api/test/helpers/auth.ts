import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../../src/prisma/prisma.service";
import { PasswordService } from "../../src/auth/password.service";

export async function createUser(app: INestApplication, email: string, password: string, name: string) {
  const prisma = app.get(PrismaService);
  const passwords = app.get(PasswordService);
  return prisma.client.user.create({
    data: { email, name, passwordHash: await passwords.hash(password) },
  });
}

/** Crée un compte puis se connecte — retourne le token d'accès et le cookie de session. */
export async function loginAs(app: INestApplication, email: string, password: string, name: string) {
  await createUser(app, email, password, name);
  const res = await request(app.getHttpServer()).post("/api/auth/login").send({ email, password });
  const cookie = res.headers["set-cookie"]?.[0] ?? "";
  return { accessToken: res.body.accessToken as string, cookie };
}
