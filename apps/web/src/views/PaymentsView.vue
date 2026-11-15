<script setup lang="ts">
import { computed, ref } from "vue";
import { isMomoMode } from "@zm/shared";
import { useContractsStore } from "../stores/contracts";
import { useUiStore } from "../stores/ui";
import { useToast } from "../composables/useToast";
import { captureUrl } from "../api/payments";
import { downloadPaymentsCsv } from "../api/importExport";
import { PAYMENT_MODE_LABELS, formatAmount, formatDateLong } from "../composables/useContractCalc";
import type { Contract, Payment } from "../api/types";

const store = useContractsStore();
const ui = useUiStore();
const { show: toast } = useToast();

const contractFilter = ref("");
const monthFilter = ref("");
const modeFilter = ref<"" | "momo" | "nocap" | "vir">("");

interface Row {
  payment: Payment;
  contract: Contract;
  cumulative: number;
}

const allPayments = computed<Row[]>(() => {
  const rows: Row[] = [];
  for (const contract of store.items) {
    let cumulative = 0;
    const sorted = [...contract.payments].sort((a, b) => (a.date < b.date ? -1 : 1));
    for (const payment of sorted) {
      cumulative += payment.amount;
      rows.push({ payment, contract, cumulative });
    }
  }
  return rows.sort((a, b) => (a.payment.date < b.payment.date ? 1 : -1));
});

const filtered = computed(() =>
  allPayments.value.filter(({ payment, contract }) => {
    if (contractFilter.value && contract.id !== contractFilter.value) return false;
    if (monthFilter.value && !payment.date.startsWith(monthFilter.value)) return false;
    if (modeFilter.value === "momo" && !isMomoMode(payment.mode)) return false;
    if (modeFilter.value === "nocap" && !(isMomoMode(payment.mode) && !payment.captureKey)) return false;
    if (modeFilter.value === "vir" && payment.mode !== "TRANSFER") return false;
    return true;
  }),
);

const total = computed(() => filtered.value.reduce((s, r) => s + r.payment.amount, 0));

const shots = ref<Record<string, string>>({});
async function viewCapture(payment: Payment) {
  if (!payment.captureKey || shots.value[payment.id]) return;
  try {
    const { url } = await captureUrl(payment.id);
    shots.value[payment.id] = url;
    window.open(url, "_blank", "noopener");
  } catch {
    toast("Capture inaccessible");
  }
}

async function onDeletePayment(payment: Payment) {
  await store.removePayment(payment.id);
  toast("Versement annulé");
}

async function onExport() {
  await downloadPaymentsCsv(`versements_zemidjan_${new Date().toISOString().slice(0, 10)}.csv`);
}

const modeLabel = PAYMENT_MODE_LABELS;
</script>

<template>
  <div class="bar">
    <h1>Journal des versements</h1>
    <span class="sp"></span>
    <button type="button" class="btn" @click="onExport">Exporter CSV</button>
    <button type="button" class="btn pri" @click="ui.openPay()">Enregistrer un versement</button>
  </div>
  <div class="bar">
    <select v-model="contractFilter" style="width: auto" aria-label="Filtrer par contrat">
      <option value="">Tous les contrats</option>
      <option v-for="c in store.items" :key="c.id" :value="c.id">{{ c.driverName }} — {{ c.plateNumber || c.vehicleType }}</option>
    </select>
    <input v-model="monthFilter" type="month" style="width: auto" aria-label="Filtrer par mois" />
    <select v-model="modeFilter" style="width: auto" aria-label="Filtrer par mode">
      <option value="">Tous les modes</option>
      <option value="momo">Mobile Money</option>
      <option value="nocap">MoMo sans capture</option>
      <option value="vir">Virement</option>
    </select>
    <span class="sp"></span>
    <b class="num">{{ filtered.length }} versement(s) · {{ formatAmount(total) }} FCFA</b>
  </div>
  <div class="card" style="padding: 6px 14px">
    <table class="stack">
      <thead>
        <tr>
          <th>Date</th>
          <th>Conducteur</th>
          <th>Mode / Réf.</th>
          <th class="r">Montant</th>
          <th class="r">Cumul contrat</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in filtered.slice(0, 500)" :key="row.payment.id">
          <td data-l="Date" class="num">{{ formatDateLong(new Date(row.payment.date)) }}</td>
          <td data-l="Conducteur"><b>{{ row.contract.driverName }}</b></td>
          <td data-l="Mode / Réf.">
            {{ modeLabel[row.payment.mode] }}
            <span v-if="isMomoMode(row.payment.mode)" class="mbadge">MoMo</span>
            <span v-if="row.payment.reference" class="sub"> · ID {{ row.payment.reference }}</span>
            <button v-if="row.payment.captureKey" type="button" class="btn sm" @click="viewCapture(row.payment)">Voir la capture</button>
          </td>
          <td data-l="Montant" class="r num"><b>{{ formatAmount(row.payment.amount) }}</b></td>
          <td data-l="Cumul contrat" class="r num">{{ formatAmount(row.cumulative) }}</td>
          <td class="acts">
            <button type="button" class="btn sm" @click="onDeletePayment(row.payment)">Annuler</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="!filtered.length" class="empty">Aucun versement pour ces critères.</div>
  </div>
</template>
