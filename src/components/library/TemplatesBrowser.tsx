import { useNavigate } from "@tanstack/react-router";
import { TemplateSetup } from "@/components/TemplateSetup";
import type { Template } from "@/data/templates";
import {
  composeTemplateBrief,
  saveTemplateValues,
  type TemplateValues,
} from "@/lib/template-context";
import { trackEvent } from "@/lib/analytics";
import { CTA, ROUTES } from "@/lib/product";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { saveGenerationHandoff } from "@/lib/generation/handoff";

/** Guided setup shared by every Library content view. */
export function TemplatesBrowser({
  selected,
  onClose,
  trigger,
}: {
  selected: Template | null;
  onClose: () => void;
  trigger: HTMLElement | null;
}) {
  const navigate = useNavigate();
  const continueToGenerate = (values: TemplateValues) => {
    if (!selected) return;
    saveTemplateValues(selected.slug, values);
    trackEvent("template_sent_to_prompt", { template: selected.slug });
    onClose();
    if (isNativeGenerationEnabled()) {
      saveGenerationHandoff({
        prompt: composeTemplateBrief(selected, values),
        references: [],
        structuredAspectRatio: null,
        sourceType: "template",
        sourceId: selected.slug,
      });
      void navigate({ to: ROUTES.legacyBuilder });
      return;
    }
    navigate({ to: "/prompt", search: { mode: "build" as const, template: selected.slug } });
  };

  return (
    <TemplateSetup
      template={selected}
      open={!!selected}
      onOpenChange={(open) => !open && onClose()}
      onContinue={continueToGenerate}
      continueLabel={CTA.continueToGenerate}
      returnFocusTo={trigger}
    />
  );
}
