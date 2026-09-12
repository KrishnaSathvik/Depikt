import { AuthChooserDialog } from "@/components/auth/AuthChooserDialog";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { PromptSurface } from "@/components/PromptSurface";
import type { useGeneration } from "@/lib/generation/use-generation";
import { generationGateHeadline, promptExcerpt } from "@/lib/auth/gate-copy";
import { AUTH_COPY } from "@/lib/product";

/**
 * The in-context provider chooser shown when a signed-out user presses
 * Generate image / Generate rewrite. The pending submission was already
 * persisted by the hook (prompt, references, ratio, idempotency key);
 * picking a provider starts OAuth and the hook resumes the exact same
 * submission on return — no second click, no "sign up or sign in" choice
 * (every method handles both).
 *
 * Centered dialog on every viewport (matches BillingAuthDialog).
 */
export function AuthGateDialog({ gen }: { gen: ReturnType<typeof useGeneration> }) {
  const open = gen.authPrompt;
  const onOpenChange = (next: boolean) => !next && gen.dismissAuthPrompt();

  const headline = generationGateHeadline(gen.authPromptContext?.sourceType ?? "direct");
  const excerpt = gen.authPromptContext?.prompt
    ? promptExcerpt(gen.authPromptContext.prompt)
    : null;
  const referenceUrl = gen.authPromptContext?.referenceDataUrl ?? null;

  return (
    <AuthChooserDialog open={open} onOpenChange={onOpenChange} title={headline}>
      {excerpt && (
        <div className="mb-4 flex items-start gap-3">
          {referenceUrl && (
            <img
              src={referenceUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-md border border-[color:var(--border-subtle)] object-cover"
            />
          )}
          <PromptSurface bodyClassName="px-3 py-2.5 text-[13px]" className="flex-1">
            {excerpt}
          </PromptSurface>
        </div>
      )}
      <p className="text-body-sm text-[color:var(--text-secondary)]">
        Sign in or create a free account to continue.
      </p>
      <p className="mt-1 text-body-sm font-medium text-[color:var(--text-primary)]">
        {AUTH_COPY.starterCreditsLine}
      </p>
      <AuthSurface
        mode="sign-up"
        compact
        skipOwnSignIn
        busyLabel={AUTH_COPY.signingIn}
        className="mt-5 max-w-none"
        redirectTo={typeof window !== "undefined" ? window.location.href : undefined}
        onStart={(provider) => {
          if (provider !== "email") gen.chooseAuthProvider(provider);
        }}
      />
    </AuthChooserDialog>
  );
}
