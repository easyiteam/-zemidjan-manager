import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import jwt from "jsonwebtoken";
import { IS_PUBLIC_KEY, type AuthPayload } from "./decorators";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException("Authentification requise");

    try {
      const secret = process.env.JWT_ACCESS_SECRET;
      if (!secret) throw new Error("JWT_ACCESS_SECRET manquant");
      req.user = jwt.verify(token, secret) as AuthPayload;
      return true;
    } catch {
      throw new UnauthorizedException("Session expirée ou invalide");
    }
  }
}
