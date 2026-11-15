import { SetMetadata, createParamDecorator, type ExecutionContext } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
/** Marque une route comme accessible sans authentification. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export interface AuthPayload {
  sub: string;
  email: string;
  name: string;
}

/** Injecte l'utilisateur authentifié (posé par JwtAuthGuard) dans un handler. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthPayload => {
  const req = ctx.switchToHttp().getRequest();
  return req.user;
});
