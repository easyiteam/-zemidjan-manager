<script setup lang="ts">
import { computed, ref } from "vue";
import BaseModal from "./BaseModal.vue";
import StatusTag from "./StatusTag.vue";
import InstallmentsGrid from "./InstallmentsGrid.vue";
import ConfirmModal from "./ConfirmModal.vue";
import { useContractsStore } from "../stores/contracts";
import { useToast } from "../composables/useToast";
import { captureUrl } from "../api/payments";
import {
  PAYMENT_MODE_LABELS,
  calc,
  formatAmount,
  formatDateLong,
  releve,
  unitLabel,
} from "../composables/useContractCalc";
import type { Contract, Payment } from "../api/types";

const props = defineProps<{ open: boolean; contract: Contract | null }>();
const emit = defineEmits<{ close: []; edit: [Contract]; pay: [Contract] }>();

const store = useContractsStore();
const { show: toast } = useToast();

const k = computed(() => (props.contract ? calc(props.contract) : null));
const unit = computed(() => (props.contract ? unitLabel(props.contract) : ""));

const confirmDelete = ref(false);
const confirmDeletePayment = ref<Payment | null>(null);

function copyReleve() {
  if (!props.contract) return;
  navigator.clipboard
    .writeText(releve(props.contract))
    .then(() => toast("Relevé copié — prêt à envoyer par WhatsApp/SMS"))
    .catch(() => toast("Copie refusée par le navigateur"));
}

async function toggleSuspend() {
  if (!props.contract) return;
  const next = props.contract.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  await store.update(props.contract.id, { status: next });
  toast(next === "SUSPENDED" ? "Contrat suspendu" : "Contrat réactivé");
}

async function doDeleteContract() {
  if (!props.contract) return;
  await store.remove(props.contract.id);
  confirmDelete.value = false;
  toast("Contrat supprimé");
  emit("close");
}

async function doDeletePayment() {
  if (!confirmDeletePayment.value) return;
  await store.removePayment(confirmDeletePayment.value.id);
  confirmDeletePayment.value = null;
  toast("Versement annulé");
}

const shots = ref<Record<string, string>>({});
async function viewCapture(payment: Payment) {
  if (!payment.captureKey) return;
  if (shots.value[payment.id]) return;
  try {
    const { url } = await captureUrl(payment.id);
    shots.value[payment.id] = url;
  } catch {
    toast("Capture inaccessible");
  }
}
</script>

<template>
  <BaseModal :open="open && !!contract" :title="contract?.driverName ?? ''" wide @close="emit('close')">
    <template v-if="contract && k">
      <p><StatusTag :calc="k" detailed /></p>
      <div class="facts">
        <div>
          Engin<b>{{ contract.vehicleType }} {{ contract.brand || "" }}</b
          >{{ contract.plateNumber || "Immat. à renseigner" }}{{ contract.chassisNumber ? ` · châssis ${contract.chassisNumber}` : "" }}
        </div>
        <div>
          Téléphone<b>{{ contract.phone || "—" }}</b
          >{{ contract.idNumber ? `Pièce : ${contract.idNumber}` : "" }}
        </div>
        <div>Garant<b>{{ contract.guarantorName || "—" }}</b>{{ contract.guarantorPhone || "" }}</div>
        <div>
          Conditions<b class="num">{{ formatAmount(k.a) }} FCFA / {{ unit }}</b
          >{{ k.N }} échéances · {{ formatAmount(k.total) }} FCFA
        </div>
        <div>
          Période<b class="num">{{ formatDateLong(k.start) }} → {{ formatDateLong(k.end) }}</b
          >{{ k.proj ? `Fin estimée au rythme actuel : ${formatDateLong(k.proj)}` : "" }}
        </div>
        <div>
          Versé<b class="num">{{ formatAmount(k.paid) }} FCFA</b
          >{{ Math.round(k.pct * 100) }} % · {{ k.pays.length }} versements
        </div>
        <div>
          Exigible à ce jour<b class="num">{{ formatAmount(Math.min(k.total, k.expected)) }} FCFA</b
          >{{ k.due }} échéance(s) échues
        </div>
        <div>
          {{ k.arrears ? "Retard" : "Situation" }}<b class="num" :style="{ color: k.arrears ? 'var(--red)' : 'var(--ok)' }">{{
            k.arrears ? `${formatAmount(k.arrears)} FCFA` : k.paid > k.expected ? `+${formatAmount(k.paid - k.expected)} FCFA d'avance` : "À jour"
          }}</b
          >{{ k.avance ? `Avance sur échéance en cours : ${formatAmount(k.avance)} FCFA` : "" }}
        </div>
        <div>
          Prochaine échéance<b class="num">{{ k.next ? formatDateLong(k.next) : "—" }}</b>Reste {{ formatAmount(k.rest) }} FCFA
        </div>
      </div>

      <h3>Carnet des échéances</h3>
      <InstallmentsGrid :contract="contract" :calc="k" />

      <p v-if="contract.notes" class="note"><b>Observations :</b> {{ contract.notes }}</p>

      <h3 style="margin-top: 20px">Historique des versements</h3>
      <div v-if="!k.pays.length" class="empty">Aucun versement.</div>
      <table v-else class="stack">
        <thead>
          <tr>
            <th>Date</th>
            <th>Mode</th>
            <th class="r">Montant</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in [...k.pays].reverse()" :key="p.id">
            <td data-l="Date" class="num">{{ formatDateLong(new Date(p.date)) }}</td>
            <td data-l="Mode">
              {{ PAYMENT_MODE_LABELS[p.mode] ?? p.mode }}
              <template v-if="p.captureKey">
                <button type="button" class="btn sm" @click="viewCapture(p)">Voir la capture</button>
                <a v-if="shots[p.id]" :href="shots[p.id]" target="_blank" rel="noopener" class="sub"> ouvrir </a>
              </template>
            </td>
            <td data-l="Montant" class="r num">{{ formatAmount(p.amount) }}</td>
            <td class="acts">
              <button type="button" class="btn sm" @click="confirmDeletePayment = p">Annuler</button>
            </td>
          </tr>
        </tbody>
      </table>
    </template>

    <template #footer>
      <button type="button" class="btn" @click="copyReleve">Copier le relevé</button>
      <button type="button" class="btn" @click="toggleSuspend">
        {{ contract?.status === "ACTIVE" ? "Suspendre" : "Réactiver" }}
      </button>
      <button type="button" class="btn" @click="confirmDelete = true">Supprimer</button>
      <button type="button" class="btn" @click="contract && emit('edit', contract)">Modifier</button>
      <button type="button" class="btn pri" @click="contract && emit('pay', contract)">Enregistrer un versement</button>
    </template>
  </BaseModal>

  <ConfirmModal
    :open="confirmDelete"
    title="Confirmer la suppression"
    :body="`Le contrat de ${contract?.driverName} et ses ${contract?.payments.length ?? 0} versements seront supprimés définitivement.`"
    confirm-label="Supprimer définitivement"
    @close="confirmDelete = false"
    @confirm="doDeleteContract"
  />
  <ConfirmModal
    :open="!!confirmDeletePayment"
    title="Annuler ce versement ?"
    :body="
      confirmDeletePayment
        ? `${contract?.driverName} — ${formatAmount(confirmDeletePayment.amount)} FCFA du ${formatDateLong(new Date(confirmDeletePayment.date))}. L'échéancier sera recalculé.`
        : ''
    "
    confirm-label="Annuler le versement"
    @close="confirmDeletePayment = null"
    @confirm="doDeletePayment"
  />
</template>
