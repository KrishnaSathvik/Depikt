// Shared rule for Generate / Build / Critique submit: hydrating auth or
// credits must not be treated as signed-out or out-of-credit.

export type SubmitGateDecision = "wait" | "auth_gate" | "credit_gate" | "proceed";

export function decideSubmitGate(input: {
  authLoading: boolean;
  hasUser: boolean;
  credits: number | null;
  creditsResolved: boolean;
}): SubmitGateDecision {
  if (input.authLoading) return "wait";
  if (!input.hasUser) return "auth_gate";
  if (!input.creditsResolved) return "wait";
  if (input.credits === 0) return "credit_gate";
  return "proceed";
}
