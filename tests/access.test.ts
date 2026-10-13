import { describe, expect, it } from "vitest";
import { evaluateProAccess, type ProAccessInput } from "@/lib/access";

const now = new Date("2026-06-15T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 24 * 3600 * 1000);

const base: ProAccessInput = {
  role: "PROFESSIONAL",
  userStatus: "ACTIVE",
  emailVerified: true,
  verificationStatus: "APPROVED",
  subscriptions: [{ status: "ACTIVE", currentPeriodEnd: days(10) }],
  graceDays: 7,
  now,
};

describe("accès à la base professionnelle", () => {
  it("autorise un pro validé avec abonnement actif", () => {
    expect(evaluateProAccess(base)).toEqual({ allowed: true, reason: "OK" });
  });

  it("refuse un particulier, même avec un abonnement", () => {
    expect(evaluateProAccess({ ...base, role: "INDIVIDUAL" }).allowed).toBe(false);
  });

  it("refuse un compte suspendu", () => {
    expect(evaluateProAccess({ ...base, userStatus: "SUSPENDED" }).reason).toBe("ACCOUNT_INACTIVE");
    expect(evaluateProAccess({ ...base, role: "ADMIN", userStatus: "SUSPENDED" }).allowed).toBe(false);
  });

  it("refuse un profil non validé, refusé ou suspendu", () => {
    expect(evaluateProAccess({ ...base, verificationStatus: "PENDING" }).reason).toBe("PROFILE_PENDING");
    expect(evaluateProAccess({ ...base, verificationStatus: "REJECTED" }).reason).toBe("PROFILE_REJECTED");
    expect(evaluateProAccess({ ...base, verificationStatus: "SUSPENDED" }).reason).toBe("PROFILE_SUSPENDED");
    expect(evaluateProAccess({ ...base, verificationStatus: null }).allowed).toBe(false);
  });

  it("refuse sans abonnement", () => {
    expect(evaluateProAccess({ ...base, subscriptions: [] }).reason).toBe("NO_SUBSCRIPTION");
  });

  it("refuse un abonnement résilié ou incomplet", () => {
    for (const status of ["CANCELED", "INCOMPLETE", "INCOMPLETE_EXPIRED", "PAUSED"] as const) {
      expect(evaluateProAccess({ ...base, subscriptions: [{ status, currentPeriodEnd: days(10) }] }).allowed).toBe(false);
    }
  });

  it("applique le délai de grâce en cas d'impayé", () => {
    const inGrace = evaluateProAccess({ ...base, subscriptions: [{ status: "PAST_DUE", currentPeriodEnd: days(-3) }] });
    expect(inGrace.allowed).toBe(true);
    expect(inGrace.reason).toBe("GRACE_PERIOD");
    expect(inGrace.graceUntil).toEqual(days(4));

    const expired = evaluateProAccess({ ...base, subscriptions: [{ status: "PAST_DUE", currentPeriodEnd: days(-8) }] });
    expect(expired.allowed).toBe(false);
  });

  it("bloque immédiatement sans délai de grâce", () => {
    const r = evaluateProAccess({ ...base, graceDays: 0, subscriptions: [{ status: "UNPAID", currentPeriodEnd: days(-1) }] });
    expect(r.allowed).toBe(false);
  });

  it("tolère un webhook de renouvellement en retard (grâce sur ACTIVE expiré)", () => {
    const r = evaluateProAccess({ ...base, subscriptions: [{ status: "ACTIVE", currentPeriodEnd: days(-1) }] });
    expect(r).toMatchObject({ allowed: true, reason: "GRACE_PERIOD" });
  });

  it("privilégie un abonnement pleinement actif à une grâce", () => {
    const r = evaluateProAccess({
      ...base,
      subscriptions: [
        { status: "PAST_DUE", currentPeriodEnd: days(-2) },
        { status: "ACTIVE", currentPeriodEnd: days(20) },
      ],
    });
    expect(r.reason).toBe("OK");
  });

  it("autorise un administrateur actif", () => {
    expect(evaluateProAccess({ ...base, role: "ADMIN", subscriptions: [], verificationStatus: null }).reason).toBe("ADMIN");
  });

  it("exige un email vérifié", () => {
    expect(evaluateProAccess({ ...base, emailVerified: false }).reason).toBe("EMAIL_UNVERIFIED");
  });
});
