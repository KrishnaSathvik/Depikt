import React from "react";
import { Copy, Check } from "lucide-react";
import { PromptSurface } from "@/components/PromptSurface";

// Lightweight markdown renderer tailored to the blog content.
// Supports: H2/H3, paragraphs, bold, italic, inline code, links,
// fenced code blocks, unordered/ordered lists, blockquotes, tables, hr,
// and standalone images: ![alt](src "caption") renders a <figure>.

interface RenderedContent {
  nodes: React.ReactNode;
  headings: { id: string; text: string; level: 2 | 3 }[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Prompt / code example. Light surface: prompts are reading material, not
 * terminal output. The fence info string becomes the label (```before,
 * ```after, ```prompt); a bare fence reads as "Prompt".
 */
function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="my-10">
      <PromptSurface
        label={label || "Prompt"}
        actions={
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)]"
            aria-label="Copy prompt"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        }
      >
        {code}
      </PromptSurface>
    </div>
  );
}

// Inline parser: bold, italic, inline code, links
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded-md border border-[color:var(--code-border)] bg-[color:var(--code-bg)] px-1.5 py-0.5 font-mono text-[0.84em] text-[color:var(--code-text)]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-[color:var(--text-primary)]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("[")) {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (m) {
        nodes.push(
          <a
            key={key}
            href={m[2]}
            className="text-[color:var(--text-primary)] underline underline-offset-[3px] decoration-[color:var(--border-default)] hover:decoration-[color:var(--accent-orange)]"
          >
            {m[1]}
          </a>,
        );
      }
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

export function renderMarkdown(md: string): RenderedContent {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: React.ReactNode[] = [];
  const headings: { id: string; text: string; level: 2 | 3 }[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Standalone image line → figure (caption from the optional title)
    const img = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/.exec(line);
    if (img) {
      const [, alt, src, caption] = img;
      out.push(
        <figure key={`fig-${key++}`} className="!my-12">
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="!rounded-[18px] shadow-[0_24px_50px_-36px_rgba(17,17,17,0.35)]"
          />
          {caption && (
            <figcaption className="!mt-3 text-center">
              {renderInline(caption, `cap-${key}`)}
            </figcaption>
          )}
        </figure>,
      );
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      const info = line.slice(3).trim();
      const fenceLabel = info ? info.charAt(0).toUpperCase() + info.slice(1) : undefined;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      out.push(<CodeBlock key={`code-${key++}`} code={codeLines.join("\n")} label={fenceLabel} />);
      continue;
    }

    if (line.startsWith("## ")) {
      const text = line.slice(3).trim();
      const id = slugify(text);
      headings.push({ id, text, level: 2 });
      out.push(
        <h2
          key={`h-${key++}`}
          id={id}
          className="mb-5 mt-16 text-balance text-[30px] font-semibold leading-[1.15] tracking-[-0.025em] text-[color:var(--text-primary)] first:mt-0"
        >
          {text}
        </h2>,
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      const text = line.slice(4).trim();
      const id = slugify(text);
      headings.push({ id, text, level: 3 });
      out.push(
        <h3
          key={`h-${key++}`}
          id={id}
          className="mb-3 mt-10 text-[22px] font-semibold leading-snug tracking-[-0.015em] text-[color:var(--text-primary)]"
        >
          {text}
        </h3>,
      );
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      out.push(
        <hr
          key={`hr-${key++}`}
          className="mx-auto my-14 h-px w-24 border-0 bg-[color:var(--border-default)]"
        />,
      );
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      out.push(
        <blockquote
          key={`q-${key++}`}
          className="relative my-10 overflow-hidden rounded-[18px] border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] py-5 pl-7 pr-6 text-[18px] leading-[1.6] text-[color:var(--text-primary)] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[image:var(--brand-gradient)]"
        >
          {renderInline(quoteLines.join(" "), `q-${key}`)}
        </blockquote>,
      );
      continue;
    }

    if (
      line.startsWith("|") &&
      i + 1 < lines.length &&
      /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())
    ) {
      const headerCells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(
          lines[i]
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim()),
        );
        i++;
      }
      out.push(
        <div
          key={`tbl-${key++}`}
          className="my-10 overflow-x-auto rounded-[16px] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)]"
        >
          <table className="w-full text-body-sm">
            <thead className="bg-[color:var(--bg-subtle)]">
              <tr>
                {headerCells.map((c, idx) => (
                  <th
                    key={idx}
                    className="px-4 py-3 text-left text-[12px] font-medium uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
                  >
                    {renderInline(c, `th-${idx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-t border-[color:var(--border-subtle)]">
                  {row.map((c, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-4 py-3 align-top text-[color:var(--text-secondary)]"
                    >
                      {renderInline(c, `td-${rIdx}-${cIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*] /, ""));
        i++;
      }
      out.push(
        <ul key={`ul-${key++}`} className="my-6 space-y-2.5">
          {items.map((it, idx) => (
            <li
              key={idx}
              className="relative pl-6 text-[color:var(--text-secondary)] before:absolute before:left-1 before:top-[0.7em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-[image:var(--brand-gradient)]"
            >
              {renderInline(it, `li-${idx}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      out.push(
        <ol
          key={`ol-${key++}`}
          className="my-6 list-decimal space-y-2.5 pl-7 marker:text-[15px] marker:font-semibold marker:tabular-nums marker:text-[color:var(--text-primary)]"
        >
          {items.map((it, idx) => (
            <li key={idx} className="pl-2 text-[color:var(--text-secondary)]">
              {renderInline(it, `oli-${idx}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("> ") &&
      !lines[i].startsWith("![") &&
      !/^[-*] /.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !lines[i].startsWith("|")
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    out.push(
      <p key={`p-${key++}`} className="my-6">
        {renderInline(paraLines.join(" "), `p-${key}`)}
      </p>,
    );
  }

  return { nodes: out, headings };
}
