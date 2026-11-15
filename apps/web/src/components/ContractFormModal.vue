<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { CreateContractInput } from "@zm/shared";
import BaseModal from "./BaseModal.vue";
import { useContractsStore } from "../stores/contracts";
import { useToast } from "../composables/useToast";
import { ApiError } from "../api/client";
import { dueDate, formatAmount, formatDateLong, isoDate } from "../composables/useContractCalc";
import type { Contract } from "../api/types";

const props = defineProps<{ open: boolean; contract?: Contract | null }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const store = useContractsStore();
const { show: toast } = useToast();

type FormState = {
  driverName: string;
  phone: string;
  idNumber: string;
  guarantorName: string;
  guarantorPhone: string;
  vehicleType: "MOTO" | "TRICYCLE";
  brand: string;
  plateNumber: string;
  chassisNumber: string;
  periodicity: "WEEKLY" | "MONTHLY";
  installmentAmount: number | null;
  startDate: string;
  installmentCount: number | null;
  initialDeposit: number;
  status: "ACTIVE" | "SUSPENDED" | "TERMINATED";
  notes: string;
};

function emptyForm(): FormState {
  return {
    driverName: "",
    phone: "",
    idNumber: "",
    guarantorName: "",
    guarantorPhone: "",
    vehicleType: "MOTO",
    brand: "",
    plateNumber: "",
    chassisNumber: "",
    periodicity: "WEEKLY",
    installmentAmount: null,
    startDate: isoDate(new Date()),
    installmentCount: null,
    initialDeposit: 0,
    status: "ACTIVE",
    notes: "",
  };
}

const form = reactive<FormState>(emptyForm());
const error = ref("");
const saving = ref(false);

watch(
  () => [props.open, props.contract] as const,
  ([isOpen, contract]) => {
    if (!isOpen) return;
    error.value = "";
    if (contract) {
      form.driverName = contract.driverName;
      form.phone = contract.phone ?? "";
      form.idNumber = contract.idNumber ?? "";
      form.guarantorName = contract.guarantorName ?? "";
      form.guarantorPhone = contract.guarantorPhone ?? "";
      form.vehicleType = contract.vehicleType;
      form.brand = contract.brand ?? "";
      form.plateNumber = contract.plateNumber ?? "";
      form.chassisNumber = contract.chassisNumber ?? "";
      form.periodicity = contract.periodicity;
      form.installmentAmount = contract.installmentAmount;
      form.startDate = contract.startDate.slice(0, 10);
      form.installmentCount = contract.installmentCount;
      form.initialDeposit = contract.initialDeposit;
      form.status = contract.status;
      form.notes = contract.notes ?? "";
    } else {
      Object.assign(form, emptyForm());
    }
  },
  { immediate: true },
);

const title = computed(() => (props.contract ? "Modifier le contrat" : "Nouveau contrat"));

const preview = computed(() => {
  const a = form.installmentAmount;
  const n = form.installmentCount;
  if (!a || !n || !form.startDate) return "Renseignez versement, date et durée pour voir le récapitulatif.";
  const end = dueDate({ startDate: form.startDate, periodicity: form.periodicity }, n - 1);
  const duration =
    form.periodicity === "WEEKLY" ? `${(n / 52).toFixed(1).replace(".", ",")} an(s)` : `${n} mois`;
  const deposit = form.initialDeposit ? ` (+ apport ${formatAmount(form.initialDeposit)} FCFA)` : "";
  return `Montant total du leasing : ${formatAmount(a * n)} FCFA${deposit} · dernière échéance le ${formatDateLong(end)} · durée ≈ ${duration}.`;
});

async function onSubmit() {
  error.value = "";
  if (!form.driverName.trim() || !form.installmentAmount || !form.installmentCount || !form.startDate) {
    error.value = "Veuillez remplir les champs obligatoires (*).";
    return;
  }
  const payload: CreateContractInput = {
    driverName: form.driverName.trim(),
    phone: form.phone.trim() || undefined,
    idNumber: form.idNumber.trim() || undefined,
    guarantorName: form.guarantorName.trim() || undefined,
    guarantorPhone: form.guarantorPhone.trim() || undefined,
    vehicleType: form.vehicleType,
    brand: form.brand.trim() || undefined,
    plateNumber: form.plateNumber.trim() || undefined,
    chassisNumber: form.chassisNumber.trim() || undefined,
    periodicity: form.periodicity,
    installmentAmount: Math.round(form.installmentAmount),
    startDate: form.startDate,
    installmentCount: Math.round(form.installmentCount),
    initialDeposit: Math.round(form.initialDeposit || 0),
    status: form.status,
    notes: form.notes.trim() || undefined,
  };

  saving.value = true;
  try {
    if (props.contract) await store.update(props.contract.id, payload);
    else await store.create(payload);
    toast(props.contract ? "Contrat mis à jour" : "Contrat créé");
    emit("saved");
    emit("close");
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : "Erreur d'enregistrement, réessayez.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseModal :open="open" :title="title" wide @close="emit('close')">
    <form @submit.prevent="onSubmit">
      <fieldset>
        <legend>Conducteur</legend>
        <div class="fg">
          <label class="f full"><span>Nom complet du conducteur *</span><input v-model="form.driverName" required /></label>
          <label class="f"><span>Téléphone</span><input v-model="form.phone" type="tel" placeholder="+229 01 …" /></label>
          <label class="f"><span>N° pièce d'identité</span><input v-model="form.idNumber" /></label>
          <label class="f"><span>Nom du garant</span><input v-model="form.guarantorName" /></label>
          <label class="f"><span>Téléphone du garant</span><input v-model="form.guarantorPhone" type="tel" /></label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Engin</legend>
        <div class="fg">
          <label class="f"
            ><span>Type *</span>
            <select v-model="form.vehicleType">
              <option value="MOTO">Moto</option>
              <option value="TRICYCLE">Tricycle</option>
            </select></label
          >
          <label class="f"><span>Marque / Modèle</span><input v-model="form.brand" placeholder="Haojue, Bajaj, TVS King…" /></label>
          <label class="f"><span>Immatriculation</span><input v-model="form.plateNumber" placeholder="À renseigner" /></label>
          <label class="f"><span>N° de châssis</span><input v-model="form.chassisNumber" /></label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Conditions du contrat</legend>
        <div class="fg">
          <label class="f"
            ><span>Périodicité *</span>
            <select v-model="form.periodicity">
              <option value="WEEKLY">Hebdomadaire</option>
              <option value="MONTHLY">Mensuelle</option>
            </select></label
          >
          <label class="f"
            ><span>Versement par échéance (FCFA) *</span
            ><input v-model.number="form.installmentAmount" type="number" min="1" required inputmode="numeric"
          /></label>
          <label class="f"><span>Date du 1er versement *</span><input v-model="form.startDate" type="date" required /></label>
          <label class="f"
            ><span>Durée (nombre d'échéances) *</span
            ><input v-model.number="form.installmentCount" type="number" min="1" required inputmode="numeric"
          /></label>
          <label class="f"
            ><span>Apport initial (FCFA)</span><input v-model.number="form.initialDeposit" type="number" min="0" inputmode="numeric"
          /></label>
          <label class="f"
            ><span>État</span>
            <select v-model="form.status">
              <option value="ACTIVE">Actif</option>
              <option value="SUSPENDED">Suspendu</option>
              <option value="TERMINATED">Résilié</option>
            </select></label
          >
          <label class="f full"><span>Observations</span><textarea v-model="form.notes" rows="2"></textarea></label>
        </div>
      </fieldset>
      <div class="preview">{{ preview }}</div>
      <p v-if="error" class="warn note">{{ error }}</p>
    </form>
    <template #footer>
      <button type="button" class="btn" @click="emit('close')">Annuler</button>
      <button type="button" class="btn pri" :disabled="saving" @click="onSubmit">
        {{ saving ? "Enregistrement…" : "Enregistrer" }}
      </button>
    </template>
  </BaseModal>
</template>
