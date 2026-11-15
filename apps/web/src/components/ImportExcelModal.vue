<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ImportContractInput } from "@zm/shared";
import BaseModal from "./BaseModal.vue";
import { useContractsStore } from "../stores/contracts";
import { useToast } from "../composables/useToast";
import { ApiError } from "../api/client";
import { importContracts } from "../api/importExport";
import { parseExcelFile } from "../lib/excelImport";
import { formatAmount } from "../composables/useContractCalc";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; imported: [] }>();

const store = useContractsStore();
const { show: toast } = useToast();

const fileInput = ref<HTMLInputElement | null>(null);
const parsing = ref(false);
const importing = ref(false);
const error = ref("");
const parsed = ref<ImportContractInput[]>([]);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    parsed.value = [];
    error.value = "";
    if (fileInput.value) fileInput.value.value = "";
  },
);

const existingNames = computed(() => new Set(store.items.map((c) => c.driverName.toLowerCase())));

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  parsing.value = true;
  error.value = "";
  try {
    parsed.value = await parseExcelFile(file);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Lecture impossible.";
  } finally {
    parsing.value = false;
  }
}

async function onImport() {
  if (!parsed.value.length) return;
  importing.value = true;
  try {
    const { created, replaced } = await importContracts(parsed.value);
    await store.fetchAll();
    toast(`${created + replaced} contrat(s) importé(s)`);
    emit("imported");
    emit("close");
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : "Échec de l'import, réessayez.";
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <BaseModal :open="open" title="Importer un point de paiement Excel" wide @close="emit('close')">
    <p>
      Format attendu : un onglet par conducteur, colonnes <b>N° d'échéance</b>, <b>Montant</b>, <b>Date</b>. Le nombre de lignes numérotées
      donne la durée ; le montant le plus fréquent donne le versement.
    </p>
    <input ref="fileInput" type="file" accept=".xlsx,.xls" @change="onFileChange" />
    <p v-if="parsing" class="note">Lecture…</p>
    <p v-if="error" class="warn note">{{ error }}</p>
    <div v-if="parsed.length" style="margin-top: 14px">
      <table class="stack">
        <thead>
          <tr>
            <th>Onglet / conducteur</th>
            <th class="r">Échéances</th>
            <th class="r">Versement retenu</th>
            <th class="r">Versements</th>
            <th class="r">Total versé</th>
            <th>Déjà présent</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in parsed" :key="c.driverName">
            <td data-l="Conducteur"><b>{{ c.driverName }}</b></td>
            <td data-l="Échéances" class="r">{{ c.installmentCount }}</td>
            <td data-l="Versement" class="r num">{{ formatAmount(c.installmentAmount) }}</td>
            <td data-l="Versements" class="r">{{ c.payments.length }}</td>
            <td data-l="Total" class="r num">{{ formatAmount(c.payments.reduce((s, p) => s + p.amount, 0)) }}</td>
            <td data-l="Déjà présent">{{ existingNames.has(c.driverName.toLowerCase()) ? "Oui — sera remplacé" : "Non" }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else-if="!parsing" class="empty">Aucun onglet au format attendu.</div>

    <template #footer>
      <button type="button" class="btn" @click="emit('close')">Annuler</button>
      <button type="button" class="btn pri" :disabled="!parsed.length || importing" @click="onImport">
        {{ importing ? "Import…" : "Importer" }}
      </button>
    </template>
  </BaseModal>
</template>
