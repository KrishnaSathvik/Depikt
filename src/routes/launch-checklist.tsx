import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/launch-checklist")({
  head: () => ({
    meta: [
      { title: "Launch Checklist — Depikt" },
      { name: "description", content: "Post-launch checklist: stress tests, log review, and soft-launch cohort." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LaunchChecklistPage,
});

const STRESS_TESTS: { id: string; label: string; input: string; expect: string }[] = [
  { id: "t1", label: "Test 1 — LinkedIn social post", input: "linkedin post about AI in healthcare", expect: "SOCIAL POST/AD · 1200x628 · stat-as-hook" },
  { id: "t2", label: "Test 2 — Storyboard (10 panels)", input: "storyboard for a coffee commercial, 10 panels", expect: "STORYBOARD · 10 PAGE blocks · varied panels" },
  { id: "t3", label: "Test 3 — Square format constraint", input: "square format album cover, lo-fi hip hop", expect: "1:1 locked verbatim · no --ar leakage" },
  { id: "t4", label: "Test 4 — Wedding photography", input: "wedding photo of couple at golden hour", expect: "PHOTOREAL · camera + lens specs" },
  { id: "t5", label: "Test 5 — Open-ended creative", input: "an image about loneliness", expect: "OPEN-ENDED CREATIVE · medium + movement, no camera specs" },
  { id: "t6", label: "Test 6 — Product on white", input: "product shot of a ceramic mug on white background", expect: "PRODUCT · seamless white, soft box lighting" },
  { id: "t7", label: "Test 7 — YouTube thumbnail", input: "youtube thumbnail for a video about productivity", expect: "THUMBNAIL · 16:9 locked · large readable text" },
  { id: "t8", label: "Test 8 — Instagram vertical", input: "instagram story about morning coffee routine", expect: "9:16 locked · no --ar leakage" },
  { id: "t9", label: "Test 9 — Kitchen interior", input: "modern minimalist kitchen interior", expect: "INTERIOR/ARCHITECTURE · materials + lighting" },
  { id: "t10", label: "Test 10 — Cinematic landscape", input: "cinematic landscape at sunrise over mountains", expect: "CINEMATIC · anamorphic, 16:9, golden hour" },
];

function LaunchChecklistPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setChecked((s) => ({ ...s, [id]: !s[id] }));

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const completed = Object.values(checked).filter(Boolean).length;
  const total = STRESS_TESTS.length + 6; // tests + log/cohort items below

  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <Header />
      <main className="mx-auto max-w-[1080px] px-6 py-12 lg:px-12 lg:py-16">
        <div className="mb-10">
          <p className="eyebrow">Post-launch · v1</p>
          <h1 className="mt-3 text-display-md text-[color:var(--text-primary)]">Launch checklist</h1>
          <p className="mt-3 text-body-md text-[color:var(--text-secondary)]">
            Final pass before opening the doors. Run the 10 stress tests, glance at logs, and open a small cohort.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="secondary">{completed} / {total} done</Badge>
            <Badge variant="outline">v1.0</Badge>
          </div>
        </div>

        {/* Section 1 — Stress tests */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="font-mono text-xs text-[color:var(--text-secondary)]">01</span>
              Run the 10 stress tests
            </CardTitle>
            <CardDescription>
              Open the Prompt Builder and paste each input. Confirm routing + output match the expected shape.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/generate">
              <Button size="sm" variant="default" className="mb-3">
                Open Prompt Builder <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <ul className="divide-y divide-[color:var(--border-subtle)]">
              {STRESS_TESTS.map((t) => (
                <li key={t.id} className="flex items-start gap-3 py-3">
                  <Checkbox
                    id={t.id}
                    checked={!!checked[t.id]}
                    onCheckedChange={() => toggle(t.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <label htmlFor={t.id} className="text-sm font-medium text-[color:var(--text-primary)] cursor-pointer">
                      {t.label}
                    </label>
                    <p className="mt-0.5 font-mono text-xs text-[color:var(--text-secondary)] truncate">{t.input}</p>
                    <p className="mt-0.5 text-xs text-[color:var(--text-tertiary,var(--text-secondary))]">
                      Expect: {t.expect}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copy(t.input)} aria-label="Copy input">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Section 2 — Review logs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="font-mono text-xs text-[color:var(--text-secondary)]">02</span>
              Review logs
            </CardTitle>
            <CardDescription>
              Check the first hours of real traffic for routing failures, syntax leaks, or empty outputs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { id: "log-errors", label: "Scan server logs for 5xx errors on /api/public/generate-prompt" },
              { id: "log-routing", label: "Spot-check 10 real generations: routing matches input intent" },
              { id: "log-leaks", label: "Grep outputs for --ar / --v / --style leaks (should be zero)" },
            ].map((item) => (
              <label key={item.id} className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  id={item.id}
                  checked={!!checked[item.id]}
                  onCheckedChange={() => toggle(item.id)}
                  className="mt-0.5"
                />
                <span className="text-sm text-[color:var(--text-primary)]">{item.label}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Section 3 — Soft-launch cohort */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="font-mono text-xs text-[color:var(--text-secondary)]">03</span>
              Start the soft-launch cohort
            </CardTitle>
            <CardDescription>
              Aim for ~10–25 friendly users. Keep the loop tight: invite, watch, talk, iterate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { id: "cohort-list", label: "Draft cohort list (10–25 names: designers, marketers, indie devs)" },
              { id: "cohort-invite", label: "Send personal invites with one example prompt + the /generate link" },
              { id: "cohort-feedback", label: "Open a single feedback channel (DM, email, or Tally form)" },
            ].map((item) => (
              <label key={item.id} className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  id={item.id}
                  checked={!!checked[item.id]}
                  onCheckedChange={() => toggle(item.id)}
                  className="mt-0.5"
                />
                <span className="text-sm text-[color:var(--text-primary)]">{item.label}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        {completed === total && (
          <div className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-subtle)] p-5 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-[color:var(--accent)] mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[color:var(--text-primary)]">Checklist complete.</p>
              <p className="text-sm text-[color:var(--text-secondary)] mt-0.5">
                Ship it and let the cohort tell you what to build next.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
