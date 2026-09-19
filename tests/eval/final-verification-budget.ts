/** One-time verification accounting only. Never imported by application code. */
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";

export type VerificationImageCallKind = "initial" | "repair";
export type VerificationAttempt = {
  runId: string;
  scenarioId: string;
  attemptKey: string;
  kind: VerificationImageCallKind;
};
type Totals = { initial: number; repair: number; total: number };
type AttemptRecord = VerificationAttempt & {
  status: "reserved" | "succeeded" | "failed";
  reservedAt: string;
  finishedAt?: string;
  httpStatus?: number;
};
export type NonImageCallKind = "web" | "visual" | "validation" | "ocr" | "cacheHit";
export type VerificationState = {
  version: 1;
  runId: string;
  matrixHash: string;
  limits: Totals;
  used: Totals;
  attempts: Record<string, AttemptRecord>;
  nonImageCalls: Record<NonImageCallKind, number>;
};

export const FINAL_RUN_ID = "final-vnext-verification-2026-09";
export const FINAL_MATRIX_PATH = new URL("../image-evals/final/matrix.json", import.meta.url);
export const FINAL_STATE_PATH = resolve("benchmark-results/final-verification/state.json");
export const FINAL_MATRIX_HASH = "082a3cb04029a1763e7750f9e1a63a1f1d4356c3570800d35d9efc86de22dff1";

export const TARGETED_RUN_ID = "targeted-vnext-blockers-2026-09";
export const TARGETED_MATRIX_PATH = new URL(
  "../image-evals/final/targeted-matrix.json",
  import.meta.url,
);
export const TARGETED_MATRIX_HASH =
  "2395998088202a644a0e920771034c36cab38b4d13df28bd7c962f47f926e39d";
export const TARGETED_STATE_PATH = resolve("benchmark-results/targeted-vnext-blockers/state.json");
export function readTargetedMatrix(path: string | URL = TARGETED_MATRIX_PATH) {
  const bytes = readFileSync(path);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== TARGETED_MATRIX_HASH) throw new Error("Frozen targeted matrix hash mismatch");
  const matrix = JSON.parse(bytes.toString());
  const counts = new Map<string, number>(
    matrix.scenarios.map((s: { id: string; images: number }) => [s.id, s.images]),
  );
  if (
    counts.size !== 6 ||
    [...counts.values()].reduce((a, b) => a + b, 0) !== 7 ||
    matrix.maxTotalProviderImages !== 8
  )
    throw new Error("Targeted matrix must have a 7/1/8 budget");
  return { counts, hash, limits: { initial: 7, repair: 1, total: 8 } };
}

export const GROUNDING_RUN_ID = "final-grounding-claims-2026-09";
export const GROUNDING_MATRIX_PATH = new URL(
  "../image-evals/final/grounding-matrix.json",
  import.meta.url,
);
export const GROUNDING_STATE_PATH = resolve("benchmark-results/final-grounding-claims/state.json");
export const GROUNDING_MATRIX_HASH =
  "9f2379b3a28f9ff9e2536018abd2604531e2c3e707e788dd32be8cda8d7a5bc7";
export function readGroundingMatrix(path: string | URL = GROUNDING_MATRIX_PATH) {
  const bytes = readFileSync(path);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== GROUNDING_MATRIX_HASH) throw new Error("Frozen grounding matrix hash mismatch");
  const matrix = JSON.parse(bytes.toString());
  const counts = new Map<string, number>(
    matrix.scenarios.map((s: { id: string; images: number }) => [s.id, s.images]),
  );
  if (
    counts.size !== 2 ||
    counts.get("game-grounding") !== 1 ||
    counts.get("location-grounding") !== 1 ||
    matrix.maxInitialImages !== 2 ||
    matrix.maxRepairImages !== 1 ||
    matrix.maxTotalProviderImages !== 3
  )
    throw new Error("Grounding matrix must have a 2/1/3 budget");
  return { counts, hash, limits: { initial: 2, repair: 1, total: 3 } };
}

export const AUTHORITY_RUN_ID = "final-location-authority-2026-09";
export const AUTHORITY_MATRIX_PATH = new URL(
  "../image-evals/final/location-authority-matrix.json",
  import.meta.url,
);
export const AUTHORITY_STATE_PATH = resolve(
  "benchmark-results/final-location-authority/state.json",
);
export const AUTHORITY_MATRIX_HASH =
  "c1d9115d031200f114a1b21bd73090e3c750cc3147e4217d37ba104c5b7c24f1";
export function readAuthorityMatrix(path: string | URL = AUTHORITY_MATRIX_PATH) {
  const bytes = readFileSync(path);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== AUTHORITY_MATRIX_HASH) throw new Error("Frozen authority matrix hash mismatch");
  const matrix = JSON.parse(bytes.toString());
  const counts = new Map<string, number>(
    matrix.scenarios.map((s: { id: string; images: number }) => [s.id, s.images]),
  );
  if (
    counts.size !== 1 ||
    counts.get("location-grounding") !== 1 ||
    matrix.maxInitialImages !== 1 ||
    matrix.maxRepairImages !== 1 ||
    matrix.maxTotalProviderImages !== 2
  )
    throw new Error("Authority matrix must have a 1/1/2 budget");
  return { counts, hash, limits: { initial: 1, repair: 1, total: 2 } };
}

export function readFinalMatrix(path: string | URL = FINAL_MATRIX_PATH) {
  const bytes = readFileSync(path);
  const matrix = JSON.parse(bytes.toString());
  const counts = new Map<string, number>();
  for (const scenario of matrix.scenarios ?? []) {
    if (
      typeof scenario.id !== "string" ||
      counts.has(scenario.id) ||
      !Number.isSafeInteger(scenario.images) ||
      scenario.images < 1
    )
      throw new Error("Invalid final matrix scenario");
    counts.set(scenario.id, scenario.images);
  }
  const initial = [...counts.values()].reduce((a, b) => a + b, 0);
  if (
    matrix.version !== 2 ||
    matrix.status !== "frozen-not-executed" ||
    counts.size !== 14 ||
    matrix.maxScenarios !== 14 ||
    initial !== 18 ||
    matrix.maxInitialImages !== initial ||
    matrix.maxRepairImages !== 1 ||
    matrix.maxTotalProviderImages !== 19 ||
    initial + matrix.maxRepairImages !== matrix.maxTotalProviderImages
  )
    throw new Error("Final matrix must contain exactly 14 scenarios and an 18/1/19 budget");
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== FINAL_MATRIX_HASH) throw new Error("Frozen final matrix hash mismatch");
  return { counts, hash, limits: { initial, repair: 1, total: 19 } };
}

/**
 * Exclusive process-shared lock, durable atomic replacement, and no stale-lock recovery.
 * A crash while locked blocks resume pending inspection; it can never replenish a slot.
 * Opening an existing run never creates missing state. Initialization is explicit.
 */
export class VerificationBudget {
  private readonly matrix;
  readonly statePath: string;
  readonly runId: string;

  constructor(
    options: {
      statePath?: string;
      runId?: string;
      matrixPath?: string | URL;
      profile?: "final" | "targeted" | "grounding" | "authority";
    } = {},
  ) {
    const profiles = {
      authority: { state: AUTHORITY_STATE_PATH, run: AUTHORITY_RUN_ID, read: readAuthorityMatrix },
      final: { state: FINAL_STATE_PATH, run: FINAL_RUN_ID, read: readFinalMatrix },
      targeted: { state: TARGETED_STATE_PATH, run: TARGETED_RUN_ID, read: readTargetedMatrix },
      grounding: { state: GROUNDING_STATE_PATH, run: GROUNDING_RUN_ID, read: readGroundingMatrix },
    };
    const profile = profiles[options.profile ?? "final"];
    this.statePath = resolve(options.statePath ?? profile.state);
    this.runId = options.runId ?? profile.run;
    this.matrix = profile.read(options.matrixPath);
  }

  initialize(): VerificationState {
    mkdirSync(dirname(this.statePath), { recursive: true });
    return this.locked(() => {
      if (existsSync(this.statePath)) return this.read();
      if (existsSync(`${this.statePath}.initialized`))
        throw new Error("Previously initialized run has lost its state; refusing reset");
      const state: VerificationState = {
        version: 1,
        runId: this.runId,
        matrixHash: this.matrix.hash,
        limits: { ...this.matrix.limits },
        used: { initial: 0, repair: 0, total: 0 },
        attempts: {},
        nonImageCalls: { web: 0, visual: 0, validation: 0, ocr: 0, cacheHit: 0 },
      };
      const marker = openSync(`${this.statePath}.initialized`, "wx", 0o600);
      try {
        writeFileSync(marker, this.runId + "\n");
        fsyncSync(marker);
      } finally {
        closeSync(marker);
      }
      this.write(state);
      return state;
    });
  }

  snapshot(): VerificationState {
    return this.read();
  }

  reserve(attempts: readonly VerificationAttempt[]): void {
    if (!attempts.length) throw new Error("Empty reservation");
    this.locked(() => {
      const state = this.read();
      const added: Totals = { initial: 0, repair: 0, total: attempts.length };
      const seen = new Set<string>();
      for (const attempt of attempts) {
        if (!["initial", "repair"].includes(attempt.kind))
          throw new Error("Invalid verification image call kind");
        added[attempt.kind]++;
      }
      if (state.used.repair + added.repair > state.limits.repair) {
        const owner = Object.values(state.attempts).find((a) => a.kind === "repair");
        throw new Error(
          `Global verification repair budget already consumed by scenario ${owner?.scenarioId ?? "in this batch"}`,
        );
      }
      for (const kind of ["initial", "total"] as const)
        if (state.used[kind] + added[kind] > state.limits[kind])
          throw new Error(`Verification ${kind} image budget exhausted`);
      for (const attempt of attempts) {
        this.validateAttempt(attempt);
        if (seen.has(attempt.attemptKey) || Object.hasOwn(state.attempts, attempt.attemptKey))
          throw new Error(`Attempt already spent: ${attempt.attemptKey}`);
        seen.add(attempt.attemptKey);
      }
      for (const attempt of attempts)
        state.attempts[attempt.attemptKey] = {
          ...attempt,
          status: "reserved",
          reservedAt: new Date().toISOString(),
        };
      for (const kind of ["initial", "repair", "total"] as const) state.used[kind] += added[kind];
      this.write(state);
    });
  }

  finish(attemptKey: string, status: "succeeded" | "failed", httpStatus?: number): void {
    this.locked(() => {
      const state = this.read();
      const attempt = state.attempts[attemptKey];
      if (!attempt || attempt.status !== "reserved") throw new Error("Attempt is not reserved");
      attempt.status = status;
      attempt.finishedAt = new Date().toISOString();
      if (httpStatus !== undefined) attempt.httpStatus = httpStatus;
      this.write(state);
    });
  }

  recordNonImageCall(kind: NonImageCallKind): void {
    this.locked(() => {
      const state = this.read();
      if (!Object.hasOwn(state.nonImageCalls, kind)) throw new Error("Unknown non-image call kind");
      state.nonImageCalls[kind]++;
      this.write(state);
    });
  }

  private validateAttempt(attempt: VerificationAttempt): void {
    if (
      attempt.runId !== this.runId ||
      !this.matrix.counts.has(attempt.scenarioId) ||
      !["initial", "repair"].includes(attempt.kind)
    )
      throw new Error("Invalid verification attempt identity or kind");
    // Separate namespaces: scenario 13 initial is repair:0; its automatic repair is repair:auto:0.
    const prefix = `${attempt.scenarioId}:${attempt.kind === "repair" ? "auto:" : ""}`;
    const index = attempt.attemptKey.slice(prefix.length);
    if (
      !attempt.attemptKey.startsWith(prefix) ||
      !/^(0|[1-9][0-9]*)$/.test(index) ||
      Number(index) >= (attempt.kind === "repair" ? 1 : this.matrix.counts.get(attempt.scenarioId)!)
    )
      throw new Error("Attempt key is not a planned image slot");
  }

  private read(): VerificationState {
    const state = JSON.parse(readFileSync(this.statePath, "utf8")) as VerificationState;
    if (
      state.version !== 1 ||
      state.runId !== this.runId ||
      state.matrixHash !== this.matrix.hash ||
      !state.attempts ||
      Array.isArray(state.attempts)
    )
      throw new Error("Invalid verification state identity");
    const actual: Totals = { initial: 0, repair: 0, total: 0 };
    for (const [key, attempt] of Object.entries(state.attempts)) {
      this.validateAttempt(attempt);
      if (
        key !== attempt.attemptKey ||
        !["reserved", "succeeded", "failed"].includes(attempt.status)
      )
        throw new Error("Invalid persisted attempt");
      actual[attempt.kind]++;
      actual.total++;
    }
    for (const kind of ["initial", "repair", "total"] as const)
      if (
        state.limits?.[kind] !== this.matrix.limits[kind] ||
        state.used?.[kind] !== actual[kind] ||
        actual[kind] > this.matrix.limits[kind]
      )
        throw new Error("Invalid verification counters or limits");
    for (const kind of ["web", "visual", "validation", "ocr", "cacheHit"] as const)
      if (!Number.isSafeInteger(state.nonImageCalls?.[kind]) || state.nonImageCalls[kind] < 0)
        throw new Error("Invalid non-image accounting");
    return state;
  }

  private locked<T>(operation: () => T): T {
    const lock = `${this.statePath}.lock`;
    try {
      mkdirSync(lock);
    } catch {
      throw new Error("Verification state locked or unavailable; refusing provider calls");
    }
    try {
      return operation();
    } finally {
      rmdirSync(lock);
    }
  }

  private write(state: VerificationState): void {
    const temp = `${this.statePath}.${randomUUID()}.tmp`;
    let fd: number | undefined;
    try {
      fd = openSync(temp, "wx", 0o600);
      writeFileSync(fd, JSON.stringify(state, null, 2) + "\n");
      fsyncSync(fd);
      closeSync(fd);
      fd = undefined;
      renameSync(temp, this.statePath);
      // Persist the directory entry as well as the file contents before allowing a call.
      const directory = openSync(dirname(this.statePath), "r");
      try {
        fsyncSync(directory);
      } finally {
        closeSync(directory);
      }
    } finally {
      if (fd !== undefined) closeSync(fd);
      if (existsSync(temp)) unlinkSync(temp);
    }
  }
}
