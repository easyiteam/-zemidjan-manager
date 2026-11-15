<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "./stores/auth";
import { useContractsStore } from "./stores/contracts";
import { useUiStore } from "./stores/ui";
import { alertsOf } from "./composables/useContractCalc";
import ToastHost from "./components/ToastHost.vue";
import ContractFormModal from "./components/ContractFormModal.vue";
import ContractDetailModal from "./components/ContractDetailModal.vue";
import PaymentFormModal from "./components/PaymentFormModal.vue";
import ImportExcelModal from "./components/ImportExcelModal.vue";

const route = useRoute();
const auth = useAuthStore();
const contracts = useContractsStore();
const ui = useUiStore();

const showShell = computed(() => auth.isAuthenticated && !route.meta.public);

const alertCount = computed(() => alertsOf(contracts.items).filter((a) => a.priority < 2).length);

const detailContract = computed(() => contracts.items.find((c) => c.id === ui.detailId) ?? null);
const formContract = computed(() => contracts.items.find((c) => c.id === ui.formContractId) ?? null);

watch(
  () => showShell.value,
  (visible) => {
    if (visible && !contracts.loaded) contracts.fetchAll();
  },
  { immediate: true },
);

async function onLogout() {
  await auth.logout();
  window.location.href = "/login";
}
</script>

<template>
  <header v-if="showShell">
    <div class="top">
      <div class="logo"><b>ZM//</b> Zémidjan Manager</div>
      <span class="sync">{{ auth.user?.name }}</span>
      <nav>
        <router-link to="/" :class="{ on: route.name === 'dashboard' }">Tableau de bord</router-link>
        <router-link to="/contrats" :class="{ on: route.name === 'contrats' }">Contrats</router-link>
        <router-link to="/paiements" :class="{ on: route.name === 'paiements' }">Paiements</router-link>
        <router-link to="/alertes" :class="{ on: route.name === 'alertes' }"
          >Alertes <span v-if="alertCount" class="cnt">{{ alertCount }}</span></router-link
        >
        <button type="button" class="btn sm" @click="onLogout">Déconnexion</button>
      </nav>
    </div>
  </header>
  <main v-if="showShell">
    <router-view />
  </main>
  <router-view v-else />
  <ToastHost />

  <template v-if="showShell">
    <ContractFormModal :open="ui.formOpen" :contract="formContract" @close="ui.closeForm()" />
    <ContractDetailModal
      :open="!!ui.detailId"
      :contract="detailContract"
      @close="ui.closeDetail()"
      @edit="
        (c) => {
          ui.closeDetail();
          ui.openEditContract(c.id);
        }
      "
      @pay="
        (c) => {
          ui.closeDetail();
          ui.openPay(c.id);
        }
      "
    />
    <PaymentFormModal :open="ui.payOpen" :contracts="contracts.items" :initial-contract-id="ui.payContractId" @close="ui.closePay()" />
    <ImportExcelModal :open="ui.importOpen" @close="ui.closeImport()" />
  </template>
</template>
