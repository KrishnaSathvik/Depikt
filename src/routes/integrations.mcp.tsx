import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  FileSearch,
  FileText,
  LayoutTemplate,
  Search,
  ShieldCheck,
  SquareLibrary,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/PageHero";
import { cn } from "@/lib/utils";
import { JSONLD_NAMES, MCP, SEO, TOOL } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { pageSeoHead } from "@/lib/seo";

const PAGE_URL = absoluteUrl(MCP.pagePath);
const ENDPOINT_URL = absoluteUrl(MCP.endpointPath);

export const Route = createFileRoute("/integrations/mcp")({
  head: () => {
    const { meta, links } = pageSeoHead(SEO.mcp, {
      url: PAGE_URL,
      image: getOgImageForPath("mcp"),
    });
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Depikt for AI assistants",
      url: PAGE_URL,
      description: SEO.mcp.description,
      isPartOf: { "@type": "WebSite", name: JSONLD_NAMES.site, url: absoluteUrl("/") },
      about: {
        "@type": "SoftwareApplication",
        name: JSONLD_NAMES.site,
        applicationCategory: "DesignApplication",
        operatingSystem: "Any",
      },
    };
    return {
      meta,
      links,
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
  component: McpPage,
});

const EXAMPLES = [
  "Find me three Depikt prompts for a vintage travel poster.",
  "Open the best product-photography prompt and adapt it for a skincare bottle.",
  "What does Depikt recommend for precise reference-image edits?",
  "Show me the available prompt templates for infographics.",
];

/** Claude Code / Claude Desktop-style server entry; other clients take the same URL. */
const CONFIG_SNIPPET = `{
  "mcpServers": {
    "depikt": {
      "url": "${ENDPOINT_URL}"
    }
  }
}`;

const TOOL_ICONS: Record<string, LucideIcon> = {
  search_prompts: Search,
  get_prompt: FileText,
  list_templates: LayoutTemplate,
  get_template: SquareLibrary,
  search_guides: FileSearch,
  get_guide: BookOpen,
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-4 text-[13px] font-medium text-[color:var(--text-primary)] transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-subtle)] sm:min-h-9"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function SectionHead({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: string }) {
  return (
    <div className="max-w-[62ch]">
      <p className="badge-eyebrow">{eyebrow}</p>
      <h2 className="mt-4 text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[color:var(--text-primary)] sm:text-[38px]">
        {title}
      </h2>
      {lede && <p className="mt-3 text-body-md text-[color:var(--text-secondary)]">{lede}</p>}
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--text-primary)] text-[14px] font-semibold tabular-nums text-[color:var(--bg)]">
      {n}
    </span>
  );
}

const CLIENTS: ReadonlyArray<{ name: string; body: ReactNode }> = [
  {
    name: "Claude",
    body: (
      <>
        In Claude Code run:
        <code className="my-2 block break-all rounded-xl border border-[color:var(--code-border)] bg-[color:var(--code-bg)] px-3 py-2 font-mono text-[12px] leading-relaxed text-[color:var(--text-primary)]">
          claude mcp add --transport http depikt {ENDPOINT_URL}
        </code>
        or add the configuration above in Claude Desktop under Settings → Developer.
      </>
    ),
  },
  {
    name: "ChatGPT",
    body: <>Add a custom connector in Settings → Connectors and paste the endpoint URL.</>,
  },
  {
    name: "Other clients",
    body: <>Any client that supports remote MCP servers over HTTP can use the same URL.</>,
  },
];

function McpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-20 pt-12 sm:px-6 lg:pb-28 lg:pt-20">
        <PageHero
          eyebrow={MCP.eyebrow}
          title="Depikt, now available"
          accent="through MCP"
          lede="Let your AI assistant search and use Depikt’s public library of prompts, templates, and guides while you work. ChatGPT, Claude, and other MCP-compatible assistants can connect in a minute."
          actions={
            <>
              <Button asChild size="lg" variant="brand">
                <a href="#connect">
                  {MCP.connect} <ArrowRight />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/blog/$slug" params={{ slug: MCP.postSlug }}>
                  Read the announcement
                </Link>
              </Button>
            </>
          }
        />

        {/* What it can access */}
        <section className="mt-24">
          <SectionHead
            eyebrow="What it can access"
            title="Search, then read."
            lede={`${MCP.capabilities.length} read-only tools, in three search-then-read pairs: prompts, templates, and guides.`}
          />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MCP.capabilities.map((c) => {
              const Icon = TOOL_ICONS[c.tool] ?? Search;
              return (
                <li key={c.tool} className="surface-card flex flex-col p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)]">
                      <Icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <code className="rounded-full border border-[color:var(--border-subtle)] px-2.5 py-0.5 font-mono text-[12px] text-[color:var(--text-tertiary)]">
                      {c.tool}
                    </code>
                  </div>
                  <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.01em] text-[color:var(--text-primary)]">
                    {c.title}
                  </h3>
                  <p className="mt-1.5 text-body-sm text-[color:var(--text-secondary)]">{c.body}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Connect */}
        <section id="connect" className="mt-24 scroll-mt-24">
          <SectionHead
            eyebrow="Connect Depikt"
            title="One URL. No sign-in."
            lede="Add Depikt as a remote MCP server in any compatible client. The endpoint is public and unauthenticated; it serves the same approved content you see on this site."
          />

          <ol className="mt-10 grid gap-5 lg:grid-cols-2">
            <li className="surface-card flex min-w-0 flex-col p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <StepNumber n={1} />
                <h3 className="text-[18px] font-semibold tracking-[-0.01em]">Copy the endpoint</h3>
              </div>
              <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] py-3 pl-4 pr-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[color:var(--text-tertiary)]">
                    MCP endpoint
                  </p>
                  <code className="mt-0.5 block truncate font-mono text-[14px] text-[color:var(--text-primary)]">
                    {ENDPOINT_URL}
                  </code>
                </div>
                <CopyButton text={ENDPOINT_URL} label="Copy MCP endpoint" />
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)]">
                <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border-subtle)] py-2 pl-4 pr-3">
                  <p className="text-[12px] font-medium text-[color:var(--text-tertiary)]">
                    Client configuration
                  </p>
                  <CopyButton text={CONFIG_SNIPPET} label="Copy client configuration" />
                </div>
                <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-6 text-[color:var(--text-primary)]">
                  {CONFIG_SNIPPET}
                </pre>
              </div>
            </li>

            <li className="surface-card flex min-w-0 flex-col p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <StepNumber n={2} />
                <h3 className="text-[18px] font-semibold tracking-[-0.01em]">
                  Add it to your assistant
                </h3>
              </div>
              <ul className="mt-6 space-y-3">
                {CLIENTS.map((c) => (
                  <li
                    key={c.name}
                    className="rounded-2xl border border-[color:var(--border-subtle)] p-4 text-body-sm text-[color:var(--text-secondary)]"
                  >
                    <p className="font-medium text-[color:var(--text-primary)]">{c.name}</p>
                    <p className="mt-1 leading-relaxed">{c.body}</p>
                  </li>
                ))}
              </ul>
            </li>
          </ol>
        </section>

        {/* Example */}
        <section className="mt-24">
          <SectionHead eyebrow="Example" title="Ask in your own words." />
          <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div
              className="surface-card relative flex flex-col justify-center overflow-hidden p-5 sm:p-7"
              style={{ backgroundImage: "var(--page-glow)" }}
            >
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-[20px] rounded-br-md bg-[color:var(--text-primary)] px-4 py-3 text-body-md text-[color:var(--bg)]">
                  <span className="sr-only">You: </span>
                  Find me a prompt for a vintage national park poster and explain why it works.
                </p>
              </div>
              <div className="mt-4 flex gap-3">
                <span
                  aria-hidden
                  className="mt-1 h-7 w-7 shrink-0 rounded-full bg-[image:var(--brand-gradient)]"
                />
                <p className="max-w-[85%] rounded-[20px] rounded-tl-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3 text-body-md text-[color:var(--text-secondary)]">
                  <span className="font-medium text-[color:var(--text-primary)]">Assistant:</span>{" "}
                  searches Depikt, retrieves the relevant entries, and answers using the complete
                  prompt and its “why it works” note.
                </p>
              </div>
            </div>
            <div className="surface-card p-5 sm:p-7">
              <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                More things to ask
              </p>
              <ul className="mt-4 space-y-2.5">
                {EXAMPLES.map((e) => (
                  <li
                    key={e}
                    className="rounded-2xl bg-[color:var(--bg-subtle)] px-4 py-3 text-body-sm text-[color:var(--text-primary)]"
                  >
                    “{e}”
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Safe by design */}
        <section className="mt-24">
          <SectionHead eyebrow="Safe by design" title="Read-only, published content only." />
          <p className="mt-4 max-w-[62ch] text-body-lg text-[color:var(--text-secondary)]">
            {MCP.safety}
          </p>
          <div className="mt-10 max-w-[620px]">
            <SafetyList title="Assistants cannot" items={[...MCP.cannot]} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function SafetyList({
  title,
  items,
  positive = false,
}: {
  title: string;
  items: ReadonlyArray<string>;
  positive?: boolean;
}) {
  const Icon = positive ? Check : X;
  return (
    <div className="surface-card p-6 sm:p-7">
      <div className="flex items-center gap-2">
        {positive ? (
          <ShieldCheck aria-hidden className="h-5 w-5" strokeWidth={1.75} />
        ) : (
          <X aria-hidden className="h-5 w-5 text-[color:var(--text-tertiary)]" strokeWidth={1.75} />
        )}
        <p className="text-body-md font-medium text-[color:var(--text-primary)]">{title}</p>
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((it) => (
          <li
            key={it}
            className="flex items-start gap-3 text-body-md text-[color:var(--text-secondary)]"
          >
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                positive
                  ? "bg-[color:var(--text-primary)] text-[color:var(--bg)]"
                  : "bg-[color:var(--bg-subtle)] text-[color:var(--text-tertiary)]",
              )}
            >
              <Icon aria-hidden className="h-3 w-3" strokeWidth={2.5} />
            </span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
