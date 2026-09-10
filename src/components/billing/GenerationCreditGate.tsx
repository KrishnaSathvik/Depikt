import { OutOfCreditsPanel } from "@/components/billing/OutOfCreditsPanel";
import type { useGeneration } from "@/lib/generation/use-generation";

/** Renders the shared out-of-credits panel when the generation hook says credits are exhausted. */
export function GenerationCreditGate({
  gen,
  className,
}: {
  gen: ReturnType<typeof useGeneration>;
  className?: string;
}) {
  if (gen.creditState !== "exhausted") return null;
  return <OutOfCreditsPanel className={className} />;
}
