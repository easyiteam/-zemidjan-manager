import type { CreateContractInput, CreatePaymentInput, UpdateContractInput } from "@zm/shared";
import { apiFetch } from "./client";
import type { Contract } from "./types";

export const listContracts = () => apiFetch<Contract[]>("/contracts");

export const getContract = (id: string) => apiFetch<Contract>(`/contracts/${id}`);

export const createContract = (data: CreateContractInput) =>
  apiFetch<Contract>("/contracts", { method: "POST", body: data });

export const updateContract = (id: string, data: UpdateContractInput) =>
  apiFetch<Contract>(`/contracts/${id}`, { method: "PATCH", body: data });

export const deleteContract = (id: string) =>
  apiFetch<{ ok: true }>(`/contracts/${id}`, { method: "DELETE" });

export const createPayment = (contractId: string, data: CreatePaymentInput) =>
  apiFetch(`/contracts/${contractId}/payments`, { method: "POST", body: data });
