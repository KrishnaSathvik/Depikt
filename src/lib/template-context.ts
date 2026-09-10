/**
 * Template context: what a user answered in a template's setup panel, carried
 * from /templates into the Prompt workspace (Build mode).
 *
 * The URL only carries the template slug (/prompt?mode=build&template=<slug>);
 * the answered values live in sessionStorage so refreshes and the Edit round
 * trip keep them without stuffing payloads into query params.
 *
 * Templates collect structured intent. They never write the final prompt: the
 * brief composed here is handed to the existing Build engine as user input.
 */

import type { Template, TemplateField } from "@/data/templates";

export type TemplateValues = Record<string, string>;

export const TEMPLATE_STORAGE_KEY = "depikt:template-context:v1";

interface StoredContext {
  slug: string;
  values: TemplateValues;
  updatedAt: string;
}

/** The subset of the Storage API we use, so tests can pass a plain map. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function sessionStore(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function saveTemplateValues(
  slug: string,
  values: TemplateValues,
  store: StorageLike | null = sessionStore(),
) {
  if (!store) return;
  const payload: StoredContext = { slug, values, updatedAt: new Date().toISOString() };
  try {
    store.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* storage full or blocked: the slug in the URL still restores an empty template */
  }
}

export function loadTemplateValues(
  slug: string,
  store: StorageLike | null = sessionStore(),
): TemplateValues {
  if (!store) return {};
  try {
    const raw = store.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<StoredContext>;
    if (parsed.slug !== slug || !parsed.values || typeof parsed.values !== "object") return {};
    const values: TemplateValues = {};
    for (const [k, v] of Object.entries(parsed.values)) if (typeof v === "string") values[k] = v;
    return values;
  } catch {
    return {};
  }
}

export function clearTemplateValues(store: StorageLike | null = sessionStore()) {
  try {
    store?.removeItem(TEMPLATE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------- fields

export function requiredFields(template: Template): TemplateField[] {
  return template.fields.filter((f) => f.required);
}

/** Labels shown on a card: required fields first, then the next few in order. */
export function previewFieldLabels(template: Template, limit = 4): string[] {
  const required = template.fields.filter((f) => f.required);
  const rest = template.fields.filter((f) => !f.required);
  return [...required, ...rest].slice(0, limit).map((f) => f.label);
}

export function fieldPlaceholder(template: Template, field: TemplateField): string {
  if (field.placeholder) return field.placeholder;
  const example = template.example_input[field.key];
  return example ? `e.g. ${example}` : "";
}

export interface FilledField {
  key: string;
  label: string;
  value: string;
}

/** Answered fields only, in template order. Empty answers are dropped. */
export function filledFields(template: Template, values: TemplateValues): FilledField[] {
  const out: FilledField[] = [];
  for (const f of template.fields) {
    const v = values[f.key]?.trim();
    if (v) out.push({ key: f.key, label: f.label, value: v });
  }
  return out;
}

/** Errors keyed by field key. Only genuinely required fields are validated. */
export function validateTemplateValues(
  template: Template,
  values: TemplateValues,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of requiredFields(template)) {
    if (!values[f.key]?.trim()) errors[f.key] = `Add ${f.label.toLowerCase()} to continue.`;
  }
  return errors;
}

export function hasRequiredValues(template: Template, values: TemplateValues): boolean {
  return Object.keys(validateTemplateValues(template, values)).length === 0;
}

// ---------------------------------------------------------------- brief

export const MAX_BRIEF_LENGTH = 4000;

/**
 * The structured brief the Build engine receives as user input: template name,
 * the answered fields, and any extra direction. Never the bracket skeleton.
 */
export function composeTemplateBrief(
  template: Template,
  values: TemplateValues,
  extraDirection = "",
): string {
  const lines = [`Template: ${template.title}`];
  for (const f of filledFields(template, values)) lines.push(`${f.label}: ${f.value}`);
  const extra = extraDirection.trim();
  if (extra) lines.push("", `Additional direction: ${extra}`);
  return lines.join("\n").slice(0, MAX_BRIEF_LENGTH);
}
