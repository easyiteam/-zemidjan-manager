import { describe, expect, it } from "vitest";
import { alertsOf, calc, dueDate, isoDate, releve, statusLabel } from "./useContractCalc";
import type { Contract, Payment } from "../api/types";

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "p1",
    contractId: "c1",
    date: "2026-01-05",
    amount: 25000,
    mode: "CASH",
    reference: null,
    senderPhone: null,
    captureKey: null,
    smsText: null,
    note: null,
    createdAt: "2026-01-05T00:00:00.000Z",
    ...overrides,
  };
}

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "c1",
    driverName: "ASSOGBA Cyr",
    phone: "97000000",
    idNumber: null,
    guarantorName: null,
    guarantorPhone: null,
    vehicleType: "TRICYCLE",
    brand: "TVS",
    plateNumber: "AB-1234",
    chassisNumber: null,
    periodicity: "WEEKLY",
    installmentAmount: 25000,
    startDate: "2026-01-05",
    installmentCount: 10,
    initialDeposit: 0,
    status: "ACTIVE",
    notes: null,
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-01-05T00:00:00.000Z",
    payments: [],
    ...overrides,
  };
}

const today = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return d;
};

describe("dueDate", () => {
  it("avance de N semaines en périodicité hebdomadaire", () => {
    const c = makeContract({ periodicity: "WEEKLY", startDate: "2026-01-05" });
    expect(isoDate(dueDate(c, 0))).toBe("2026-01-05");
    expect(isoDate(dueDate(c, 3))).toBe("2026-01-26");
  });

  it("avance de N mois en périodicité mensuelle", () => {
    const c = makeContract({ periodicity: "MONTHLY", startDate: "2026-01-31" });
    expect(isoDate(dueDate(c, 1))).toBe("2026-03-03"); // débordement de février, comportement JS natif attendu
  });
});

describe("calc", () => {
  it("contrat non démarré → wait", () => {
    const c = makeContract({ startDate: "2099-01-01" });
    const k = calc(c, today("2026-01-01"));
    expect(k.st).toBe("wait");
    expect(k.due).toBe(0);
  });

  it("contrat à jour après versement exact de l'échéance du jour", () => {
    const c = makeContract({ payments: [makePayment({ amount: 25000, date: "2026-01-05" })] });
    const k = calc(c, today("2026-01-05"));
    expect(k.st).toBe("ok");
    expect(k.covered).toBe(1);
    expect(k.arrears).toBe(0);
  });

  it("une échéance manquée → late", () => {
    const c = makeContract({ payments: [] });
    const k = calc(c, today("2026-01-12")); // 2 échéances dues (sem 1 et 2), rien payé
    expect(k.st).toBe("late");
    expect(k.late).toBe(2);
    expect(k.arrears).toBe(50000);
  });

  it("quatre échéances ou plus de retard → critique", () => {
    const c = makeContract({ payments: [] });
    const k = calc(c, today("2026-02-02")); // 5 semaines écoulées
    expect(k.st).toBe("crit");
    expect(k.late).toBeGreaterThanOrEqual(4);
  });

  it("versement en excédent → avance conservée", () => {
    const c = makeContract({ payments: [makePayment({ amount: 60000, date: "2026-01-05" })] });
    const k = calc(c, today("2026-01-05"));
    expect(k.covered).toBe(2);
    expect(k.avance).toBe(10000);
    expect(k.st).toBe("adv");
  });

  it("total versé atteint → soldé", () => {
    const c = makeContract({
      installmentCount: 2,
      payments: [makePayment({ amount: 50000, date: "2026-01-05" })],
    });
    const k = calc(c, today("2026-01-05"));
    expect(k.st).toBe("done");
    expect(k.rest).toBe(0);
  });

  it("contrat suspendu n'est jamais en retard même avec échéances manquées", () => {
    const c = makeContract({ status: "SUSPENDED", payments: [] });
    const k = calc(c, today("2026-02-02"));
    expect(k.st).toBe("off");
  });
});

describe("alertsOf", () => {
  it("signale un contrat critique et le trie en priorité", () => {
    const crit = makeContract({ id: "crit", payments: [] });
    const ok = makeContract({
      id: "ok",
      // Verse d'un coup les 5 échéances dues au 2026-02-02 : reste "à jour".
      payments: [makePayment({ amount: 125000, date: "2026-01-05" })],
    });
    const alerts = alertsOf([ok, crit], today("2026-02-02"));
    expect(alerts[0]!.contract.id).toBe("crit");
  });

  it("signale une fiche incomplète (immatriculation ou téléphone manquants)", () => {
    const c = makeContract({ plateNumber: null, phone: null });
    const alerts = alertsOf([c], today("2026-01-05"));
    expect(alerts.some((a) => a.title === "Fiche incomplète")).toBe(true);
  });
});

describe("statusLabel / releve", () => {
  it("inclut le nombre d'échéances en retard dans le libellé", () => {
    const c = makeContract({ payments: [] });
    const k = calc(c, today("2026-01-12"));
    expect(statusLabel(k)).toContain("éch.");
  });

  it("produit un relevé textuel exploitable", () => {
    const c = makeContract({ payments: [makePayment({ amount: 25000, date: "2026-01-05" })] });
    const text = releve(c, today("2026-01-05"));
    expect(text).toContain("ASSOGBA Cyr");
    expect(text).toContain("Échéances couvertes : 1/10");
  });
});
