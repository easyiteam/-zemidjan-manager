<script setup lang="ts">
const props = defineProps<{ pct: number; epct?: number }>();
</script>

<template>
  <div class="pb">
    <i :style="{ width: `${Math.max(0, Math.min(1, props.pct)) * 100}%` }"></i>
    <u v-if="epct !== undefined" :style="{ left: `${Math.max(0, Math.min(1, epct)) * 100}%` }" title="Attendu à ce jour"></u>
  </div>
</template>
