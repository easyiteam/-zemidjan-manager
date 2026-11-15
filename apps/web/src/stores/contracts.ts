import { defineStore } from "pinia";
import type { CreateContractInput, CreatePaymentInput, UpdateContractInput } from "@zm/shared";
import * as api from "../api/contracts";
import * as paymentsApi from "../api/payments";
import type { Contract } from "../api/types";

export const useContractsStore = defineStore("contracts", {
  state: () => ({
    items: [] as Contract[],
    loading: false,
    loaded: false,
  }),
  actions: {
    async fetchAll() {
      this.loading = true;
      try {
        this.items = await api.listContracts();
        this.loaded = true;
      } finally {
        this.loading = false;
      }
    },

    async create(data: CreateContractInput) {
      await api.createContract(data);
      await this.fetchAll();
    },

    async update(id: string, data: UpdateContractInput) {
      await api.updateContract(id, data);
      await this.fetchAll();
    },

    async remove(id: string) {
      await api.deleteContract(id);
      await this.fetchAll();
    },

    async addPayment(contractId: string, data: CreatePaymentInput) {
      await api.createPayment(contractId, data);
      await this.fetchAll();
    },

    async removePayment(id: string) {
      await paymentsApi.deletePayment(id);
      await this.fetchAll();
    },
  },
});
