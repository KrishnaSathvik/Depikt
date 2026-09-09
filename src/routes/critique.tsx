import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  ScanSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PromptSurface } from "@/components/PromptSurface";
import { toast } from "sonner";
import { addHistoryEntry, getHistoryById } from "@/lib/history-db";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { readSSEStream } from "@/lib/sse";
import {
  ReferenceImagePicker,
  fileToReferenceState,
  MAX_UPLOAD_BYTES,
  type ReferenceImageState,
} from "@/components/ReferenceImagePicker";
import { CTA, IMAGO_URL, JSONLD_DESCRIPTIONS, JSONLD_NAMES, SEO, TOOL } from "@/lib/product";
import { ReferenceReattachNote } from "@/components/ReferenceReattachNote";

// Route URL stays /critique (compatibility + SEO); the visible tool is the Prompt Critic.
const CRITIQUE_URL = absoluteUrl("/critique");
const CRITIQUE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: JSONLD_NAMES.critic,
  url: CRITIQUE_URL,
  applicationCategory: "DesignApplication",
  operatingSystem: "Any",
  description: JSONLD_DESCRIPTIONS.critic,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

interface CritiqueSearch {
  restore?: string;
}

export const Route = createFileRoute("/critique")({
  validateSearch: (search: Record<string, unknown>): CritiqueSearch => {
    const restore = search.restore;
    return { restore: typeof restore === "string" && restore.length > 0 ? restore : undefined };
  },
  head: () => {
    const CRITIQUE_OG_IMAGE = getOgImageForPath();
    return {
      meta: [
        { title: SEO.critic.title },
        { name: "description", content: SEO.critic.description },
        { property: "og:title", content: SEO.critic.title },
        { property: "og:description", content: SEO.critic.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: CRITIQUE_URL },
        { property: "og:image", content: CRITIQUE_OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: SEO.critic.title },
        { name: "twitter:description", content: SEO.critic.description },
        { name: "twitter:image", content: CRITIQUE_OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: CRITIQUE_URL }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(CRITIQUE_JSONLD) }],
    };
  },
  component: CritiquePage,
});

interface CritiqueDimension {
  id: string;
  applicable: boolean;
  score: number | null;
  reason: string;
}

interface CritiqueResult {
  /** v3 */
  overall_score?: number | null;
  weighted_mean?: number | null;
  score_cap?: { dimension: string; score: number; cap: number } | null;
  summary?: string;
  dimensions?: CritiqueDimension[];
  /** v2.9 and v3 alias */
  score?: number | null;
  weaknesses?: string[];
  improvements?: string[];
  category?: string;
  rewritten_prompt?: string;
  prompt_version?: string;
}

const DIMENSION_LABELS: Record<string, string> = {
  intent_fidelity: "Intent fidelity",
  clarity: "Clarity",
  contradictions: "Contradictions",
  composition_control: "Composition control",
  reference_handling: "Reference handling",
  edit_preservation: "Edit preservation",
  text_layout: "Text & layout",
  style_coherence: "Style coherence",
  factual_integrity: "Factual integrity",
  efficiency: "Efficiency",
};

function CritiquePage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CritiqueResult | null>(null);
  const [savedInput, setSavedInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [reference, setReference] = useState<ReferenceImageState | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { restore } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!restore) {
      textareaRef.current?.focus();
      return;
    }
    (async () => {
      const entry = await getHistoryById(restore);
      if (entry && entry.kind === "critique") {
        setInput(entry.roughIdea);
        setSavedInput(entry.roughIdea);
        setResult(entry.result as CritiqueResult);
        setCollapsed(true);
        if (entry.referenceImage) {
          setReference({
            dataUrl: entry.referenceImage,
            file: null,
            intent: (entry.referenceIntent as ReferenceImageState["intent"]) ?? "auto",
          });
        }
      }
      navigate({ to: "/critique", search: {}, replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restore]);

  const getEndpoint = (path: string) => {
    if (typeof window === "undefined") return path;
    const host = window.location.hostname;
    const m = host.match(/^id-preview--([0-9a-f-]+)\.lovable\.app$/i);
    if (m) return `https://project--${m[1]}-dev.lovable.app${path}`;
    return path;
  };

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

  const score = async () => {
    const text = input.trim();
    if (!text) {
      toast.error("Paste a prompt to critique");
      return;
    }
    setLoading(true);
    setResult(null);
    setSavedInput(text);
    setCollapsed(true);

    try {
      const res = await fetch(getEndpoint("/api/public/critique-prompt"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          prompt: text,
          referenceImageUrl: reference?.dataUrl || undefined,
          referenceIntent: reference?.intent || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        let msg = "Couldn't critique the prompt";
        try {
          const data = await res.json();
          msg = data?.error || msg;
        } catch {
          /* ignore */
        }
        toast.error(msg);
        return;
      }

      // Wait for the final "done" event — we don't stream partial scores.
      const final = await readSSEStream<CritiqueResult>(res, {
        onError: (json) => {
          toast.error(typeof json.error === "string" ? json.error : "Critique failed");
        },
      });
      if (final) {
        setResult(final);
        setCollapsed(true);
        addHistoryEntry({
          kind: "critique",
          roughIdea: text,
          result: final as Record<string, unknown>,
          referenceImage: reference?.dataUrl ?? null,
          referenceIntent: reference?.intent ?? null,
        });
      } else {
        toast.error("The critique ended before a final result arrived. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      score();
    }
  };

  const handleNewCritique = () => {
    setInput("");
    setResult(null);
    setSavedInput("");
    setReference(null);
    setCollapsed(false);
    setTimeout(() => {
      textareaRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <div className="mx-auto w-full max-w-[1040px] flex-1 px-4 py-10 sm:px-6 sm:py-16">
        {collapsed && savedInput ? (
          <CollapsedInput
            text={savedInput}
            onExpand={() => {
              setCollapsed(false);
              setInput(savedInput);
              setTimeout(() => textareaRef.current?.focus(), 0);
            }}
          />
        ) : (
          <div>
            <p className="eyebrow">{TOOL.critic}</p>
            <h1 className="mt-4 text-display-md sm:text-display-lg text-[color:var(--text-primary)]">
              Find what is weakening your prompt.
            </h1>
            <p className="mt-4 text-body-lg text-[color:var(--text-secondary)] max-w-[60ch]">
              Paste any image prompt. You get a score, a breakdown of what is working and what is
              not, and a rewritten prompt. Attach the source or reference image if the prompt edits
              or references one.
            </p>

            <div className="mt-8">
              <label htmlFor="critique-input" className="sr-only">
                Prompt to critique
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
                  id="critique-input"
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
                  placeholder="Paste a prompt to critique…"
                  className="min-h-[240px] resize-y text-[16px] leading-[1.65] px-5 py-4 font-mono"
                />
              </div>

              <div className="mt-3">
                {imageLoading ? (
                  <div className="flex items-center gap-2 text-mono-sm text-[color:var(--text-tertiary)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Processing image…
                  </div>
                ) : (
                  <ReferenceImagePicker
                    value={reference}
                    onChange={setReference}
                    addLabel="Add source / reference image (optional)"
                  />
                )}
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Button onClick={score} disabled={loading} size="lg" className="gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {CTA.critiquing}
                    </>
                  ) : (
                    <>
                      <ScanSearch className="h-4 w-4" />
                      {CTA.critique}
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

        {(loading || result) && (
          <div className="mt-10 border-t border-[color:var(--text-primary)] pt-8">
            {loading && !result && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] p-6"
              >
                <div className="flex items-center gap-2.5 text-mono-sm text-[color:var(--text-secondary)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Critiquing your prompt…
                </div>
              </div>
            )}
            {result && (
              <CritiqueView
                result={result}
                referenceThumb={reference?.dataUrl ?? null}
                onNew={handleNewCritique}
              />
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
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
          Prompt
        </span>
        <span className="text-body-sm text-[color:var(--text-secondary)] truncate flex-1">
          {text}
        </span>
        <ChevronRight className="h-4 w-4 text-[color:var(--text-tertiary)] group-hover:text-[color:var(--text-primary)] shrink-0 transition-colors" />
      </div>
    </button>
  );
}

function scoreColor(score: number | null): string {
  if (score === null) return "var(--text-primary)";
  if (score >= 8) return "var(--success)";
  if (score >= 5) return "var(--text-primary)";
  return "var(--error)";
}

function CritiqueView({
  result,
  referenceThumb,
  onNew,
}: {
  result: CritiqueResult;
  /** The attached source/reference image, when the critique used one. */
  referenceThumb: string | null;
  onNew: () => void;
}) {
  const [view, setView] = useState<"text" | "json">("text");
  const [rewrittenCopied, setRewrittenCopied] = useState(false);
  const [dimsOpen, setDimsOpen] = useState(true);
  const overall =
    typeof result.overall_score === "number"
      ? result.overall_score
      : typeof result.score === "number"
        ? result.score
        : null;
  const dimensions = Array.isArray(result.dimensions) ? result.dimensions : [];
  const applicable = dimensions.filter((d) => d.applicable && typeof d.score === "number");
  const skipped = dimensions.filter((d) => !d.applicable || typeof d.score !== "number");

  const handleCopyRewritten = async () => {
    if (!result.rewritten_prompt) return;
    await navigator.clipboard.writeText(result.rewritten_prompt);
    setRewrittenCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setRewrittenCopied(false), 2000);
  };

  const handleOpenInImago = async () => {
    if (!result.rewritten_prompt) return;
    try {
      await navigator.clipboard.writeText(result.rewritten_prompt);
    } catch {
      toast.error("Couldn't copy automatically — copy manually before pasting");
    }
    window.open(IMAGO_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      {result.category && (
        <div className="text-[13px] font-medium text-[color:var(--text-tertiary)]">
          {result.category}
        </div>
      )}

      <div>
        <div className="flex justify-end mb-4">
          <div
            role="tablist"
            aria-label="Critique view"
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
                {v === "text" ? "Report" : "JSON"}
              </button>
            ))}
          </div>
        </div>

        {view === "json" ? (
          <PromptSurface label="Critique JSON">{JSON.stringify(result, null, 2)}</PromptSurface>
        ) : (
          <>
            <div className="grid gap-6 border-b border-[color:var(--border-subtle)] pb-8 mb-8 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-10">
              <div>
                <span className="eyebrow">Overall score</span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span
                    className="text-display-xl tabular-nums leading-none"
                    style={{ color: scoreColor(overall) }}
                  >
                    {overall === null
                      ? "—"
                      : Number.isInteger(overall)
                        ? overall
                        : overall.toFixed(1)}
                  </span>
                  <span className="text-heading-md text-[color:var(--text-tertiary)]">/10</span>
                </div>
              </div>
              {result.summary && (
                <p className="text-body-lg text-[color:var(--text-primary)] max-w-[52ch]">
                  {result.summary}
                </p>
              )}
            </div>

            {result.score_cap && (
              <p
                className="mb-3 text-[13px] text-[color:var(--text-tertiary)]"
                title={
                  typeof result.weighted_mean === "number"
                    ? `Weighted mean before the cap: ${result.weighted_mean}`
                    : undefined
                }
              >
                Capped at {result.score_cap.cap} because{" "}
                {DIMENSION_LABELS[result.score_cap.dimension] ?? result.score_cap.dimension} scored{" "}
                {result.score_cap.score}/10.
              </p>
            )}
            {dimensions.length > 0 && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setDimsOpen((o) => !o)}
                  className="w-full flex items-center justify-between gap-2 text-left mb-3"
                >
                  <h2 className="text-heading-sm">Breakdown</h2>
                  <ChevronDown
                    className={`h-4 w-4 text-[color:var(--text-tertiary)] transition-transform ${dimsOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {dimsOpen && (
                  <ul className="border-t border-[color:var(--border-subtle)]">
                    {applicable.map((d) => (
                      <li
                        key={d.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1 items-start border-b border-[color:var(--border-subtle)] py-4"
                      >
                        <div className="min-w-0">
                          <div className="text-body-md font-medium text-[color:var(--text-primary)]">
                            {DIMENSION_LABELS[d.id] ?? d.id}
                          </div>
                          <div className="mt-1 text-body-sm text-[color:var(--text-secondary)]">
                            {d.reason}
                          </div>
                        </div>
                        <div className="flex w-[104px] shrink-0 flex-col items-end gap-2 pt-1">
                          <span
                            className="font-mono text-[13px] tabular-nums"
                            style={{ color: scoreColor(d.score) }}
                          >
                            {d.score}/10
                          </span>
                          <span
                            className="h-1 w-full overflow-hidden rounded-full bg-[color:var(--bg-subtle)]"
                            aria-hidden
                          >
                            <span
                              className="block h-full rounded-full"
                              style={{
                                width: `${Math.max(0, Math.min(10, d.score ?? 0)) * 10}%`,
                                background: scoreColor(d.score),
                              }}
                            />
                          </span>
                        </div>
                      </li>
                    ))}
                    {skipped.length > 0 && (
                      <li className="pt-3 text-[13px] text-[color:var(--text-tertiary)]">
                        Not applicable:{" "}
                        {skipped.map((d) => DIMENSION_LABELS[d.id] ?? d.id).join(", ")}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}

            {((result.weaknesses && result.weaknesses.length > 0) ||
              (result.improvements && result.improvements.length > 0)) && (
              <div className="grid gap-8 md:grid-cols-2 md:gap-12">
                {result.weaknesses && result.weaknesses.length > 0 && (
                  <div>
                    <h2 className="text-heading-sm mb-4">Weaknesses</h2>
                    <ol className="space-y-3 text-body-md text-[color:var(--text-secondary)]">
                      {result.weaknesses.map((w, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="mt-1 shrink-0 font-mono text-[12px] tabular-nums text-[color:var(--text-tertiary)]">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {result.improvements && result.improvements.length > 0 && (
                  <div>
                    <h2 className="text-heading-sm mb-4">Improvements</h2>
                    <ol className="space-y-3 text-body-md text-[color:var(--text-secondary)]">
                      {result.improvements.map((w, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="mt-1 shrink-0 font-mono text-[12px] tabular-nums text-[color:var(--text-tertiary)]">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {result.rewritten_prompt && (
        <div className="border-t border-[color:var(--border-subtle)] pt-8">
          <h2 className="text-heading-md">Rewritten prompt</h2>
          <div className="mt-4">
            <PromptSurface
              label="Rewritten prompt"
              actions={
                <button
                  type="button"
                  onClick={handleCopyRewritten}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)]"
                  aria-label="Copy rewritten prompt"
                >
                  {rewrittenCopied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {rewrittenCopied ? "Copied" : "Copy"}
                </button>
              }
            >
              {result.rewritten_prompt}
            </PromptSurface>
          </div>
          <div className="mt-4 space-y-2">
            <Button onClick={handleOpenInImago} size="sm" className="gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              {CTA.openImago}
            </Button>
            {referenceThumb && <ReferenceReattachNote thumb={referenceThumb} />}
            <p className="text-[13px] text-[color:var(--text-tertiary)]">
              Opens Imago with your prompt copied. Paste with{" "}
              <kbd className="px-1 py-0.5 rounded bg-[color:var(--bg-subtle)] border border-[color:var(--border-subtle)] font-mono text-[10px]">
                {navigator.platform?.toUpperCase().includes("MAC") ? "⌘V" : "Ctrl+V"}
              </kbd>
            </p>
          </div>
        </div>
      )}

      <div className="pt-6 border-t border-[color:var(--border-subtle)]">
        <Button onClick={onNew} variant="ghost" className="gap-2">
          <Plus className="h-4 w-4" />
          {CTA.critiqueAnother}
        </Button>
      </div>
    </div>
  );
}
