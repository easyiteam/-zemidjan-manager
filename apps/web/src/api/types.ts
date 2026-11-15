import type { ContractStatus, Periodicity, PaymentMode, VehicleType } from "@zm/shared";

export interface Payment {
  id: string;
  contractId: string;
  date: string;
  amount: number;
  mode: PaymentMode;
  reference: string | null;
  senderPhone: string | null;
  captureKey: string | null;
  smsText: string | null;
  note: string | null;
  createdAt: string;
}

export interface Contract {
  id: string;
  driverName: string;
  phone: string | null;
  idNumber: string | null;
  guarantorName: string | null;
  guarantorPhone: string | null;
  vehicleType: VehicleType;
  brand: string | null;
  plateNumber: string | null;
  chassisNumber: string | null;
  periodicity: Periodicity;
  installmentAmount: number;
  startDate: string;
  installmentCount: number;
  initialDeposit: number;
  status: ContractStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  payments: Payment[];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}
