import type { Contract, Payment } from "../api/types";

export const DAY_MS = 24 * 60 * 60 * 1000;

export type StatusKey = "ok" | "adv" | "late" | "crit" | "done" | "off" | "res" | "wait";

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: "Espèces",
  MOMO_MTN: "MoMo MTN",
  MOMO_MOOV: "MoMo Moov",
  CELTIIS_CASH: "Celtiis Cash",
  TRANSFER: "Virement",
};

export const STATUS_LABELS: Record<StatusKey, [label: string, cssClass: string]> = {
  ok: ["À jour", "t-ok"],
  adv: ["En avance", "t-adv"],
  late: ["En retard", "t-late"],
  crit: ["Critique", "t-crit"],
  done: ["Soldé", "t-done"],
  off: ["Suspendu", "t-off"],
  res: ["Résilié", "t-off"],
  wait: ["Non démarré", "t-wait"],
};

export interface ContractCalc {
  a: number;
  N: number;
  total: number;
  paid: number;
  start: Date;
  end: Date;
  due: number;
  expected: number;
  covered: number;
  avance: number;
  arrears: number;
  late: number;
  rest: number;
  last: Date | null;
  since: number | null;
  st: StatusKey;
  proj: Date | null;
  next: Date | null;
  pct: number;
  epct: number;
  pays: Payment[];
}

export interface Alert {
  priority: number;
  color: string;
  contract: Contract;
  title: string;
  detail: string;
}

/** Parse une date ISO (date seule ou datetime) comme midi local, pour éviter
 *  tout décalage de jour calendaire lié au fuseau horaire. */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 12);
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayAtNoon(): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

export const formatAmount = (n: number): string => Math.round(n || 0).toLocaleString("fr-FR");

export const formatDateLong = (d: Date | null): string =>
  d ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

export const formatDateShort = (d: Date): string =>
  d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" });

export function dueDate(contract: Pick<Contract, "startDate" | "periodicity">, index: number): Date {
  const start = parseDate(contract.startDate);
  if (contract.periodicity === "MONTHLY") {
    const d = new Date(start);
    d.setMonth(start.getMonth() + index);
    return d;
  }
  return new Date(+start + index * 7 * DAY_MS);
}

export const unitLabel = (contract: Pick<Contract, "periodicity">): string =>
  contract.periodicity === "MONTHLY" ? "mois" : "sem.";

export function calc(contract: Contract, today: Date = todayAtNoon()): ContractCalc {
  const a = contract.installmentAmount || 1;
  const N = contract.installmentCount || 1;
  const total = a * N;
  const pays = [...contract.payments].sort((x, y) => (x.date < y.date ? -1 : 1));
  const paid = pays.reduce((s, p) => s + (p.amount || 0), 0);
  const start = parseDate(contract.startDate);
  const end = dueDate(contract, N - 1);

  let due = 0;
  if (today >= start) {
    if (contract.periodicity === "MONTHLY") {
      while (due < N && dueDate(contract, due) <= today) due++;
    } else {
      due = Math.min(N, Math.floor((+today - +start) / (7 * DAY_MS)) + 1);
    }
  }

  const expected = due * a;
  const covered = Math.min(N, Math.floor(paid / a));
  const avance = covered < N ? paid - covered * a : 0;
  const arrears = Math.max(0, Math.min(total, expected) - paid);
  const late = Math.ceil(arrears / a - 1e-9);
  const rest = Math.max(0, total - paid);
  const last = pays.length ? parseDate(pays[pays.length - 1]!.date) : null;
  const since = last ? Math.floor((+today - +last) / DAY_MS) : null;

  let st: StatusKey;
  if (paid >= total) st = "done";
  else if (contract.status === "TERMINATED") st = "res";
  else if (contract.status === "SUSPENDED") st = "off";
  else if (today < start) st = "wait";
  else if (late >= 4) st = "crit";
  else if (late >= 1) st = "late";
  else if (paid - expected >= a) st = "adv";
  else st = "ok";

  let proj: Date | null = null;
  if (paid > 0 && rest > 0 && today > start) {
    const rate = paid / ((+today - +start) / DAY_MS + 7);
    proj = new Date(+today + (rest / rate) * DAY_MS);
  }
  const next = covered < N ? dueDate(contract, covered) : null;

  return {
    a,
    N,
    total,
    paid,
    start,
    end,
    due,
    expected,
    covered,
    avance,
    arrears,
    late,
    rest,
    last,
    since,
    st,
    proj,
    next,
    pct: paid / total,
    epct: Math.min(1, expected / total),
    pays,
  };
}

export function statusLabel(k: ContractCalc): string {
  const [label] = STATUS_LABELS[k.st];
  return k.st === "late" || k.st === "crit" ? `${label} · ${k.late} éch.` : label;
}

export function alertsOf(contracts: Contract[], today: Date = todayAtNoon()): Alert[] {
  const alerts: Alert[] = [];
  for (const c of contracts) {
    const k = calc(c, today);
    if (k.st === "done" || k.st === "res") {
      if (k.st === "done" && c.status === "ACTIVE") {
        alerts.push({
          priority: 2,
          color: "var(--ok)",
          contract: c,
          title: "Contrat soldé — à clôturer",
          detail: `Total de ${formatAmount(k.total)} FCFA versé. Préparer la cession de l'engin.`,
        });
      }
      continue;
    }
    if (k.st === "crit") {
      alerts.push({
        priority: 0,
        color: "var(--red)",
        contract: c,
        title: `Retard critique : ${k.late} échéances impayées`,
        detail: `${formatAmount(k.arrears)} FCFA exigibles. Dernier versement : ${
          k.last ? `${formatDateLong(k.last)} (il y a ${k.since} j)` : "aucun"
        }.`,
      });
    } else if (k.st === "late") {
      alerts.push({
        priority: 1,
        color: "var(--org)",
        contract: c,
        title: `En retard de ${k.late} échéance(s)`,
        detail: `${formatAmount(k.arrears)} FCFA à régulariser.`,
      });
    }
    if (k.since !== null && k.since > 14 && k.st !== "wait") {
      alerts.push({
        priority: k.since > 30 ? 0 : 1,
        color: "var(--red)",
        contract: c,
        title: `Aucun versement depuis ${k.since} jours`,
        detail: `Dernier versement le ${formatDateLong(k.last)}. Contacter le conducteur${
          c.phone ? ` au ${c.phone}` : ""
        }.`,
      });
    }
    if (k.N - k.covered <= 4 && k.rest > 0) {
      alerts.push({
        priority: 2,
        color: "var(--blue)",
        contract: c,
        title: "Fin de contrat proche",
        detail: `Reste ${formatAmount(k.rest)} FCFA (${k.N - k.covered} échéance(s)).`,
      });
    }
    const missingCaptures = c.payments.filter(
      (p) => /MOMO|CELTIIS/.test(p.mode) && !p.captureKey,
    ).length;
    if (missingCaptures) {
      alerts.push({
        priority: 3,
        color: "var(--yel)",
        contract: c,
        title: "Justificatif MoMo manquant",
        detail: `${missingCaptures} versement(s) Mobile Money sans capture du message.`,
      });
    }
    if (!c.plateNumber || !c.phone) {
      const missing = [!c.plateNumber && "immatriculation", !c.phone && "téléphone", !c.brand && "marque"]
        .filter(Boolean)
        .join(", ");
      alerts.push({
        priority: 3,
        color: "var(--mute)",
        contract: c,
        title: "Fiche incomplète",
        detail: `${missing} à renseigner.`,
      });
    }
  }
  return alerts.sort((a, b) => a.priority - b.priority);
}

export function releve(contract: Contract, today: Date = todayAtNoon()): string {
  const k = calc(contract, today);
  const unit = unitLabel(contract);
  const lines = [
    `RELEVÉ LEASING — ${contract.driverName}`,
    `${contract.vehicleType} ${contract.brand ?? ""} ${contract.plateNumber ?? ""}`.trim(),
    `Contrat : ${formatAmount(k.a)} FCFA/${unit} × ${k.N} = ${formatAmount(k.total)} FCFA`,
    `Période : ${formatDateLong(k.start)} → ${formatDateLong(k.end)}`,
    `Versé au ${formatDateLong(today)} : ${formatAmount(k.paid)} FCFA (${Math.round(k.pct * 100)} %)`,
    `Échéances couvertes : ${k.covered}/${k.N}`,
    k.arrears
      ? `Retard : ${formatAmount(k.arrears)} FCFA (${k.late} échéance(s))`
      : "Situation : à jour",
    `Reste à payer : ${formatAmount(k.rest)} FCFA`,
    `Statut : ${statusLabel(k)}`,
  ];
  return lines.join("\n");
}
