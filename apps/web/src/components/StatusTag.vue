<script setup lang="ts">
import { computed } from "vue";
import { STATUS_LABELS, statusLabel, type ContractCalc, type StatusKey } from "../composables/useContractCalc";

const props = defineProps<{ calc: ContractCalc; detailed?: boolean }>();

const cssClass = computed(() => STATUS_LABELS[props.calc.st as StatusKey][1]);
const label = computed(() => (props.detailed ? statusLabel(props.calc) : STATUS_LABELS[props.calc.st][0]));
</script>

<template>
  <span class="tag" :class="cssClass">{{ label }}</span>
</template>
