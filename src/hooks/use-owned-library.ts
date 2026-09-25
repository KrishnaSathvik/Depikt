import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchUserPrompts } from "@/lib/library";
import { privateScope, isCurrentPrivateScope, type PrivateScope } from "@/lib/private-cache";
import type { LibraryPrompt } from "@/types/library";

/** Private prompts never enter the shared route loader or public Library cache. */
export function useOwnedLibrary() {
  const { user } = useAuth();
  const userId = user?.id;
  const epoch = userId ? privateScope(userId).epoch : null;
  const [state, setState] = useState<{
    scope: PrivateScope;
    prompts: LibraryPrompt[];
    error: boolean;
  } | null>(null);
  useEffect(() => {
    if (!userId) return;
    const scope = privateScope(userId);
    let cancelled = false;
    fetchUserPrompts(userId).then(
      (prompts) => {
        if (!cancelled && isCurrentPrivateScope(scope))
          setState({ scope, prompts: prompts.filter((p) => p.user_id === userId), error: false });
      },
      () => {
        if (!cancelled && isCurrentPrivateScope(scope))
          setState({ scope, prompts: [], error: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, epoch]);
  return state && userId === state.scope.userId && isCurrentPrivateScope(state.scope)
    ? state
    : { prompts: [], error: false };
}
