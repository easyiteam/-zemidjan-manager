<script setup lang="ts">
defineProps<{ label: string; value: string | number; sub?: string; alert?: boolean }>();
</script>

<template>
  <div class="kpi" :class="{ alert }">
    <div class="l">{{ label }}</div>
    <div class="v">{{ value }}</div>
    <div class="s">{{ sub }}</div>
  </div>
</template>
