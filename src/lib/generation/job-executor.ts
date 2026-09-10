// Native image generation — background job execution.
//
// UNVERIFIED IN PRODUCTION. This session has no Cloudflare account access
// (`wrangler whoami` fails) and wrangler.jsonc has no Queues/Workflows/Cron
// bindings. The benchmark measured Sunburst max edits up to ~139s; whether
// Cloudflare Workers' background-execution window (ctx.waitUntil) on the
// deployed plan safely covers that is unconfirmed. Do not flip
// GENERATION_ENABLED in production until someone with Cloudflare account
// access checks the plan's limits against that number — see
// supabase/migrations/20260910130000_add_generation_job_lifecycle.sql for
// the fuller architecture note and the Queues/Workflows fallback.
//
// This interface exists so that fallback is a drop-in swap, not a rewrite:
// callers depend on JobExecutor, never on ctx.waitUntil directly.

export interface JobExecutor {
  /** Runs `task` after the caller's response can be returned; failures are the caller's job to handle (never let a rejection escape unhandled). */
  schedule(task: () => Promise<void>): void;
}

/** Cloudflare Workers' background-continuation primitive, as exposed by the platform ExecutionContext. */
export interface WaitUntilContext {
  waitUntil(promise: Promise<unknown>): void;
}

export function createWaitUntilExecutor(ctx: WaitUntilContext): JobExecutor {
  return {
    schedule(task) {
      ctx.waitUntil(
        task().catch((err: unknown) => {
          // A route that fires-and-forgets a job must not let a rejected
          // promise become an unhandled rejection that could crash the
          // Worker isolate. The job's own failure path (mark the job
          // failed, refund the credit) is responsible for recording this;
          // this catch is strictly a last-resort net.

          console.error("generation job executor: unhandled task failure", err);
        }),
      );
    },
  };
}

/** Runs the task inline and awaits it — for tests and any environment without a real waitUntil (never use in a request path that must return quickly). */
export function createInlineExecutor(): JobExecutor & { flush(): Promise<void> } {
  let pending: Promise<void> = Promise.resolve();
  return {
    schedule(task) {
      pending = pending.then(() => task());
    },
    async flush() {
      await pending;
    },
  };
}
