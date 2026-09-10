import { Fragment, useId } from "react";
import { Button } from "@/components/ui/button";
import type { Template } from "@/data/templates";
import { filledFields, type TemplateValues } from "@/lib/template-context";

/**
 * Compact summary of the active template inside Build mode: the answered
 * fields only, plus Edit and Remove. Empty fields are never shown.
 */
export function TemplateBrief({
  template,
  values,
  onEdit,
  onRemove,
}: {
  template: Template;
  values: TemplateValues;
  onEdit: (from: HTMLElement) => void;
  onRemove: () => void;
}) {
  const filled = filledFields(template, values);
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)]"
      data-template-brief={template.slug}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border-subtle)] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-[color:var(--text-tertiary)]">
            Using template
          </p>
          <h3 id={titleId} className="mt-0.5 text-heading-sm text-[color:var(--text-primary)]">
            {template.title}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-9"
            onClick={(e) => onEdit(e.currentTarget)}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-9 text-[color:var(--text-tertiary)]"
            onClick={onRemove}
          >
            Remove
          </Button>
        </div>
      </div>
      {filled.length > 0 ? (
        <dl className="grid gap-x-6 gap-y-2 px-4 py-3 sm:grid-cols-[max-content_1fr]">
          {filled.map((f) => (
            <Fragment key={f.key}>
              <dt className="text-[13px] text-[color:var(--text-tertiary)]">{f.label}</dt>
              <dd className="min-w-0 break-words text-body-sm text-[color:var(--text-primary)]">
                {f.value}
              </dd>
            </Fragment>
          ))}
        </dl>
      ) : (
        <p className="px-4 py-3 text-body-sm text-[color:var(--text-tertiary)]">
          No details yet. Edit the template to add what you know.
        </p>
      )}
    </section>
  );
}
