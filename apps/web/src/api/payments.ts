import { apiFetch } from "./client";

export const deletePayment = (id: string) => apiFetch<{ ok: true }>(`/payments/${id}`, { method: "DELETE" });

export async function attachCapture(paymentId: string, file: File): Promise<{ captureKey: string }> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch(`/payments/${paymentId}/capture`, { method: "POST", body: form });
}

export const captureUrl = (paymentId: string) =>
  apiFetch<{ url: string }>(`/payments/${paymentId}/capture-url`);
