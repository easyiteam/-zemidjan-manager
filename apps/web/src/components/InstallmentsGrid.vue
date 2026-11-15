<script setup lang="ts">
import { computed } from "vue";
import type { Contract } from "../api/types";
import { dueDate, formatAmount, formatDateLong, todayAtNoon, type ContractCalc } from "../composables/useContractCalc";

const props = defineProps<{ contract: Contract; calc: ContractCalc }>();

interface Cell {
  index: number;
  cls: "p" | "h" | "l" | "";
  fillPct: number;
  title: string;
}

const cells = computed<Cell[]>(() => {
  const today = todayAtNoon();
  const { a, paid, N } = props.calc;
  const out: Cell[] = [];
  for (let i = 0; i < N; i++) {
    const due = dueDate(props.contract, i);
    const paidHere = Math.max(0, Math.min(a, paid - i * a));
    const cls = paidHere >= a ? "p" : paidHere > 0 ? "h" : due <= today ? "l" : "";
    const state = paidHere >= a ? "payée" : paidHere ? `partielle (${formatAmount(paidHere)})` : due <= today ? "impayée" : "à venir";
    out.push({
      index: i + 1,
      cls,
      fillPct: (paidHere / a) * 100,
      title: `Échéance ${i + 1} · ${formatDateLong(due)} · ${state}`,
    });
  }
  return out;
});
</script>

<template>
  <div class="carnet">
    <i v-for="cell in cells" :key="cell.index" :class="cell.cls" :style="{ '--f': `${cell.fillPct}%` }" :title="cell.title">{{
      cell.index
    }}</i>
  </div>
  <div class="leg">
    <span style="--c: var(--ink)">Payée</span>
    <span style="--c: linear-gradient(90deg, var(--ink) 50%, var(--line) 50%)">Partielle</span>
    <span style="--c: var(--red)">Échue impayée</span>
    <span style="--c: var(--line)">À venir</span>
  </div>
</template>
