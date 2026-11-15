import { z } from "zod";

export const PAYMENT_MODES = [
  "CASH",
  "MOMO_MTN",
  "MOMO_MOOV",
  "CELTIIS_CASH",
  "TRANSFER",
] as const;

export const paymentModeSchema = z.enum(PAYMENT_MODES);

export const isMomoMode = (mode: string): boolean =>
  mode === "MOMO_MTN" || mode === "MOMO_MOOV" || mode === "CELTIIS_CASH";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ");

export const createPaymentSchema = z.object({
  date: isoDate,
  amount: z.number().int().positive(),
  mode: paymentModeSchema.default("CASH"),
  reference: z.string().trim().max(120).optional(),
  senderPhone: z.string().trim().max(40).optional(),
  smsText: z.string().trim().max(600).optional(),
  note: z.string().trim().max(500).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PaymentMode = (typeof PAYMENT_MODES)[number];
