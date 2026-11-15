import { z } from "zod";
import { createContractSchema } from "./contract";
import { createPaymentSchema } from "./payment";

/** Un contrat + son historique de versements, tel que parsé côté client
 *  depuis un fichier Excel (un onglet = un conducteur). */
export const importContractSchema = createContractSchema.extend({
  payments: z.array(createPaymentSchema).default([]),
});

export const importRequestSchema = z.object({
  contracts: z.array(importContractSchema).min(1),
});

export type ImportContractInput = z.infer<typeof importContractSchema>;
export type ImportRequestInput = z.infer<typeof importRequestSchema>;
