import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Wand2,
  ExternalLink,
  Plus,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PromptSurface } from "@/components/PromptSurface";
import { toast } from "sonner";
import { extractPartialString, extractPartialStringArray } from "@/lib/partial-json";
import { addHistoryEntry, getHistoryById } from "@/lib/history-db";
import {
  ReferenceImagePicker,
  fileToReferenceState,
  MAX_UPLOAD_BYTES,
  type ReferenceImageState,
} from "@/components/ReferenceImagePicker";
import { readSSEStream } from "@/lib/sse";
import { urlToProcessedImage } from "@/lib/image-utils";
import { trackEvent } from "@/lib/analytics";
import {
  CTA,
  IMAGO_URL,
  INTENT_STAGE_LABELS,
  describeIntent,
  needsReferenceReattach,
} from "@/lib/product";
import { ReferenceReattachNote } from "@/components/ReferenceReattachNote";

/**
 * Build mode of the unified Prompt workspace (/prompt?mode=build).
 * The Builder pipeline, endpoint, history kind, and reference contracts are
 * unchanged — only the page shell moved.
 */
export interface BuildModeProps {
  search: BuildSearch;
  /** Strip consumed query params without leaving the workspace. */
  clearSearch: () => void;
  /** False while the workspace is showing the other mode (kept mounted for drafts). */
  active: boolean;
}

export interface BuildSearch {
  seed?: string;
  prefill?: string;
  remixRef?: string;
  restore?: string;
  ref?: string;
}


interface PromptResult {
  prompt?: string;
  prompts?: string[];
  category?: string;
  why_it_works?: string;
  size?: string;
  quality?: string;
  aspect_ratio?: string;
  prompt_version?: string;
  intent?: Record<string, unknown>;
}

const EXAMPLE_CHIPS = [
  {
    label: "poster",
    text: "minimalist event poster for a data engineering meetup in SF next month",
  },
  {
    label: "app mockup",
    text: "iPhone home screen mockup for a meditation app, soft gradient background",
  },
  { label: "infographic", text: "infographic explaining how RAG works, 3 steps, mono palette" },
  {
    label: "cinematic scene",
    text: "cinematic shot of empty Tokyo street at dawn, neon reflections in puddles",
  },
];

export function BuildMode({ search, clearSearch, active }: BuildModeProps) {
  const { seed, prefill, remixRef, restore, ref } = search;
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState<PromptResult | null>(null);
  const [savedRoughIdea, setSavedRoughIdea] = useState("");
  const [inputCollapsed, setInputCollapsed] = useState(false);
  // Reference image state (processed data URL + how it should be used)
  const [reference, setReference] = useState<ReferenceImageState | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  // Intent reported by the analyzer stage while streaming (dev/debug + history)
  const [liveIntent, setLiveIntent] = useState<Record<string, unknown> | null>(null);
  // Lazy "more variations" state — appended to the original output
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreVariants, setMoreVariants] = useState<string[] | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [remixReference, setRemixReference] = useState<string | null>(null);

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Image too large (max 10MB)");
      return;
    }
    setImageLoading(true);
    try {
      setReference(await fileToReferenceState(file, reference?.intent ?? "auto"));
    } catch {
      toast.error("Failed to process image");
    } finally {
      setImageLoading(false);
    }
  };

  // Restore from history (does not re-generate)
  useEffect(() => {
    if (!restore) return;
    (async () => {
      const entry = await getHistoryById(restore);
      if (entry && entry.kind === "generate") {
        setInput(entry.roughIdea);
        setSavedRoughIdea(entry.roughIdea);
        setResult(entry.result as PromptResult);
        setInputCollapsed(true);
        if (entry.referenceImage) {
          setReference({
            dataUrl: entry.referenceImage,
            file: null,
            intent: (entry.referenceIntent as ReferenceImageState["intent"]) ?? "auto",
          });
        } else if (entry.referenceImageOmitted) {
          toast.message("Restored without its reference image (too large to store).");
        }
      }
      // Strip the restore param so a refresh doesn't replay it
      clearSearch();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restore]);

  // Load reference image from URL (gallery flow)
  useEffect(() => {
    if (!ref) return;
    setImageLoading(true);
    urlToProcessedImage(ref)
      .then((img) => setReference({ dataUrl: img.dataUrl, file: null, intent: "auto", meta: img }))
      .catch(() => toast.error("Failed to load reference image"))
      .finally(() => setImageLoading(false));
    clearSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  // Prefill from query param (library remix — just fills textarea, no auto-generate)
  useEffect(() => {
    if (prefill) {
      setInput(prefill);
      if (remixRef) setRemixReference(remixRef);
      clearSearch();
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  // Seed from query param (auto-generates)
  useEffect(() => {
    if (seed) {
      setInput(seed);
      setSavedRoughIdea(seed);
      setInputCollapsed(true);
      // Strip the seed param first, then generate — avoids mid-stream re-render
      clearSearch();
      // Defer generate to next tick so the navigation settles before streaming starts
      setTimeout(() => generateFromSeed(seed), 0);
    } else if (!restore && active) {
      textareaRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const getEndpoint = (path: string) => {
    if (typeof window === "undefined") return path;
    const host = window.location.hostname;
    const m = host.match(/^id-preview--([0-9a-f-]+)\.lovable\.app$/i);
    if (m) return `https://project--${m[1]}-dev.lovable.app${path}`;
    return path;
  };

  const generateFromSeed = async (seedInput: string) => {
    setLoading(true);
    setStreaming(false);
    setResult(null);
    setMoreVariants(null);

    try {
      const res = await fetch(getEndpoint("/api/public/generate-prompt"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          userInput: seedInput,
          referenceImageUrl: undefined,
          category: "auto",
          mode: "default",
        }),
      });

      if (!res.ok || !res.body) {
        let msg = "Couldn't build the prompt";
        try {
          const data = await res.json();
          msg = data?.error || msg;
        } catch {
          /* ignore */
        }
        toast.error(msg);
        return;
      }

      const finalResult = await streamPrompt(
        res,
        (partial) => setResult(partial),
        () => {
          setLoading(false);
          setStreaming(true);
        },
      );
      if (finalResult) {
        setResult(finalResult);
        setStreaming(false);
        addHistoryEntry({
          kind: "generate",
          roughIdea: seedInput,
          result: finalResult as Record<string, unknown>,
        });
      } else {
        toast.error("The prompt ended before a final result arrived. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error. Try again.");
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const generate = async (overrideInput?: string) => {
    const userInput = (overrideInput ?? input).trim();
    if (!userInput) {
      toast.error("Describe what you want to make first");
      return;
    }
    trackEvent("build_submitted", { has_reference: Boolean(reference?.dataUrl) });
    setLoading(true);
    setStreaming(false);
    setResult(null);
    setMoreVariants(null);
    setInputCollapsed(false);
    setSavedRoughIdea(userInput);

    try {
      const res = await fetch(getEndpoint("/api/public/generate-prompt"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          userInput,
          referenceImageUrl: reference?.dataUrl || undefined,
          referenceIntent: reference?.intent || undefined,
          remixRef: remixReference || undefined,
          category: "auto",
          mode: "default",
        }),
      });

      if (!res.ok || !res.body) {
        let msg = "Couldn't build the prompt";
        try {
          const data = await res.json();
          msg = data?.error || msg;
        } catch {
          /* ignore */
        }
        toast.error(msg);
        return;
      }

      setLiveIntent(null);
      const finalResult = await streamPrompt(
        res,
        (partial) => setResult(partial),
        () => {
          setLoading(false);
          setStreaming(true);
        },
        (intent) => setLiveIntent(intent),
      );
      if (finalResult) {
        setResult(finalResult);
        setStreaming(false);
        setInputCollapsed(true);
        addHistoryEntry({
          kind: "generate",
          roughIdea: userInput,
          result: finalResult as Record<string, unknown>,
          referenceImage: reference?.dataUrl ?? null,
          referenceIntent: reference?.intent ?? null,
        });
      } else {
        toast.error("The prompt ended before a final result arrived. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error. Try again.");
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const fetchMoreVariations = async () => {
    if (!savedRoughIdea) return;
    setMoreLoading(true);
    try {
      const res = await fetch(getEndpoint("/api/public/generate-prompt"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          userInput: savedRoughIdea,
          referenceImageUrl: reference?.dataUrl || undefined,
          referenceIntent: reference?.intent || undefined,
          category: "auto",
          mode: "BATCH",
        }),
      });
      if (!res.ok || !res.body) {
        toast.error("Couldn't build variations");
        return;
      }
      const finalResult = await streamPrompt(res);
      if (finalResult?.prompts && finalResult.prompts.length > 0) {
        // Drop the first (it's the "safe" one — equivalent to the existing prompt).
        // Keep the next two — stylized + experimental.
        setMoreVariants(finalResult.prompts.slice(1, 3));
      } else {
        toast.error("Variations ended before a final result arrived. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error. Try again.");
    } finally {
      setMoreLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      generate();
    }
  };

  const handleNewPrompt = () => {
    setInput("");
    setResult(null);
    setMoreVariants(null);
    setSavedRoughIdea("");
    setReference(null);
    setLiveIntent(null);
    setRemixReference(null);
    setInputCollapsed(false);
    setTimeout(() => {
      textareaRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };

  const handleChipClick = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const showOutput = loading || streaming || result;

  return (
    <div>
      <div>
        {/* INPUT */}
        {inputCollapsed && savedRoughIdea ? (
          <CollapsedInput
            text={savedRoughIdea}
            onExpand={() => {
              setInputCollapsed(false);
              setInput(savedRoughIdea);
              setTimeout(() => textareaRef.current?.focus(), 0);
            }}
          />
        ) : (
          <div>
            <h2 className="text-display-md sm:text-display-lg text-[color:var(--text-primary)]">
              What do you want to create?
            </h2>
            <p className="mt-4 text-body-lg text-[color:var(--text-secondary)] max-w-[56ch]">
              Describe the image you have in mind. Add a reference if you have one.
            </p>

            <div className="mt-8">
              <label htmlFor="rough-idea" className="sr-only">
                Describe what you want to make
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleImageFile(file);
                }}
              >
                <Textarea
                  id="rough-idea"
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={(e) => {
                    const file = e.clipboardData.files?.[0];
                    if (file && file.type.startsWith("image/")) {
                      e.preventDefault();
                      handleImageFile(file);
                    }
                  }}
                  placeholder="Describe the image you want to create..."
                  className="min-h-[220px] resize-y text-[17px] leading-[1.6] px-5 py-4 sm:text-[18px]"
                />
              </div>

              {/* Reference image + "use as" selector */}
              <div className="mt-3">
                {imageLoading ? (
                  <div className="flex items-center gap-2 text-mono-sm text-[color:var(--text-tertiary)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Processing image…
                  </div>
                ) : (
                  <ReferenceImagePicker value={reference} onChange={setReference} />
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-mono-sm text-[color:var(--text-tertiary)] mr-1">Try:</span>
                {EXAMPLE_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleChipClick(chip.text)}
                    className="pill normal-case tracking-normal text-[12px] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Button
                  onClick={() => generate()}
                  disabled={loading || streaming}
                  size="lg"
                  className="gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {CTA.building}
                    </>
                  ) : streaming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Writing…
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      {CTA.build}
                    </>
                  )}
                </Button>
                <span className="text-mono-sm text-[color:var(--text-tertiary)] hidden sm:inline">
                  or press{" "}
                  <kbd className="px-1.5 py-0.5 rounded-sm bg-[color:var(--bg-subtle)] border border-[color:var(--border-subtle)] font-mono text-[11px]">
                    {navigator.platform?.toUpperCase().includes("MAC") ? "⌘" : "Ctrl"} Enter
                  </kbd>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* OUTPUT */}
        {showOutput && (
          <div className="mt-10 border-t border-[color:var(--text-primary)] pt-8">
            {loading && !result && <LoadingState intent={liveIntent} />}
            {result && (
              <ResultView
                result={result}
                streaming={streaming}
                moreVariants={moreVariants}
                moreLoading={moreLoading}
                referenceThumb={
                  needsReferenceReattach(result.intent?.reference_intent, !!reference?.dataUrl)
                    ? reference!.dataUrl
                    : null
                }
                onRegenerate={() => generate(savedRoughIdea)}
                onMoreVariations={fetchMoreVariations}
                onNewPrompt={handleNewPrompt}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Stream parser shared between generate() and fetchMoreVariations()
async function streamPrompt(
  res: Response,
  onPartial?: (partial: PromptResult) => void,
  onFirstByte?: () => void,
  onIntent?: (intent: Record<string, unknown>) => void,
): Promise<PromptResult | null> {
  let gotFirst = false;

  const applyPartial = (args: string) => {
    if (!onPartial) return;
    const partial: PromptResult = {};
    const p = extractPartialString(args, "prompt");
    if (p) partial.prompt = p;
    const arr = extractPartialStringArray(args, "prompts");
    if (arr && arr.length) partial.prompts = arr;
    const cat = extractPartialString(args, "category");
    if (cat) partial.category = cat;
    const why = extractPartialString(args, "why_it_works");
    if (why) partial.why_it_works = why;
    onPartial(partial);
  };

  return readSSEStream<PromptResult>(res, {
    onStatus: (json) => {
      if (json.message === "intent" && json.intent && typeof json.intent === "object") {
        onIntent?.(json.intent as Record<string, unknown>);
      }
    },
    onDelta: (json) => {
      if (typeof json.args !== "string") return;
      if (!gotFirst) {
        gotFirst = true;
        onFirstByte?.();
      }
      applyPartial(json.args);
    },
    onError: (json) => {
      toast.error(typeof json.error === "string" ? json.error : "Prompt build failed");
    },
  });
}

function CollapsedInput({ text, onExpand }: { text: string; onExpand: () => void }) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="group w-full text-left rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3 hover:border-[color:var(--border-strong)] transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-[13px] font-medium text-[color:var(--text-tertiary)]">
          Idea
        </span>
        <span className="text-body-sm text-[color:var(--text-secondary)] truncate flex-1">
          {text}
        </span>
        <ChevronRight className="h-4 w-4 text-[color:var(--text-tertiary)] group-hover:text-[color:var(--text-primary)] shrink-0 transition-colors" />
      </div>
    </button>
  );
}

/**
 * Two honest stages, no fake progress: "Understanding your request…" until
 * the intent analyzer answers, then "Understood: Poster · Style reference · 4:5"
 * with "Building your prompt…" until the first streamed token arrives.
 */
function LoadingState({ intent }: { intent?: Record<string, unknown> | null }) {
  const facts = describeIntent(intent);
  const understood = facts.length > 0;
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] p-6"
    >
      <div className="flex items-start gap-2.5 text-mono-sm text-[color:var(--text-secondary)]">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
        {understood ? (
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="text-[color:var(--text-tertiary)]">
                {INTENT_STAGE_LABELS.understood}
              </span>
              <span className="text-[color:var(--text-primary)]">{facts.join(" · ")}</span>
            </div>
            <div>{INTENT_STAGE_LABELS.building}</div>
          </div>
        ) : (
          <span>{INTENT_STAGE_LABELS.understanding}</span>
        )}
      </div>
      <div className="mt-6 space-y-2.5">
        <div className="h-2 rounded-sm bg-[color:var(--border-default)] animate-pulse" />
        <div className="h-2 rounded-sm bg-[color:var(--border-default)] animate-pulse" />
        <div className="h-2 w-4/5 rounded-sm bg-[color:var(--border-default)] animate-pulse" />
        <div className="h-2 w-3/4 rounded-sm bg-[color:var(--border-default)] animate-pulse" />
      </div>
    </div>
  );
}

interface CodeBlockProps {
  text: string;
  jsonView?: object;
  streaming?: boolean;
  /** Header label; variants pass "Safe", "Stylized", "Experimental". */
  label?: string;
}

function CodeBlock({ text, jsonView, streaming = false, label = "Your prompt" }: CodeBlockProps) {
  const [view, setView] = useState<"text" | "json">("text");
  const display = view === "json" && jsonView ? JSON.stringify(jsonView, null, 2) : text;

  const toggle =
    !streaming && jsonView ? (
      <div
        role="tablist"
        aria-label="Prompt view"
        className="flex items-center gap-0.5 rounded-md bg-[color:var(--bg-subtle)] p-0.5"
      >
        {(["text", "json"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`inline-flex h-6 items-center gap-1 rounded px-2 text-[12px] font-medium transition-colors ${
              view === v
                ? "bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] shadow-sm-card"
                : "text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
            }`}
          >
            {v === "text" ? <FileText className="h-3 w-3" /> : <Code2 className="h-3 w-3" />}
            {v === "text" ? "Text" : "JSON"}
          </button>
        ))}
      </div>
    ) : undefined;

  return (
    <PromptSurface label={label} actions={toggle}>
      {display}
      {streaming && (
        <span className="ml-0.5 inline-block h-4 w-1.5 -mb-0.5 animate-pulse bg-[color:var(--text-primary)] align-middle" />
      )}
    </PromptSurface>
  );
}

interface ResultViewProps {
  result: PromptResult;
  streaming?: boolean;
  moreVariants: string[] | null;
  moreLoading: boolean;
  /** Data URL of the reference the prompt depends on (null when the prompt is text-only). */
  referenceThumb?: string | null;
  onRegenerate: () => void;
  onMoreVariations: () => void;
  onNewPrompt: () => void;
}

function ResultView({
  result,
  streaming = false,
  moreVariants,
  moreLoading,
  referenceThumb = null,
  onRegenerate,
  onMoreVariations,
  onNewPrompt,
}: ResultViewProps) {
  // Batched generation result (the original mode is gone, but the API may still
  // return prompts[] if upstream config changes — keep backward compatible).
  if (result.prompts && result.prompts.length > 0) {
    const labels = ["Safe", "Stylized", "Experimental"];
    return (
      <div className="space-y-6">
        {result.category && <CategoryEyebrow category={result.category} />}
        {result.prompts.map((p, i) => {
          const isLast = i === result.prompts!.length - 1;
          return (
            <div key={i} className="space-y-2">
              <CodeBlock
                text={p}
                label={labels[i] || `Variant ${i + 1}`}
                streaming={streaming && isLast}
                jsonView={
                  !streaming
                    ? { variant: labels[i], prompt: p, category: result.category }
                    : undefined
                }
              />
              {!streaming && (
                <ActionRow
                  promptText={p}
                  onRegenerate={onRegenerate}
                  referenceThumb={referenceThumb}
                />
              )}
            </div>
          );
        })}
        {result.why_it_works && <WhyItWorks text={result.why_it_works} defaultOpen={false} />}
        {!streaming && <NewPromptButton onClick={onNewPrompt} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {result.category && <CategoryEyebrow category={result.category} />}
      {result.prompt && (
        <div className="space-y-2">
          <CodeBlock
            text={result.prompt}
            label={moreVariants && moreVariants.length > 0 ? "Safe" : "Your prompt"}
            streaming={streaming}
            jsonView={
              !streaming
                ? {
                    prompt: result.prompt,
                    category: result.category,
                    size: result.size,
                    quality: result.quality,
                    aspect_ratio: result.aspect_ratio,
                    why_it_works: result.why_it_works,
                    intent: result.intent,
                  }
                : undefined
            }
          />
        </div>
      )}

      {(result.size || result.quality || result.aspect_ratio) && !streaming && (
        <div className="flex flex-wrap gap-2">
          {result.size && <Tag label="size" value={result.size} />}
          {result.quality && <Tag label="quality" value={result.quality} />}
          {result.aspect_ratio && <Tag label="aspect" value={result.aspect_ratio} />}
        </div>
      )}

      {!streaming && result.prompt && (
        <ActionRow
          promptText={result.prompt}
          onRegenerate={onRegenerate}
          referenceThumb={referenceThumb}
        />
      )}

      {/* Appended variations — labeled Stylized / Experimental */}
      {moreVariants && moreVariants.length > 0 && !streaming && (
        <div className="space-y-6 pt-2">
          {moreVariants.map((p, i) => {
            const label = i === 0 ? "Stylized" : "Experimental";
            return (
              <div key={i} className="space-y-2">
                <CodeBlock text={p} label={label} jsonView={{ variant: label, prompt: p }} />
                <ActionRow
                  promptText={p}
                  onRegenerate={onRegenerate}
                  referenceThumb={referenceThumb}
                  compact
                />
              </div>
            );
          })}
        </div>
      )}

      {!streaming && !moreVariants && (
        <button
          type="button"
          onClick={onMoreVariations}
          disabled={moreLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-body-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] border border-dashed border-[color:var(--border-default)] hover:border-[color:var(--border-strong)] transition-colors disabled:opacity-50"
        >
          {moreLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Building variations…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              More variations
            </>
          )}
        </button>
      )}

      {!streaming && result.why_it_works && (
        <WhyItWorks text={result.why_it_works} defaultOpen={false} />
      )}
      {!streaming && <NewPromptButton onClick={onNewPrompt} />}
    </div>
  );
}

function CategoryEyebrow({ category }: { category: string }) {
  return (
    <div className="text-[13px] font-medium text-[color:var(--text-tertiary)]">{category}</div>
  );
}

function WhyItWorks({ text, defaultOpen = false }: { text: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[color:var(--border-subtle)] pt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left text-body-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
      >
        <span className="eyebrow">Why this works</span>
        <ChevronDown
          className={`h-4 w-4 text-[color:var(--text-tertiary)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="mt-3 text-body-md italic leading-relaxed text-[color:var(--text-secondary)]">
          {text}
        </p>
      )}
    </div>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-default)] px-2.5 py-1 text-[13px] font-medium">
      <span className="text-[color:var(--text-tertiary)]">{label}</span>
      <span className="text-[color:var(--text-primary)]">{value}</span>
    </span>
  );
}

function ActionRow({
  promptText,
  onRegenerate,
  referenceThumb = null,
  compact = false,
}: {
  promptText?: string;
  onRegenerate: () => void;
  /** When set, the prompt depends on this reference image and Imago needs it re-attached. */
  referenceThumb?: string | null;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const handleOpenInImago = async () => {
    if (!promptText) return;
    try {
      await navigator.clipboard.writeText(promptText);
    } catch {
      toast.error("Couldn't copy automatically — copy manually before pasting");
    }
    window.open(IMAGO_URL, "_blank", "noopener,noreferrer");
  };
  const handleCopy = async () => {
    if (!promptText) return;
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {promptText && (
          <Button onClick={handleOpenInImago} size={compact ? "sm" : "default"} className="gap-2">
            <ExternalLink className="h-3.5 w-3.5" />
            {CTA.openImago}
          </Button>
        )}
        {promptText && (
          <Button
            onClick={handleCopy}
            variant="outline"
            size={compact ? "sm" : "default"}
            className="gap-2"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        )}
        {!compact && (
          <Button onClick={onRegenerate} variant="outline" size="default" className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </Button>
        )}
      </div>
      {promptText && referenceThumb && <ReferenceReattachNote thumb={referenceThumb} />}
      {promptText && (
        <p className="text-[13px] text-[color:var(--text-tertiary)]">
          <span className="hidden sm:inline">
            Opens Imago with your prompt copied. Paste with{" "}
            <kbd className="px-1 py-0.5 rounded bg-[color:var(--bg-subtle)] border border-[color:var(--border-subtle)] font-mono text-[10px]">
              {navigator.platform?.toUpperCase().includes("MAC") ? "⌘V" : "Ctrl+V"}
            </kbd>
          </span>
          <span className="sm:hidden">
            Opens Imago with your prompt copied. Long-press the text field and tap Paste.
          </span>
        </p>
      )}
    </div>
  );
}

function NewPromptButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="pt-6 border-t border-[color:var(--border-subtle)]">
      <Button onClick={onClick} variant="ghost" className="gap-2">
        <Plus className="h-4 w-4" />
        {CTA.newPrompt}
      </Button>
    </div>
  );
}
