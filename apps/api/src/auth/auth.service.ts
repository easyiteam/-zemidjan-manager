import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { LoginInput } from "@zm/shared";
import { PrismaService } from "../prisma/prisma.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
import type { AuthPayload } from "./decorators";

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthPayload;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async login({ email, password }: LoginInput): Promise<AuthResult> {
    const user = await this.prisma.client.user.findUnique({ where: { email } });
    const ok = await this.passwords.verifyOrDummy(user?.passwordHash ?? null, password);
    if (!user || !ok) throw new UnauthorizedException("Email ou mot de passe incorrect");

    const payload: AuthPayload = { sub: user.id, email: user.email, name: user.name };
    const accessToken = this.tokens.issueAccessToken(payload);
    const refreshToken = await this.tokens.issueRefreshToken(user.id);
    return { accessToken, refreshToken, user: payload };
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const { userId, token } = await this.tokens.rotateRefreshToken(refreshToken);
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("Compte introuvable");

    const payload: AuthPayload = { sub: user.id, email: user.email, name: user.name };
    return { accessToken: this.tokens.issueAccessToken(payload), refreshToken: token, user: payload };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) await this.tokens.revokeFamily(refreshToken);
  }
}
