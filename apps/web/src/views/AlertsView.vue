<script setup lang="ts">
import { computed } from "vue";
import { useContractsStore } from "../stores/contracts";
import { useUiStore } from "../stores/ui";
import { alertsOf } from "../composables/useContractCalc";

const store = useContractsStore();
const ui = useUiStore();

const alerts = computed(() => alertsOf(store.items));
</script>

<template>
  <h1>Alertes</h1>
  <p class="lead">Retards, conducteurs sans versement récent, fins de contrat et fiches incomplètes.</p>
  <div class="card" style="margin-top: 18px">
    <div v-if="!alerts.length" class="empty">Aucune alerte.</div>
    <div v-for="(alert, i) in alerts" :key="`${alert.contract.id}-${i}`" class="al" :style="{ '--c': alert.color }">
      <span class="dot"></span>
      <div class="tx">
        <b>{{ alert.contract.driverName }} — {{ alert.title }}</b>
        <span class="sub">{{ alert.detail }}</span>
      </div>
      <button type="button" class="btn sm" @click="ui.openDetail(alert.contract.id)">Ouvrir</button>
    </div>
  </div>
</template>
