/**
 * Règles d'accès à la base professionnelle — logique pure, testée unitairement.
 * Toute page / route / action professionnelle passe par `evaluateProAccess`.
 */

export type SubscriptionLike = {
  status:
    | "ACTIVE"
    | "TRIALING"
    | "PAST_DUE"
    | "UNPAID"
    | "CANCELED"
    | "INCOMPLETE"
    | "INCOMPLETE_EXPIRED"
    | "PAUSED";
  currentPeriodEnd: Date | null;
};

export type ProAccessInput = {
  role: "INDIVIDUAL" | "PROFESSIONAL" | "ADMIN";
  userStatus: "ACTIVE" | "SUSPENDED" | "DELETED";
  emailVerified: boolean;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | null;
  subscriptions: SubscriptionLike[];
  graceDays: number;
  now?: Date;
};

export type ProAccessReason =
  | "OK"
  | "ADMIN"
  | "NOT_PROFESSIONAL"
  | "ACCOUNT_INACTIVE"
  | "EMAIL_UNVERIFIED"
  | "PROFILE_PENDING"
  | "PROFILE_REJECTED"
  | "PROFILE_SUSPENDED"
  | "NO_SUBSCRIPTION"
  | "GRACE_PERIOD";

export type ProAccess = {
  allowed: boolean;
  reason: ProAccessReason;
  /** Fin du délai de grâce si l'accès n'est maintenu que grâce à lui. */
  graceUntil?: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Un abonnement donne-t-il accès à l'instant `now` ? Retourne aussi s'il s'agit d'une grâce. */
export function subscriptionGrantsAccess(
  sub: SubscriptionLike,
  graceDays: number,
  now: Date,
): { ok: boolean; grace: boolean; graceUntil?: Date } {
  const graceMs = Math.max(0, graceDays) * DAY_MS;
  const end = sub.currentPeriodEnd;

  switch (sub.status) {
    case "ACTIVE":
    case "TRIALING": {
      if (!end || now <= end) return { ok: true, grace: false };
      // Période expirée sans renouvellement reçu (webhook en retard par ex.) : grâce.
      const graceUntil = new Date(end.getTime() + graceMs);
      return now <= graceUntil ? { ok: true, grace: true, graceUntil } : { ok: false, grace: false };
    }
    case "PAST_DUE":
    case "UNPAID": {
      if (!end) return { ok: false, grace: false };
      const graceUntil = new Date(end.getTime() + graceMs);
      return now <= graceUntil ? { ok: true, grace: true, graceUntil } : { ok: false, grace: false };
    }
    default:
      return { ok: false, grace: false };
  }
}

export function evaluateProAccess(input: ProAccessInput): ProAccess {
  const now = input.now ?? new Date();

  if (input.userStatus !== "ACTIVE") return { allowed: false, reason: "ACCOUNT_INACTIVE" };
  if (input.role === "ADMIN") return { allowed: true, reason: "ADMIN" };
  if (input.role !== "PROFESSIONAL") return { allowed: false, reason: "NOT_PROFESSIONAL" };
  if (!input.emailVerified) return { allowed: false, reason: "EMAIL_UNVERIFIED" };

  switch (input.verificationStatus) {
    case "APPROVED":
      break;
    case "REJECTED":
      return { allowed: false, reason: "PROFILE_REJECTED" };
    case "SUSPENDED":
      return { allowed: false, reason: "PROFILE_SUSPENDED" };
    default:
      return { allowed: false, reason: "PROFILE_PENDING" };
  }

  let graceUntil: Date | undefined;
  for (const sub of input.subscriptions) {
    const r = subscriptionGrantsAccess(sub, input.graceDays, now);
    if (r.ok && !r.grace) return { allowed: true, reason: "OK" };
    if (r.ok && r.grace && r.graceUntil && (!graceUntil || r.graceUntil > graceUntil)) {
      graceUntil = r.graceUntil;
    }
  }
  if (graceUntil) return { allowed: true, reason: "GRACE_PERIOD", graceUntil };
  return { allowed: false, reason: "NO_SUBSCRIPTION" };
}
