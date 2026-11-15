<script setup lang="ts">
import { computed } from "vue";
import { useContractsStore } from "../stores/contracts";
import { useUiStore } from "../stores/ui";
import KpiCard from "../components/KpiCard.vue";
import MonthlyChart from "../components/MonthlyChart.vue";
import ProgressBar from "../components/ProgressBar.vue";
import StatusTag from "../components/StatusTag.vue";
import { calc, formatAmount, formatDateLong, todayAtNoon, unitLabel } from "../composables/useContractCalc";

const store = useContractsStore();
const ui = useUiStore();

const rows = computed(() => store.items.map((c) => ({ contract: c, k: calc(c) })));

const late = computed(() => rows.value.filter((r) => r.k.arrears > 0 && ["late", "crit", "off"].includes(r.k.st)));
const active = computed(() => rows.value.filter((r) => !["done", "res"].includes(r.k.st)));
const done = computed(() => rows.value.filter((r) => r.k.st === "done"));
const critical = computed(() => rows.value.filter((r) => r.k.st === "crit"));

const paid = computed(() => rows.value.reduce((s, r) => s + r.k.paid, 0));
const total = computed(() => rows.value.reduce((s, r) => s + r.k.total, 0));
const expected = computed(() => rows.value.reduce((s, r) => s + Math.min(r.k.total, r.k.expected), 0));
const arrears = computed(() => late.value.reduce((s, r) => s + r.k.arrears, 0));
const rest = computed(() => rows.value.reduce((s, r) => s + r.k.rest, 0));

const thisMonthKey = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
})();
const thisMonth = computed(() =>
  rows.value.reduce((s, r) => s + r.k.pays.filter((p) => p.date.slice(0, 7) === thisMonthKey).reduce((a, p) => a + p.amount, 0), 0),
);

const headline = computed(() => {
  if (!store.items.length) return "Aucun contrat enregistré";
  if (late.value.length) return `${late.value.length} contrat${late.value.length > 1 ? "s" : ""} sur ${store.items.length} en retard — ${formatAmount(arrears.value)} FCFA à rattraper`;
  return "Tous les contrats sont à jour";
});

const sublead = computed(() => {
  if (!store.items.length) return "Créez un contrat ou importez votre point de paiement Excel pour commencer.";
  const rate = expected.value ? Math.round((paid.value / expected.value) * 100) : 100;
  return `Situation au ${formatDateLong(todayAtNoon())} · taux de recouvrement ${rate} % des sommes exigibles.`;
});

const topEncours = computed(() => active.value.slice().sort((a, b) => b.k.arrears - a.k.arrears));
</script>

<template>
  <h1>Tableau de bord</h1>
  <p class="lead">{{ sublead }}</p>
  <h2 style="margin-top: 14px">{{ headline }}</h2>

  <div class="kpis">
    <KpiCard label="Contrats" :value="store.items.length" :sub="`${active.length} actifs · ${done.length} soldés`" />
    <KpiCard label="En retard" :value="late.length" :sub="`${critical.length} critiques (≥ 4 échéances)`" :alert="late.length > 0" />
    <KpiCard label="Montant en retard" :value="formatAmount(arrears)" sub="FCFA exigibles non versés" :alert="arrears > 0" />
    <KpiCard label="Total perçu (FCFA)" :value="formatAmount(paid)" :sub="`${formatAmount(thisMonth)} ce mois-ci`" />
    <KpiCard label="Reste à recouvrer" :value="formatAmount(rest)" :sub="`sur ${formatAmount(total)} FCFA contractés`" />
  </div>

  <div class="grid2">
    <div class="card">
      <h3>Encaissements mensuels (FCFA)</h3>
      <MonthlyChart :contracts="store.items" />
    </div>
    <div class="card">
      <div class="bar" style="margin-bottom: 8px">
        <h3 style="margin: 0">Contrats en cours</h3>
        <span class="sp"></span>
        <button type="button" class="btn sm pri" @click="ui.openNewContract()">Nouveau contrat</button>
      </div>
      <div v-if="!topEncours.length" class="empty">Aucun contrat en cours.</div>
      <div v-for="{ contract, k } in topEncours" :key="contract.id" class="al" style="cursor: pointer" @click="ui.openDetail(contract.id)">
        <div class="tx">
          <b>{{ contract.driverName }} <span class="sub">· {{ contract.vehicleType }} {{ contract.plateNumber || "" }}</span></b>
          <ProgressBar :pct="k.pct" :epct="k.epct" />
          <div class="pt">
            <span>{{ k.covered }}/{{ k.N }} {{ unitLabel(contract) }} · {{ Math.round(k.pct * 100) }} %</span>
            <span class="num">{{ k.arrears ? `−${formatAmount(k.arrears)} FCFA` : "0 retard" }}</span>
          </div>
        </div>
        <StatusTag :calc="k" />
      </div>
    </div>
  </div>
</template>
