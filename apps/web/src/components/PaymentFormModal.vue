<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { CreatePaymentInput, PaymentMode } from "@zm/shared";
import { isMomoMode } from "@zm/shared";
import BaseModal from "./BaseModal.vue";
import { useContractsStore } from "../stores/contracts";
import { useToast } from "../composables/useToast";
import { ApiError } from "../api/client";
import { attachCapture } from "../api/payments";
import { parseMomoSms, shrinkImage } from "../lib/momo";
import { calc, formatAmount, formatDateLong, isoDate, statusLabel } from "../composables/useContractCalc";
import type { Contract } from "../api/types";

const props = defineProps<{ open: boolean; contracts: Contract[]; initialContractId?: string | null }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const store = useContractsStore();
const { show: toast } = useToast();

const contractId = ref("");
const amount = ref<number | null>(null);
const date = ref(isoDate(new Date()));
const mode = ref<PaymentMode>("CASH");
const reference = ref("");
const senderPhone = ref("");
const smsText = ref("");
const error = ref("");
const saving = ref(false);

const file = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const dragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    error.value = "";
    contractId.value = props.initialContractId ?? "";
    date.value = isoDate(new Date());
    mode.value = "CASH";
    reference.value = "";
    senderPhone.value = "";
    smsText.value = "";
    clearFile();
    const contract = props.contracts.find((c) => c.id === contractId.value);
    amount.value = contract?.installmentAmount ?? null;
  },
);

const selectedContract = computed(() => props.contracts.find((c) => c.id === contractId.value) ?? null);
const momo = computed(() => isMomoMode(mode.value));
const referenceLabel = computed(() => (momo.value ? "ID de transaction MoMo *" : "Référence transaction"));

watch(smsText, (text) => {
  const parsed = parseMomoSms(text);
  if (parsed.amount) amount.value = parsed.amount;
  if (parsed.reference) reference.value = parsed.reference;
  if (parsed.phone) senderPhone.value = parsed.phone;
  if (parsed.date) date.value = parsed.date;
});

const duplicate = computed(() => {
  const ref_ = reference.value.trim().toLowerCase();
  if (!ref_) return null;
  for (const c of props.contracts) {
    for (const p of c.payments) {
      if ((p.reference ?? "").trim().toLowerCase() === ref_) return { contract: c, payment: p };
    }
  }
  return null;
});

const preview = computed(() => {
  const c = selectedContract.value;
  if (!c) return "Sélectionnez un contrat.";
  const m = amount.value ?? 0;
  const before = calc(c);
  const after = calc({
    ...c,
    payments: [...c.payments, { ...c.payments[0], id: "x", contractId: c.id, date: date.value || isoDate(new Date()), amount: m } as never],
  });
  const covered = after.covered - before.covered;
  const lines = [
    `Avant : ${before.covered}/${before.N} échéances, ${before.arrears ? `retard ${formatAmount(before.arrears)} FCFA` : "à jour"}.`,
    `Ce versement couvre ${covered} échéance(s)${after.avance ? `, avance conservée ${formatAmount(after.avance)} FCFA` : ""}.`,
    `Après : ${after.covered}/${after.N} · ${after.arrears ? `retard restant ${formatAmount(after.arrears)} FCFA` : "à jour"} · statut ${statusLabel(after)}.`,
  ];
  if (m > before.rest && before.rest > 0) lines.push(`Attention : dépasse le reste dû (${formatAmount(before.rest)} FCFA).`);
  if (duplicate.value) {
    lines.push(
      `Cet ID de transaction est déjà enregistré (${duplicate.value.contract.driverName}, ${formatAmount(duplicate.value.payment.amount)} FCFA le ${formatDateLong(new Date(duplicate.value.payment.date))}). Doublon probable.`,
    );
  }
  if (momo.value && !file.value) lines.push("Pensez à joindre la capture du message MoMo.");
  return lines.join("\n");
});

function clearFile() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  file.value = null;
  previewUrl.value = null;
}

function setFile(f: File | null | undefined) {
  if (!f) return;
  if (!/^image\//.test(f.type)) {
    toast("Choisissez une image (capture d'écran)");
    return;
  }
  if (f.size > 20 * 1024 * 1024) {
    toast("Image trop lourde (20 Mo max)");
    return;
  }
  clearFile();
  file.value = f;
  previewUrl.value = URL.createObjectURL(f);
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  dragOver.value = false;
  setFile(e.dataTransfer?.files?.[0]);
}

function onPaste(e: ClipboardEvent) {
  if (!props.open || !momo.value) return;
  const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
  if (item) {
    e.preventDefault();
    setFile(item.getAsFile());
  }
}

async function onSubmit() {
  error.value = "";
  const m = Math.round(amount.value ?? 0);
  if (!contractId.value || !(m > 0)) {
    error.value = "Sélectionnez un contrat et un montant valide.";
    return;
  }
  if (momo.value && !reference.value.trim()) {
    error.value = "L'ID de transaction MoMo est requis.";
    return;
  }
  if (duplicate.value) {
    error.value = "ID de transaction déjà enregistré — vérifiez le doublon.";
    return;
  }

  saving.value = true;
  try {
    const payload: CreatePaymentInput = {
      date: date.value,
      amount: m,
      mode: mode.value,
      reference: reference.value.trim() || undefined,
      senderPhone: momo.value ? senderPhone.value.trim() || undefined : undefined,
      smsText: momo.value ? smsText.value.trim().slice(0, 600) || undefined : undefined,
    };
    await store.addPayment(contractId.value, payload);

    if (momo.value && file.value) {
      const updated = await store.fetchAll().then(() => store.items.find((c) => c.id === contractId.value));
      const newPayment = updated?.payments.find((p) => p.reference === payload.reference && p.amount === m);
      if (newPayment) {
        const compressed = await shrinkImage(file.value);
        await attachCapture(newPayment.id, new File([compressed], "capture.jpg", { type: "image/jpeg" }));
      }
    }

    toast(`Versement de ${formatAmount(m)} FCFA enregistré`);
    emit("saved");
    emit("close");
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : "Échec d'enregistrement, réessayez.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseModal :open="open" title="Enregistrer un versement" @close="emit('close')">
    <form @paste="onPaste" @submit.prevent="onSubmit">
      <label class="f"
        ><span>Contrat *</span>
        <select v-model="contractId" required>
          <option value="">— Sélectionner un contrat —</option>
          <option v-for="c in contracts" :key="c.id" :value="c.id">{{ c.driverName }} — {{ c.plateNumber || c.vehicleType }}</option>
        </select></label
      >
      <div class="fg">
        <label class="f"><span>Montant reçu (FCFA) *</span><input v-model.number="amount" type="number" min="1" required inputmode="numeric" /></label>
        <label class="f"><span>Date du versement *</span><input v-model="date" type="date" required /></label>
        <label class="f"
          ><span>Mode de paiement</span>
          <select v-model="mode">
            <option value="CASH">Espèces</option>
            <option value="MOMO_MTN">MoMo MTN</option>
            <option value="MOMO_MOOV">MoMo Moov</option>
            <option value="CELTIIS_CASH">Celtiis Cash</option>
            <option value="TRANSFER">Virement</option>
          </select></label
        >
        <label class="f"><span>{{ referenceLabel }}</span><input v-model="reference" placeholder="Ex. 8547123690" /></label>
      </div>

      <div v-if="momo" class="momo">
        <h4>Justificatif Mobile Money</h4>
        <label class="f"
          ><span>Texte du SMS reçu (facultatif — remplit montant, ID et expéditeur)</span>
          <textarea v-model="smsText" rows="2" placeholder="Collez ici le message de confirmation MoMo…"></textarea
        ></label>
        <label class="f"><span>N° de l'expéditeur</span><input v-model="senderPhone" type="tel" placeholder="01 97 00 00 00" /></label>
        <input ref="fileInput" type="file" accept="image/*" class="hide" @change="setFile(($event.target as HTMLInputElement).files?.[0])" />
        <div
          class="drop"
          :class="{ over: dragOver }"
          tabindex="0"
          role="button"
          aria-label="Ajouter la capture du message MoMo"
          @click="fileInput?.click()"
          @keydown.enter.space.prevent="fileInput?.click()"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop="onDrop"
        >
          <span v-if="!previewUrl" class="ph">Aucune capture</span>
          <img v-else :src="previewUrl" alt="Aperçu de la capture" />
          <div class="tx">
            <b>{{ previewUrl ? "Capture jointe" : "Ajouter la capture du message MoMo" }}</b>
            <span class="sub">{{
              previewUrl ? `${file?.name ?? "image collée"} · ${((file?.size ?? 0) / 1024).toFixed(0)} Ko` : "Touchez pour choisir une image, glissez-la ici ou collez-la (Ctrl+V)."
            }}</span>
          </div>
          <button v-if="previewUrl" type="button" class="btn sm" @click.stop="clearFile()">Retirer</button>
        </div>
      </div>

      <div class="preview" style="white-space: pre-line">{{ preview }}</div>
      <p class="note">
        Mobile Money : la capture est réduite automatiquement avant envoi ; un ID de transaction déjà saisi est signalé comme doublon. Si le
        montant dépasse le versement périodique, le surplus couvre automatiquement les échéances suivantes ; un reliquat inférieur à une
        échéance est conservé comme avance.
      </p>
      <p v-if="error" class="warn note">{{ error }}</p>
    </form>
    <template #footer>
      <button type="button" class="btn" @click="emit('close')">Annuler</button>
      <button type="button" class="btn pri" :disabled="saving" @click="onSubmit">{{ saving ? "Enregistrement…" : "Enregistrer" }}</button>
    </template>
  </BaseModal>
</template>
