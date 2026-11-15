<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{ open: boolean; title: string; wide?: boolean }>();
const emit = defineEmits<{ close: [] }>();

const dialogEl = ref<HTMLDialogElement | null>(null);

watch(
  () => props.open,
  (isOpen) => {
    const el = dialogEl.value;
    if (!el) return;
    if (isOpen && !el.open) el.showModal();
    if (!isOpen && el.open) el.close();
  },
  { immediate: true },
);

function onDialogClose() {
  emit("close");
}

function onBackdropClick(e: MouseEvent) {
  if (e.target === dialogEl.value) emit("close");
}
</script>

<template>
  <dialog ref="dialogEl" :class="{ wide }" @close="onDialogClose" @click="onBackdropClick">
    <div class="dh">
      <h2>{{ title }}</h2>
      <button type="button" class="x" aria-label="Fermer" @click="emit('close')">×</button>
    </div>
    <div class="db"><slot /></div>
    <div class="df" v-if="$slots.footer"><slot name="footer" /></div>
  </dialog>
</template>
