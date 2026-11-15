<script setup lang="ts">
import BaseModal from "./BaseModal.vue";

defineProps<{ open: boolean; title: string; body: string; confirmLabel: string }>();
const emit = defineEmits<{ close: []; confirm: [] }>();
</script>

<template>
  <BaseModal :open="open" :title="title" @close="emit('close')">
    <p>{{ body }}</p>
    <template #footer>
      <button type="button" class="btn" @click="emit('close')">Annuler</button>
      <button type="button" class="btn dan" @click="emit('confirm')">{{ confirmLabel }}</button>
    </template>
  </BaseModal>
</template>
