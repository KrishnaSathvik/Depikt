export function jobsNeedingStart(jobs: Array<{ id: string; status: string }>): string[] {
  return jobs.filter((job) => job.status === "queued").map((job) => job.id);
}

export function duplicateStartResponse(
  status: string,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify({ claimed: false, status }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export function classifyJobClaimResult(result: {
  data: unknown;
  error: unknown;
}): "error" | "duplicate" | "claimed" {
  if (result.error) return "error";
  if (!result.data) return "duplicate";
  return "claimed";
}
