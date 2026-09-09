import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { JSONLD_NAMES, MCP, SEO, TOOL } from "@/lib/product";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";

const PAGE_URL = absoluteUrl(MCP.pagePath);
const ENDPOINT_URL = absoluteUrl(MCP.endpointPath);

export const Route = createFileRoute("/integrations/mcp")({
  head: () => {
    const ogImage = getOgImageForPath("mcp");
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
      meta: [
        { title: SEO.mcp.title },
        { name: "description", content: SEO.mcp.description },
        { property: "og:title", content: SEO.mcp.title },
        { property: "og:description", content: SEO.mcp.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: PAGE_URL },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: SEO.mcp.title },
        { name: "twitter:description", content: SEO.mcp.description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: PAGE_URL }],
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
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function McpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-12 sm:px-6 lg:px-12 lg:py-16">
        <header className="max-w-[62ch]">
          <p className="eyebrow">{MCP.eyebrow}</p>
          <h1 className="mt-4 text-display-lg text-[color:var(--text-primary)]">
            Depikt, now available through MCP
          </h1>
          <p className="mt-4 text-body-lg text-[color:var(--text-secondary)]">
            Let your AI assistant search and use Depikt’s public library of prompts, templates, and
            guides while you work. ChatGPT, Claude, and other MCP-compatible assistants can connect
            in a minute.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <a href="#connect">
                {MCP.connect} <ArrowRight />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/blog/$slug" params={{ slug: MCP.postSlug }}>
                Read the announcement
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-body-sm font-medium text-[color:var(--text-tertiary)]">
            {MCP.meta}
          </p>
        </header>

        {/* What it can access */}
        <section className="mt-20 border-t border-[color:var(--border-subtle)] pt-12">
          <p className="eyebrow">What it can access</p>
          <div className="mt-8 grid gap-px border border-[color:var(--border-subtle)] bg-[color:var(--border-subtle)] sm:grid-cols-2">
            {MCP.capabilities.map((c) => (
              <div key={c.tool} className="bg-[color:var(--bg-elevated)] p-6">
                <span className="label-mono text-[color:var(--text-tertiary)]">{c.tool}</span>
                <h2 className="mt-3 text-heading-sm text-[color:var(--text-primary)]">{c.title}</h2>
                <p className="mt-2 text-body-sm text-[color:var(--text-secondary)]">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Example */}
        <section className="mt-20 border-t border-[color:var(--border-subtle)] pt-12">
          <p className="eyebrow">Example</p>
          <div className="mt-8 max-w-[62ch] border-l-2 border-[color:var(--text-primary)] pl-5">
            <p className="text-body-lg text-[color:var(--text-primary)]">
              <span className="font-medium">You:</span> Find me a prompt for a vintage national park
              poster and explain why it works.
            </p>
            <p className="mt-4 text-body-md text-[color:var(--text-secondary)]">
              <span className="font-medium text-[color:var(--text-primary)]">Assistant:</span>{" "}
              searches Depikt, retrieves the relevant entries, and answers using the complete prompt
              and its “why it works” note.
            </p>
          </div>
          <p className="mt-8 text-body-sm font-medium text-[color:var(--text-tertiary)]">
            More things to ask
          </p>
          <ul className="mt-3 max-w-[62ch] space-y-2">
            {EXAMPLES.map((e) => (
              <li key={e} className="text-body-md text-[color:var(--text-secondary)]">
                “{e}”
              </li>
            ))}
          </ul>
        </section>

        {/* Safe by design */}
        <section className="mt-20 border-t border-[color:var(--border-subtle)] pt-12">
          <p className="eyebrow">Safe by design</p>
          <p className="mt-6 max-w-[62ch] text-body-lg text-[color:var(--text-primary)]">
            {MCP.safety}
          </p>
          <div className="mt-8 grid gap-10 sm:grid-cols-2">
            <div>
              <p className="text-body-sm font-medium text-[color:var(--text-tertiary)]">
                Assistants can
              </p>
              <ul className="mt-3 space-y-2">
                {MCP.capabilities.map((c) => (
                  <li key={c.tool} className="text-body-md text-[color:var(--text-secondary)]">
                    {c.title.replace(/^[A-Z]/, (m) => m.toLowerCase())}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-body-sm font-medium text-[color:var(--text-tertiary)]">
                Assistants cannot
              </p>
              <ul className="mt-3 space-y-2">
                {MCP.cannot.map((c) => (
                  <li key={c} className="text-body-md text-[color:var(--text-secondary)]">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Connect */}
        <section id="connect" className="mt-20 border-t border-[color:var(--border-subtle)] pt-12">
          <p className="eyebrow">Connect Depikt</p>
          <h2 className="mt-4 max-w-[24ch] text-display-md text-[color:var(--text-primary)]">
            One URL. No sign-in.
          </h2>
          <p className="mt-4 max-w-[62ch] text-body-md text-[color:var(--text-secondary)]">
            Add Depikt as a remote MCP server in any compatible client. The endpoint is public and
            unauthenticated; it serves the same approved content you see on this site.
          </p>

          <div className="mt-8 max-w-[62ch]">
            <div className="flex items-center justify-between border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[color:var(--text-tertiary)]">
                  MCP endpoint
                </p>
                <code className="mt-1 block truncate font-mono text-[15px] text-[color:var(--text-primary)]">
                  {ENDPOINT_URL}
                </code>
              </div>
              <CopyButton text={ENDPOINT_URL} label="Copy MCP endpoint" />
            </div>

            <div className="mt-4 border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)]">
              <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] px-4 py-2.5">
                <p className="text-[13px] font-medium text-[color:var(--text-tertiary)]">
                  Client configuration
                </p>
                <CopyButton text={CONFIG_SNIPPET} label="Copy client configuration" />
              </div>
              <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-6 text-[color:var(--text-primary)]">
                {CONFIG_SNIPPET}
              </pre>
            </div>

            <ol className="mt-8 space-y-4 text-body-md text-[color:var(--text-secondary)]">
              <li>
                <span className="font-medium text-[color:var(--text-primary)]">Claude:</span> in
                Claude Code run{" "}
                <code className="font-mono text-[13px]">
                  claude mcp add --transport http depikt {ENDPOINT_URL}
                </code>
                , or add the configuration above in Claude Desktop under Settings → Developer.
              </li>
              <li>
                <span className="font-medium text-[color:var(--text-primary)]">ChatGPT:</span> add a
                custom connector in Settings → Connectors and paste the endpoint URL.
              </li>
              <li>
                <span className="font-medium text-[color:var(--text-primary)]">Other clients:</span>{" "}
                any client that supports remote MCP servers over HTTP can use the same URL.
              </li>
            </ol>
          </div>
        </section>

        <aside className="mt-20 border-t border-[color:var(--text-primary)] pt-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-heading-md">Prefer to browse?</h3>
              <p className="mt-2 max-w-[48ch] text-body-md text-[color:var(--text-secondary)]">
                Everything the integration can read is here on the site, with images.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="outline">
                <Link to="/library">{TOOL.library}</Link>
              </Button>
              <Button asChild size="lg">
                <Link to="/generate">
                  {TOOL.builder} <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </aside>
      </main>
      <Footer />
    </div>
  );
}
