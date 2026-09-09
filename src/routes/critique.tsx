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

const CRITIQUE_URL = absoluteUrl("/critique");
const CRITIQUE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Depikt Prompt Critique",
  url: CRITIQUE_URL,
  applicationCategory: "DesignApplication",
  operatingSystem: "Any",
  description:
    "Paste an AI image prompt and get a score, weaknesses, concrete improvements, and a rewritten prompt.",
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
        { title: "Critique a Prompt — Depikt" },
        {
          name: "description",
          content:
            "Paste a prompt. Get a score, weaknesses, concrete improvements, and a rewritten prompt.",
        },
        { property: "og:title", content: "Critique a Prompt — Depikt" },
        {
          property: "og:description",
          content:
            "Paste a prompt. Get a score, weaknesses, concrete improvements, and a rewritten prompt.",
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: CRITIQUE_URL },
        { property: "og:image", content: CRITIQUE_OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Critique a Prompt — Depikt" },
        {
          name: "twitter:description",
          content:
            "Paste a prompt. Get a score, weaknesses, concrete improvements, and a rewritten prompt.",
        },
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
      toast.error("Paste a prompt to score");
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
        let msg = "Failed to score";
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
          toast.error(typeof json.error === "string" ? json.error : "Score failed");
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
        toast.error("Scoring ended before a final result arrived. Please try again.");
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
    <div className="min-h-screen bg-[color:var(--bg)]">
      <Header />
      <div className="mx-auto max-w-[960px] px-6 py-12 sm:py-16">
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
            <h1 className="text-display-md sm:text-display-lg tracking-tight text-[color:var(--text-primary)]">
              Score an existing prompt
            </h1>
            <p className="mt-3 text-body-md text-[color:var(--text-secondary)]">
              Paste any image prompt. Get a score from 1–10, a breakdown by dimension, ranked
              weaknesses, and concrete fixes. Attach the source or reference image if the prompt
              edits or references one.
            </p>

            <div className="mt-8">
              <label htmlFor="critique-input" className="sr-only">
                Prompt to score
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
                  placeholder="Paste a prompt to score it…"
                  className="min-h-[240px] resize-y bg-[color:var(--bg-elevated)] border-[color:var(--border-default)] text-[15px] font-mono leading-[1.65] focus-visible:border-[color:var(--accent)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/15 px-5 py-4"
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
                      Scoring…
                    </>
                  ) : (
                    <>
                      <ScanSearch className="h-4 w-4" />
                      Score prompt
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
          <div className="mt-10 pt-10 border-t border-[color:var(--border-subtle)]">
            {loading && !result && (
              <div className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--code-bg)] p-6">
                <div className="flex items-center gap-2.5 text-mono-sm text-[color:var(--text-secondary)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scoring your prompt…
                </div>
              </div>
            )}
            {result && <CritiqueView result={result} onNew={handleNewCritique} />}
          </div>
        )}
      </div>
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
        <span className="font-mono text-[10px] tracking-[0.08em] uppercase font-semibold text-[color:var(--text-tertiary)] shrink-0">
          PROMPT
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

function CritiqueView({ result, onNew }: { result: CritiqueResult; onNew: () => void }) {
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
    window.open(
      "https://chatgpt.com/g/g-69e7de729cb48191a6aa83ec3af8a6cb-imago",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="space-y-6">
      {result.category && (
        <div className="font-mono text-[11px] tracking-[0.12em] uppercase font-semibold text-[color:var(--text-tertiary)]">
          {result.category}
        </div>
      )}

      <div className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-6">
        <div className="flex justify-end mb-4">
          <div className="flex items-center rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg)] p-0.5">
            <button
              type="button"
              onClick={() => setView("text")}
              aria-pressed={view === "text"}
              className={`inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-mono transition-colors ${
                view === "text"
                  ? "bg-[color:var(--bg-subtle)] text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
              }`}
            >
              <FileText className="h-3 w-3" /> Text
            </button>
            <button
              type="button"
              onClick={() => setView("json")}
              aria-pressed={view === "json"}
              className={`inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-mono transition-colors ${
                view === "json"
                  ? "bg-[color:var(--bg-subtle)] text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
              }`}
            >
              <Code2 className="h-3 w-3" /> JSON
            </button>
          </div>
        </div>

        {view === "json" ? (
          <pre className="text-[13px] font-mono leading-[1.7] whitespace-pre-wrap overflow-x-auto text-[color:var(--text-primary)]">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="eyebrow">Score</span>
              <span className="text-display-md tabular-nums" style={{ color: scoreColor(overall) }}>
                {overall === null ? "—" : Number.isInteger(overall) ? overall : overall.toFixed(1)}
                <span className="text-[color:var(--text-tertiary)]">/10</span>
              </span>
            </div>

            {result.summary && (
              <p className="mb-6 text-body-md text-[color:var(--text-secondary)]">
                {result.summary}
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
                  <ul className="space-y-2">
                    {applicable.map((d) => (
                      <li
                        key={d.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 items-start"
                      >
                        <div>
                          <div className="text-body-sm font-medium text-[color:var(--text-primary)]">
                            {DIMENSION_LABELS[d.id] ?? d.id}
                          </div>
                          <div className="text-body-sm text-[color:var(--text-secondary)]">
                            {d.reason}
                          </div>
                        </div>
                        <div
                          className="font-mono text-[13px] tabular-nums"
                          style={{ color: scoreColor(d.score) }}
                        >
                          {d.score}/10
                        </div>
                      </li>
                    ))}
                    {skipped.length > 0 && (
                      <li className="pt-2 text-[11px] font-mono text-[color:var(--text-tertiary)]">
                        Not applicable:{" "}
                        {skipped.map((d) => DIMENSION_LABELS[d.id] ?? d.id).join(", ")}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}

            {result.weaknesses && result.weaknesses.length > 0 && (
              <div className="mb-6">
                <h2 className="text-heading-sm mb-3">Weaknesses</h2>
                <ul className="space-y-2 text-body-sm text-[color:var(--text-secondary)]">
                  {result.weaknesses.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[color:var(--error)] mt-0.5">·</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.improvements && result.improvements.length > 0 && (
              <div>
                <h2 className="text-heading-sm mb-3">Improvements</h2>
                <ul className="space-y-2 text-body-sm text-[color:var(--text-secondary)]">
                  {result.improvements.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[color:var(--success)] mt-0.5">→</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {result.rewritten_prompt && (
        <div className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading-sm">Rewritten prompt</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyRewritten}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[color:var(--bg)] hover:bg-[color:var(--bg-subtle)] border border-[color:var(--border-default)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
                aria-label="Copy rewritten prompt"
              >
                {rewrittenCopied ? (
                  <Check className="h-4 w-4 text-[color:var(--success)]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <pre className="rounded-md bg-[color:var(--code-bg)] border border-[color:var(--code-border)] px-5 py-4 text-[13px] font-mono leading-[1.7] whitespace-pre-wrap overflow-x-auto text-[color:var(--code-text)]">
            {result.rewritten_prompt}
          </pre>
          <div className="mt-4">
            <Button onClick={handleOpenInImago} size="sm" className="gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Imago
            </Button>
            <p className="mt-1.5 text-[11px] text-[color:var(--text-tertiary)]">
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
          Score another prompt
        </Button>
      </div>
    </div>
  );
}
