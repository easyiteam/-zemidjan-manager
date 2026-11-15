import { useAuthStore } from "../stores/auth";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public issues?: Array<{ path: string; message: string }>,
  ) {
    super(message);
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

async function doFetch(path: string, opts: RequestOptions, token: string | null): Promise<Response> {
  const headers = new Headers(opts.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body: BodyInit | undefined;
  if (opts.body !== undefined && !(opts.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(opts.body);
  } else if (opts.body instanceof FormData) {
    body = opts.body;
  }
  return fetch(`/api${path}`, { ...opts, headers, body, credentials: "include" });
}

/** Requête authentifiée avec un unique essai de rafraîchissement sur 401. */
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const auth = useAuthStore();
  let res = await doFetch(path, opts, auth.accessToken);

  if (res.status === 401) {
    const newToken = await auth.refreshToken();
    if (newToken) res = await doFetch(path, opts, newToken);
  }

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json().catch(() => undefined) : undefined;

  if (!res.ok) {
    throw new ApiError(payload?.message ?? `Erreur ${res.status}`, res.status, payload?.issues);
  }
  return payload as T;
}

/** Télécharge une réponse binaire/texte authentifiée (ex: export CSV). */
export async function apiDownload(path: string): Promise<Blob> {
  const auth = useAuthStore();
  let res = await doFetch(path, { method: "GET" }, auth.accessToken);
  if (res.status === 401) {
    const newToken = await auth.refreshToken();
    if (newToken) res = await doFetch(path, { method: "GET" }, newToken);
  }
  if (!res.ok) throw new ApiError(`Erreur ${res.status}`, res.status);
  return res.blob();
}
