/** Provider boundary for the final verification runner, not a product feature. */
import { AsyncLocalStorage } from "node:async_hooks";
import {
  VerificationBudget,
  type VerificationAttempt,
  type NonImageCallKind,
} from "./final-verification-budget.ts";

type Scope = { attempt: VerificationAttempt; called: boolean };
export type VerificationImageTask<T> = {
  attempt: VerificationAttempt;
  execute: (guardedFetch: typeof fetch) => Promise<T>;
};

export class FinalVerificationRunner {
  private readonly scope = new AsyncLocalStorage<Scope>();
  private readonly providerFetch: typeof fetch;
  readonly budget: VerificationBudget;

  constructor(budget: VerificationBudget, providerFetch: typeof fetch = fetch) {
    this.budget = budget;
    this.providerFetch = providerFetch;
    // Resume must find valid durable state; construction must never reset a run.
    budget.snapshot();
  }

  /** Inject into the real generateImage/editImage adapters and V5 repair dependencies. */
  readonly fetch: typeof fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (
      url.origin !== "https://api.openai.com" ||
      !["/v1/images/generations", "/v1/images/edits"].includes(url.pathname)
    )
      throw new Error("Image transport accepts only the configured OpenAI image endpoints");
    const scope = this.scope.getStore();
    if (!scope || scope.called) throw new Error("Unreserved or repeated provider request blocked");
    const request = new Request(input, { ...init, redirect: "error" });
    if (request.method !== "POST") throw new Error("Image transport requires POST");
    const body = request.headers.get("content-type")?.startsWith("multipart/form-data")
      ? await request.clone().formData()
      : await request.clone().json();
    const n = body instanceof FormData ? body.get("n") : body.n;
    if (n !== 1 && n !== "1")
      throw new Error("Each verification attempt must request exactly one image");
    // The durable batch reservation already exists. Consume this in-process capability before
    // the first await into the provider, so internal retries cannot reuse it either.
    if (scope.called) throw new Error("Repeated provider request blocked");
    const stored = this.budget.snapshot().attempts[scope.attempt.attemptKey];
    if (stored?.status !== "reserved") throw new Error("Durable reservation unavailable");
    scope.called = true;
    return this.providerFetch(request);
  };

  async image<T>(task: VerificationImageTask<T>): Promise<T> {
    const [result] = await this.series([task]);
    if (result.status === "rejected") throw result.reason;
    return result.value;
  }

  /** Reserve the entire batch before launching any child. No retry or released slots. */
  async series<T>(tasks: readonly VerificationImageTask<T>[]): Promise<PromiseSettledResult<T>[]> {
    const batch = tasks.map((task) => ({ ...task, attempt: { ...task.attempt } }));
    this.budget.reserve(batch.map((task) => task.attempt));
    return Promise.allSettled(
      batch.map((task) =>
        this.scope.run({ attempt: task.attempt, called: false }, async () => {
          try {
            const result = await task.execute(this.fetch);
            if (!this.scope.getStore()?.called)
              throw new Error("Reserved task made no image request");
            this.budget.finish(task.attempt.attemptKey, "succeeded");
            return result;
          } catch (error) {
            // A failed result write leaves the already-durable reservation spent too.
            const httpStatus =
              error instanceof Error && "status" in error && typeof error.status === "number"
                ? error.status
                : undefined;
            if (this.budget.snapshot().attempts[task.attempt.attemptKey]?.status === "reserved")
              this.budget.finish(task.attempt.attemptKey, "failed", httpStatus);
            throw error;
          }
        }),
      ),
    );
  }

  /** Separate telemetry; these calls cannot replenish or consume image slots. */
  async nonImage<T>(kind: NonImageCallKind, execute: () => Promise<T>): Promise<T> {
    this.budget.recordNonImageCall(kind);
    return execute();
  }

  /**
   * For a dedicated QA server/runner using application code's default global fetch.
   * Image calls outside image()/series() fail closed. Other transports pass through;
   * account for research/OCR/judging explicitly with nonImage(). Never install in production.
   */
  installForVerificationProcess(): () => void {
    if (process.env.NODE_ENV === "production") throw new Error("Verification guard is QA-only");
    const previous = globalThis.fetch;
    const guarded: typeof fetch = (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.hostname === "api.openai.com" && url.pathname.startsWith("/v1/images"))
        return this.fetch(input, init);
      // Responses may generate images through tools; this harness permits Images API only.
      if (url.hostname === "api.openai.com" && url.pathname === "/v1/responses") {
        return (async () => {
          const request = new Request(input, init);
          const body = await request.clone().json();
          if (body.tools?.some((tool: { type?: string }) => tool.type === "image_generation"))
            throw new Error(
              "Responses image generation is outside the frozen verification transport",
            );
          return this.providerFetch(request);
        })();
      }
      return this.providerFetch(input, init);
    };
    globalThis.fetch = guarded;
    return () => {
      if (globalThis.fetch !== guarded)
        throw new Error("Verification fetch was replaced unexpectedly");
      globalThis.fetch = previous;
    };
  }
}
