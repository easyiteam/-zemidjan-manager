import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthPayload } from "./decorators";

const ACCESS_TTL = "15m";
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours
// Durée de vie maximale d'une famille de refresh tokens, même en cas de
// rotation continue — force une reconnexion périodique.
const FAMILY_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 jours

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function accessSecret(): string {
  const s = process.env.JWT_ACCESS_SECRET;
  if (!s) throw new Error("JWT_ACCESS_SECRET manquant");
  return s;
}

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  issueAccessToken(user: AuthPayload): string {
    return jwt.sign(user, accessSecret(), { expiresIn: ACCESS_TTL });
  }

  /** Crée une nouvelle famille de refresh tokens pour un login. */
  async issueRefreshToken(userId: string): Promise<string> {
    const familyId = randomUUID();
    const raw = randomBytes(32).toString("hex");
    await this.prisma.client.session.create({
      data: {
        userId,
        familyId,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return `${familyId}.${raw}`;
  }

  /**
   * Fait pivoter un refresh token. Le swap (vérification du hash + écriture
   * du nouveau) est une seule opération atomique conditionnée sur l'ancien
   * hash : si deux requêtes tentent de pivoter le même jeton en même temps
   * (ou si le jeton présenté est périmé/déjà pivoté — rejeu), une seule
   * réussit et l'autre révoque la famille entière.
   */
  async rotateRefreshToken(token: string): Promise<{ userId: string; token: string }> {
    const [familyId, raw] = token.split(".");
    if (!familyId || !raw) throw new UnauthorizedException("Jeton invalide");

    const session = await this.prisma.client.session.findFirst({
      where: { familyId },
      orderBy: { createdAt: "desc" },
    });
    const familyTooOld = session && Date.now() - session.createdAt.getTime() > FAMILY_MAX_AGE_MS;
    if (!session || session.revokedAt || session.expiresAt < new Date() || familyTooOld) {
      throw new UnauthorizedException("Session expirée — veuillez vous reconnecter");
    }

    const newRaw = randomBytes(32).toString("hex");
    const { count } = await this.prisma.client.session.updateMany({
      where: { id: session.id, tokenHash: sha256(raw), revokedAt: null },
      data: { tokenHash: sha256(newRaw), expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
    });
    if (count !== 1) {
      await this.prisma.client.session.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Rejeu détecté — veuillez vous reconnecter");
    }
    return { userId: session.userId, token: `${familyId}.${newRaw}` };
  }

  async revokeFamily(token: string): Promise<void> {
    const [familyId] = token.split(".");
    if (!familyId) return;
    await this.prisma.client.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
