<script setup lang="ts">
import { computed, ref } from "vue";
import { useContractsStore } from "../stores/contracts";
import { useUiStore } from "../stores/ui";
import ProgressBar from "../components/ProgressBar.vue";
import { calc, formatAmount, formatDateShort, statusLabel, unitLabel, type StatusKey } from "../composables/useContractCalc";

const store = useContractsStore();
const ui = useUiStore();

const query = ref("");
const statusFilter = ref<StatusKey | "">("");
const typeFilter = ref<"" | "MOTO" | "TRICYCLE">("");
const sortBy = ref<"arr" | "nom" | "pct" | "fin">("arr");

const rows = computed(() => {
  const q = query.value.trim().toLowerCase();
  let list = store.items
    .map((c) => ({ contract: c, k: calc(c) }))
    .filter(({ contract, k }) => {
      if (q) {
        const haystack = [contract.driverName, contract.plateNumber, contract.phone, contract.brand, contract.chassisNumber]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (typeFilter.value && contract.vehicleType !== typeFilter.value) return false;
      if (statusFilter.value) {
        if (statusFilter.value === "off" ? !["off", "res"].includes(k.st) : k.st !== statusFilter.value) return false;
      }
      return true;
    });

  list = list.sort((a, b) => {
    if (sortBy.value === "nom") return a.contract.driverName.localeCompare(b.contract.driverName);
    if (sortBy.value === "pct") return b.k.pct - a.k.pct;
    if (sortBy.value === "fin") return +a.k.end - +b.k.end;
    return b.k.arrears - a.k.arrears || a.contract.driverName.localeCompare(b.contract.driverName);
  });
  return list;
});
</script>

<template>
  <div class="bar">
    <h1>Tous les contrats</h1>
    <span class="sp"></span>
    <button type="button" class="btn" @click="ui.openImport()">Importer un fichier Excel</button>
    <button type="button" class="btn pri" @click="ui.openNewContract()">Nouveau contrat</button>
  </div>
  <div class="bar">
    <input v-model="query" class="search" type="search" placeholder="Rechercher conducteur, immat., téléphone" aria-label="Rechercher" />
    <select v-model="statusFilter" style="width: auto" aria-label="Filtrer par statut">
      <option value="">Tous les statuts</option>
      <option value="crit">Critique</option>
      <option value="late">En retard</option>
      <option value="ok">À jour</option>
      <option value="adv">En avance</option>
      <option value="wait">Non démarré</option>
      <option value="done">Soldé</option>
      <option value="off">Suspendu / résilié</option>
    </select>
    <select v-model="typeFilter" style="width: auto" aria-label="Filtrer par type">
      <option value="">Motos et tricycles</option>
      <option value="MOTO">Moto</option>
      <option value="TRICYCLE">Tricycle</option>
    </select>
    <select v-model="sortBy" style="width: auto" aria-label="Trier">
      <option value="arr">Tri : retard décroissant</option>
      <option value="nom">Tri : conducteur</option>
      <option value="pct">Tri : progression</option>
      <option value="fin">Tri : date de fin</option>
    </select>
  </div>
  <div class="card" style="padding: 6px 14px">
    <table class="stack">
      <thead>
        <tr>
          <th>Conducteur</th>
          <th>Moto / Immat.</th>
          <th>Début → Fin</th>
          <th class="r">Versement</th>
          <th>Progression</th>
          <th>Statut</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="{ contract, k } in rows" :key="contract.id" class="row" @click="ui.openDetail(contract.id)">
          <td data-l="Conducteur" class="drv">
            <b>{{ contract.driverName }}</b><span>{{ contract.phone || "Tél. non renseigné" }}</span>
          </td>
          <td data-l="Moto / Immat.">
            <div>{{ contract.vehicleType }} {{ contract.brand }}</div>
            <span class="sub">{{ contract.plateNumber || "Immat. à renseigner" }}</span>
          </td>
          <td data-l="Début → Fin" class="num">{{ formatDateShort(k.start) }} → {{ formatDateShort(k.end) }}</td>
          <td data-l="Versement" class="r num">{{ formatAmount(k.a) }} <span class="sub">/ {{ unitLabel(contract) }}</span></td>
          <td data-l="Progression" class="prog">
            <ProgressBar :pct="k.pct" :epct="k.epct" />
            <div class="pt">
              <span>{{ k.covered }}/{{ k.N }} · {{ Math.round(k.pct * 100) }} %</span><span class="num">{{ formatAmount(k.paid) }}</span>
            </div>
          </td>
          <td data-l="Statut"><span class="tag" :class="`t-${k.st === 'res' ? 'off' : k.st}`">{{ statusLabel(k) }}</span></td>
          <td data-l="" class="acts">
            <button type="button" class="btn sm pri" @click.stop="ui.openPay(contract.id)">Versement</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="!rows.length" class="empty">
      {{ store.items.length ? "Aucun contrat ne correspond aux filtres." : "Aucun contrat. Créez-en un ou importez votre fichier Excel." }}
    </div>
  </div>
  <p class="note">{{ rows.length ? `${rows.length} contrat(s) · trait rouge sur la barre = montant attendu à ce jour.` : "" }}</p>
</template>
