<script setup lang="ts">
import { computed } from "vue";
import type { Contract } from "../api/types";
import { formatAmount } from "../composables/useContractCalc";

const props = defineProps<{ contracts: Contract[] }>();

interface MonthBucket {
  key: string;
  date: Date;
  total: number;
}

const months = computed<MonthBucket[]>(() => {
  const now = new Date();
  const buckets: MonthBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, date: d, total: 0 });
  }
  for (const c of props.contracts) {
    for (const p of c.payments) {
      const key = p.date.slice(0, 7);
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) bucket.total += p.amount;
    }
  }
  return buckets;
});

const max = computed(() => Math.max(1, ...months.value.map((m) => m.total)));

const best = computed(() =>
  months.value.reduce((a, b) => (b.total > a.total ? b : a), months.value[0]!),
);

const note = computed(() =>
  best.value.total
    ? `Meilleur mois : ${best.value.date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} (${formatAmount(best.value.total)} FCFA). Mois en cours en noir.`
    : "",
);
</script>

<template>
  <div class="chart">
    <div
      v-for="(m, i) in months"
      :key="m.key"
      class="c"
      :class="{ cur: i === 11 }"
      :style="{ '--h': `${(m.total / max) * 100}%` }"
      :title="`${m.date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} : ${formatAmount(m.total)} FCFA`"
    >
      <span class="t">{{ m.total ? `${formatAmount(m.total / 1000)} k` : "" }}</span>
      <div class="b" :style="{ height: `${(m.total / max) * 100}%` }"></div>
    </div>
  </div>
  <div class="months">
    <span v-for="m in months" :key="m.key">{{ m.date.toLocaleDateString("fr-FR", { month: "narrow" }) }}</span>
  </div>
  <p class="note">{{ note }}</p>
</template>
