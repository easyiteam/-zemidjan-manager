import { z } from "zod";

export const VEHICLE_TYPES = ["MOTO", "TRICYCLE"] as const;
export const PERIODICITIES = ["WEEKLY", "MONTHLY"] as const;
export const CONTRACT_STATUSES = ["ACTIVE", "SUSPENDED", "TERMINATED"] as const;

export const vehicleTypeSchema = z.enum(VEHICLE_TYPES);
export const periodicitySchema = z.enum(PERIODICITIES);
export const contractStatusSchema = z.enum(CONTRACT_STATUSES);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ");

export const createContractSchema = z.object({
  driverName: z.string().trim().min(1, "Nom du conducteur requis"),
  phone: z.string().trim().max(40).optional(),
  idNumber: z.string().trim().max(60).optional(),
  guarantorName: z.string().trim().max(120).optional(),
  guarantorPhone: z.string().trim().max(40).optional(),
  vehicleType: vehicleTypeSchema,
  brand: z.string().trim().max(80).optional(),
  plateNumber: z
    .string()
    .trim()
    .max(20)
    .transform((v) => v.toUpperCase())
    .optional(),
  chassisNumber: z.string().trim().max(60).optional(),
  periodicity: periodicitySchema,
  installmentAmount: z.number().int().positive(),
  startDate: isoDate,
  installmentCount: z.number().int().positive(),
  initialDeposit: z.number().int().nonnegative().default(0),
  status: contractStatusSchema.default("ACTIVE"),
  notes: z.string().trim().max(2000).optional(),
});

export const updateContractSchema = createContractSchema.partial();

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type VehicleType = (typeof VEHICLE_TYPES)[number];
export type Periodicity = (typeof PERIODICITIES)[number];
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];
