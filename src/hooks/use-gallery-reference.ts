import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { saveGenerationHandoff } from "@/lib/generation/handoff";
import { urlToProcessedImage } from "@/lib/image-utils";
import { ROUTES } from "@/lib/product";

/** The same reference handoff for a card action and the enlarged preview. */
export function useGalleryReference() {
  const navigate = useNavigate();
  const [attaching, setAttaching] = useState(false);
  const attach = async (filename: string) => {
    if (attaching) return;
    if (!isNativeGenerationEnabled()) {
      void navigate({ to: "/prompt", search: { mode: "build", ref: `/gallery/${filename}` } });
      return;
    }
    setAttaching(true);
    try {
      const processed = await urlToProcessedImage(`/gallery/${filename}`);
      saveGenerationHandoff({
        prompt: "",
        references: [{ dataUrl: processed.dataUrl }],
        structuredAspectRatio: null,
        sourceType: "gallery",
        sourceId: filename,
      });
      await navigate({ to: ROUTES.legacyBuilder });
    } catch {
      toast.error("Could not use this image as a reference");
    } finally {
      setAttaching(false);
    }
  };
  return { attach, attaching };
}
