import type { LoginInput } from "@zm/shared";
import type { AuthUser } from "./types";

export interface AuthResponse {
  accessToken: string;
  user: { sub: string; email: string; name: string };
}

const BASE = "/api/auth";

async function parse(res: Response): Promise<AuthResponse> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message ?? "Échec de l'authentification");
  return body as AuthResponse;
}

function toUser(u: AuthResponse["user"]): AuthUser {
  return { id: u.sub, email: u.email, name: u.name };
}

export async function login(input: LoginInput): Promise<{ accessToken: string; user: AuthUser }> {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const data = await parse(res);
  return { accessToken: data.accessToken, user: toUser(data.user) };
}

export async function refresh(): Promise<{ accessToken: string; user: AuthUser } | null> {
  const res = await fetch(`${BASE}/refresh`, { method: "POST", credentials: "include" });
  if (!res.ok) return null;
  const data = await parse(res);
  return { accessToken: data.accessToken, user: toUser(data.user) };
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/logout`, { method: "POST", credentials: "include" }).catch(() => {});
}
