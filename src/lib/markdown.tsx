import React from "react";
import { Copy, Check } from "lucide-react";

// Lightweight markdown renderer tailored to the blog content.
// Supports: H2/H3, paragraphs, bold, italic, inline code, links,
// fenced code blocks, unordered/ordered lists, blockquotes, tables, hr.

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

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="group relative my-8">
      <pre className="overflow-x-auto rounded-lg border border-[color:var(--code-border)] bg-[color:var(--code-bg)] px-6 py-5">
        <code className="font-mono text-[14px] leading-[1.6] text-[color:var(--code-text)] whitespace-pre-wrap break-words">
          {code}
        </code>
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100"
        aria-label="Copy code"
      >
        {copied ? <Check className="h-4 w-4 text-[color:var(--success)]" /> : <Copy className="h-4 w-4" />}
      </button>
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
          className="rounded-sm bg-[color:var(--code-bg)] border border-[color:var(--code-border)] px-1.5 py-0.5 font-mono text-[0.85em] text-[color:var(--code-text)]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-[color:var(--text-primary)]">
          {token.slice(2, -2)}
        </strong>
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
          </a>
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

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      out.push(<CodeBlock key={`code-${key++}`} code={codeLines.join("\n")} />);
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
          className="mt-24 mb-6 text-heading-lg text-[color:var(--text-primary)]"
        >
          {text}
        </h2>
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
          className="mt-12 mb-4 text-heading-md text-[color:var(--text-primary)]"
        >
          {text}
        </h3>
      );
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      out.push(<hr key={`hr-${key++}`} className="my-12 border-[color:var(--border-subtle)]" />);
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
          className="my-8 border-l-[3px] border-[color:var(--accent)] bg-[color:var(--bg-subtle)] px-6 py-4 italic text-[18px] leading-[1.6] text-[color:var(--text-secondary)]"
        >
          {renderInline(quoteLines.join(" "), `q-${key}`)}
        </blockquote>
      );
      continue;
    }

    if (line.startsWith("|") && i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())) {
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
            .map((c) => c.trim())
        );
        i++;
      }
      out.push(
        <div
          key={`tbl-${key++}`}
          className="my-8 overflow-x-auto rounded-md border border-[color:var(--border-subtle)]"
        >
          <table className="w-full text-body-sm">
            <thead className="bg-[color:var(--bg-subtle)]">
              <tr>
                {headerCells.map((c, idx) => (
                  <th
                    key={idx}
                    className="px-4 py-3 text-left font-mono text-[12px] tracking-[0.04em] uppercase text-[color:var(--text-tertiary)]"
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
                    <td key={cIdx} className="px-4 py-3 align-top text-[color:var(--text-secondary)]">
                      {renderInline(c, `td-${rIdx}-${cIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        <ul key={`ul-${key++}`} className="my-6 space-y-2 pl-5">
          {items.map((it, idx) => (
            <li
              key={idx}
              className="relative pl-5 text-[color:var(--text-secondary)] before:absolute before:left-0 before:top-[0.85em] before:h-px before:w-3 before:bg-[color:var(--text-tertiary)]"
            >
              {renderInline(it, `li-${idx}`)}
            </li>
          ))}
        </ul>
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
          className="my-6 list-decimal space-y-2 pl-7 marker:font-mono marker:text-[color:var(--text-tertiary)] marker:tabular-nums"
        >
          {items.map((it, idx) => (
            <li key={idx} className="pl-1 text-[color:var(--text-secondary)]">
              {renderInline(it, `oli-${idx}`)}
            </li>
          ))}
        </ol>
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
      </p>
    );
  }

  return { nodes: out, headings };
}
