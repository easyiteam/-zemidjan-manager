import { defineStore } from "pinia";

export const useUiStore = defineStore("ui", {
  state: () => ({
    detailId: null as string | null,
    formOpen: false,
    formContractId: null as string | null,
    payOpen: false,
    payContractId: null as string | null,
    importOpen: false,
  }),
  actions: {
    openDetail(id: string) {
      this.detailId = id;
    },
    closeDetail() {
      this.detailId = null;
    },
    openNewContract() {
      this.formContractId = null;
      this.formOpen = true;
    },
    openEditContract(id: string) {
      this.formContractId = id;
      this.formOpen = true;
    },
    closeForm() {
      this.formOpen = false;
    },
    openPay(contractId: string | null = null) {
      this.payContractId = contractId;
      this.payOpen = true;
    },
    closePay() {
      this.payOpen = false;
    },
    openImport() {
      this.importOpen = true;
    },
    closeImport() {
      this.importOpen = false;
    },
  },
});
