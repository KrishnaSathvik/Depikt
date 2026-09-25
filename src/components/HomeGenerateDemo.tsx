import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CreationComposer, COMPOSER_TEXTAREA_CLASS } from "@/components/composer/CreationComposer";
import { HOME_GENERATE_EXAMPLES } from "@/data/home-generate-examples";
import { saveGenerationHandoff } from "@/lib/generation/handoff";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { processReferenceImage } from "@/lib/image-utils";
import { trackEvent } from "@/lib/analytics";
import { CTA, HOME_ACTION, ROUTES } from "@/lib/product";
import { cn } from "@/lib/utils";

const ASPECT_CLASS: Record<(typeof HOME_GENERATE_EXAMPLES)[number]["aspect"], string> = {
  portrait: "aspect-[3/4]",
  square: "aspect-square",
  ticket: "aspect-[3/4]",
};

/**
 * Mini Generate surface on the homepage. Types a real example prompt, then
 * crossfades a saved Images 2.5 result. No provider call and no fake
 * progress. If the visitor types their own prompt and presses Generate image,
 * the existing Generate handoff + auth gate take over.
 */
export function HomeGenerateDemo() {
  const navigate = useNavigate();
  const generationLive = isNativeGenerationEnabled();
  const [exampleId, setExampleId] = useState(HOME_GENERATE_EXAMPLES[0].id);
  const [replay, setReplay] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [typedDone, setTypedDone] = useState(false);
  const [userEdited, setUserEdited] = useState(false);
  const [reference, setReference] = useState<{ dataUrl: string } | null>(null);

  const example =
    HOME_GENERATE_EXAMPLES.find((e) => e.id === exampleId) ?? HOME_GENERATE_EXAMPLES[0];
  const showExample = !userEdited && !reference && typedDone && prompt === example.prompt;

  useEffect(() => {
    if (userEdited) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPrompt(example.prompt);
      setTypedDone(true);
      return;
    }

    setPrompt("");
    setTypedDone(false);
    let i = 0;
    const full = example.prompt;
    const id = window.setInterval(() => {
      i = Math.min(full.length, i + 2);
      setPrompt(full.slice(0, i));
      if (i >= full.length) {
        window.clearInterval(id);
        setTypedDone(true);
      }
    }, 22);
    return () => window.clearInterval(id);
  }, [example.prompt, replay, userEdited]);

  function selectExample(id: string) {
    setExampleId(id);
    setUserEdited(false);
    setReference(null);
    setReplay((n) => n + 1);
  }

  function onPromptChange(value: string) {
    setUserEdited(true);
    setTypedDone(true);
    setPrompt(value);
  }

  async function onPickReference(file: File) {
    setUserEdited(true);
    const processed = await processReferenceImage(file);
    setReference({ dataUrl: processed.dataUrl });
  }

  function goGenerate() {
    const text = prompt.trim();
    if (!text) return;
    trackEvent("home_generate_submit", {
      source: showExample ? example.id : "custom",
    });
    if (generationLive) {
      saveGenerationHandoff({
        prompt: text,
        references: reference ? [reference] : [],
        sourceType: "direct",
        autoStart: true,
      });
      void navigate({ to: ROUTES.legacyBuilder });
      return;
    }
    void navigate({
      to: "/prompt",
      search: { mode: "build" as const, prefill: text.slice(0, 4000) },
    });
  }

  return (
    <section>
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 md:py-16 lg:px-12">
        <h2 className="max-w-[18ch] text-heading-xl text-[color:var(--text-primary)] md:text-display-md">
          {HOME_ACTION.title}
        </h2>
        <p className="mt-3 max-w-[52ch] text-body-lg text-[color:var(--text-secondary)]">
          {HOME_ACTION.body}
        </p>

        <div
          className={cn(
            "mt-8 grid items-start gap-6",
            showExample || (!userEdited && !reference)
              ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
              : "",
          )}
        >
          <CreationComposer
            className="rounded-md"
            caption={generationLive ? HOME_ACTION.creditCaption : undefined}
            referencesSlot={
              <>
                {reference && (
                  <div className="inline-flex items-center gap-2 rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-subtle)] px-2.5 py-1.5">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded">
                      <img src={reference.dataUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <span className="text-[12px] font-mono text-[color:var(--text-secondary)]">
                      Reference image
                    </span>
                    <button
                      type="button"
                      aria-label="Remove reference"
                      onClick={() => setReference(null)}
                      className="ml-1 rounded p-0.5 text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--text-primary)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {!reference && (
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-[color:var(--border-subtle)] px-2.5 py-1.5 text-[12px] font-mono text-[color:var(--text-tertiary)] transition-colors hover:border-[color:var(--border-default)] hover:text-[color:var(--text-secondary)]">
                    <ImagePlus className="h-3.5 w-3.5" />
                    {HOME_ACTION.addReference}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void onPickReference(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </>
            }
            submit={
              <Button onClick={goGenerate} disabled={!prompt.trim()} className="gap-2">
                {generationLive ? CTA.generateImage : CTA.improvePrompt} <ArrowRight />
              </Button>
            }
          >
            <Textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              onFocus={() => {
                if (!typedDone) {
                  setUserEdited(true);
                  setTypedDone(true);
                }
              }}
              placeholder="Describe your image..."
              rows={6}
              aria-label="Image prompt"
              className={COMPOSER_TEXTAREA_CLASS}
            />
          </CreationComposer>

          {(!userEdited || showExample) && (
            <figure className="min-w-0">
              <div
                className={cn(
                  "overflow-hidden border border-[color:var(--border-default)] bg-[color:var(--bg-subtle)]",
                  ASPECT_CLASS[example.aspect],
                )}
              >
                <img
                  src={`/library/images-2-5/${example.slug}.webp`}
                  alt={example.alt}
                  className={cn(
                    "h-full w-full object-cover transition-opacity duration-500 ease-out",
                    showExample ? "opacity-100" : "opacity-0",
                  )}
                />
              </div>
              <figcaption
                className={cn(
                  "mt-3 flex flex-wrap items-baseline justify-between gap-2 transition-opacity duration-500",
                  showExample ? "opacity-100" : "opacity-0",
                )}
              >
                <span className="text-body-sm text-[color:var(--text-tertiary)]">
                  {HOME_ACTION.exampleLabel}
                </span>
                <button
                  type="button"
                  onClick={goGenerate}
                  className="inline-flex items-center gap-1 text-body-sm font-medium text-[color:var(--text-primary)] underline-offset-4 hover:underline"
                >
                  {HOME_ACTION.tryPrompt} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </figcaption>
            </figure>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <p className="eyebrow">{HOME_ACTION.tryExamples}</p>
          {HOME_GENERATE_EXAMPLES.map((item) => {
            const selected = item.id === exampleId && !userEdited;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectExample(item.id)}
                aria-pressed={selected}
                className={cn(
                  "text-body-sm transition-colors underline-offset-4",
                  selected
                    ? "font-medium text-[color:var(--text-primary)] underline"
                    : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
