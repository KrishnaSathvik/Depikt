import { urlToProcessedImage } from "@/lib/image-utils";
import type { ReferenceImageState } from "@/lib/reference-image";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
  type ReactNode,
} from "react";
import { useGeneration } from "@/lib/generation/use-generation";
import type { ReferenceEntity } from "@/lib/generation/entities";
import { useAuth } from "@/lib/auth-context";

const AuthGateDialog = lazy(() =>
  import("@/components/auth/AuthGateDialog").then((m) => ({ default: m.AuthGateDialog })),
);

function useDraftState() {
  const [prompt, setPrompt] = useState("");
  const [selectedEntities, setSelectedEntities] = useState<ReferenceEntity[]>([]);
  const gen = useGeneration({ sourceContext: { type: "direct" }, resumeAllSources: true });
  const { user } = useAuth();
  const previousOwner = useRef(user?.id);
  useEffect(() => {
    if (previousOwner.current && previousOwner.current !== user?.id) {
      setSelectedEntities([]);
      gen.clearReferences();
      gen.reset();
    }
    previousOwner.current = user?.id;
    // Account changes must not retain another owner's saved references.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  async function getToolReference(): Promise<ReferenceImageState | null> {
    if (gen.references[0]) return gen.references[0].local;
    const entity = selectedEntities.find((entry) => entry.user_id === user?.id);
    const asset =
      entity?.assets.find((entry) => entry.role === "primary" || entry.role === "logo") ??
      entity?.assets[0];
    if (!asset?.previewUrl) return null;
    const processed = await urlToProcessedImage(asset.previewUrl);
    return { dataUrl: processed.dataUrl, file: null, intent: "auto", meta: processed };
  }
  return { prompt, setPrompt, selectedEntities, setSelectedEntities, gen, getToolReference };
}
const Context = createContext<ReturnType<typeof useDraftState> | null>(null);
export function CreatorDraftProvider({ children }: { children: ReactNode }) {
  const draft = useDraftState();
  return (
    <Context.Provider value={draft}>
      {children}
      {draft.gen.authPrompt && (
        <Suspense fallback={null}>
          <AuthGateDialog gen={draft.gen} />
        </Suspense>
      )}
    </Context.Provider>
  );
}
// The provider and its consumer hook intentionally share this context module.
// eslint-disable-next-line react-refresh/only-export-components
export function useCreatorDraft() {
  const draft = useContext(Context);
  if (!draft) throw new Error("Creator tools must be inside CreatorDraftProvider");
  return draft;
}
