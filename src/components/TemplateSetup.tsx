import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PromptSurface } from "@/components/PromptSurface";
import { buildTemplateStarter, type Template } from "@/data/templates";
import {
  fieldPlaceholder,
  validateTemplateValues,
  type TemplateValues,
} from "@/lib/template-context";
import { trackEvent } from "@/lib/analytics";
import { TOOL } from "@/lib/product";
import { coverGradient } from "@/components/library/CoverArt";

/**
 * Template setup: the one place a user answers a template's questions. Opens
 * as a centered dialog, like the Library prompt dialog, with a scrollable body
 * and a pinned Continue action. Used by /templates (Start) and by Build mode
 * (Edit) so the fields never drift.
 */
export interface TemplateSetupProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: TemplateValues;
  onContinue: (values: TemplateValues) => void;
  continueLabel?: string;
  /** Element that opened the panel (Start or Edit); focus returns there on close. */
  returnFocusTo?: HTMLElement | null;
}

export function TemplateSetup({
  template,
  open,
  onOpenChange,
  initialValues,
  onContinue,
  continueLabel,
  returnFocusTo,
}: TemplateSetupProps) {
  const [values, setValues] = useState<TemplateValues>(initialValues ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const startedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const baseId = useId();
  const slug = template?.slug;

  // Reset the form each time the panel opens for a template.
  useEffect(() => {
    if (!open || !slug) return;
    setValues(initialValues ?? {});
    setErrors({});
    startedRef.current = false;
    trackEvent("template_viewed", { template: slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slug]);

  if (!template) return null;

  const update = (key: string, value: string) => {
    if (!startedRef.current) {
      startedRef.current = true;
      trackEvent("template_started", { template: template.slug });
    }
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validateTemplateValues(template, values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstKey = template.fields.find((f) => nextErrors[f.key])?.key;
      if (firstKey) {
        formRef.current?.querySelector<HTMLElement>(`[data-field="${firstKey}"]`)?.focus();
      }
      return;
    }
    trackEvent("template_completed", {
      template: template.slug,
      answered: Object.values(values).filter((v) => v.trim()).length,
    });
    onContinue(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={(e) => {
          if (returnFocusTo && returnFocusTo.isConnected) {
            e.preventDefault();
            returnFocusTo.focus();
          }
        }}
        className="flex max-h-[92vh] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-[24px] bg-[color:var(--bg-elevated)] p-0 sm:max-h-[90vh] sm:rounded-[24px] [&>button:last-child]:z-10 [&>button:last-child]:h-10 [&>button:last-child]:w-10 [&>button:last-child]:bg-white/85 [&>button:last-child]:text-[color:var(--text-primary)] [&>button:last-child]:backdrop-blur-md"
      >
        <form ref={formRef} onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div
              className="border-b border-[color:var(--border-subtle)] px-5 pb-7 pt-12 sm:px-8 sm:pt-10"
              style={{ backgroundImage: coverGradient(`template-${template.slug}`) }}
            >
              <p className="badge-eyebrow">Template</p>
              <DialogTitle className="mt-4 text-balance text-[26px] font-semibold leading-[1.1] tracking-[-0.025em] text-[color:var(--text-primary)] sm:text-[30px]">
                {template.title}
              </DialogTitle>
              <DialogDescription className="mt-3 text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
                {template.description}
              </DialogDescription>
            </div>
            <div className="px-5 pb-8 pt-6 sm:px-8">
              <p className="text-body-sm text-[color:var(--text-tertiary)]">
                Answer what you know. Optional details can be left blank.
              </p>

              <div className="mt-6 space-y-5">
                {template.fields.map((field) => {
                  const inputId = `${baseId}-${field.key}`;
                  const hintId = field.hint ? `${inputId}-hint` : undefined;
                  const error = errors[field.key];
                  const errorId = error ? `${inputId}-error` : undefined;
                  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
                  const shared = {
                    id: inputId,
                    "data-field": field.key,
                    value: values[field.key] ?? "",
                    placeholder: fieldPlaceholder(template, field),
                    "aria-required": field.required || undefined,
                    "aria-invalid": error ? true : undefined,
                    "aria-describedby": describedBy,
                  };
                  return (
                    <div key={field.key}>
                      <label
                        htmlFor={inputId}
                        className="block text-[13.5px] font-semibold text-[color:var(--text-primary)]"
                      >
                        {field.label}
                        {field.required && (
                          <>
                            <span
                              aria-hidden="true"
                              className="ml-0.5 text-[color:var(--text-primary)]"
                            >
                              *
                            </span>
                            <span className="sr-only"> (required)</span>
                          </>
                        )}
                      </label>
                      {field.hint && (
                        <p
                          id={hintId}
                          className="mt-0.5 text-[12px] text-[color:var(--text-tertiary)]"
                        >
                          {field.hint}
                        </p>
                      )}
                      {field.long ? (
                        <Textarea
                          {...shared}
                          rows={3}
                          className="mt-2 min-h-11 rounded-xl border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-4 py-3 text-[15px] focus-visible:border-[color:var(--ink)] focus-visible:ring-4 focus-visible:ring-black/5 focus-visible:ring-offset-0"
                          onChange={(e) => update(field.key, e.target.value)}
                        />
                      ) : (
                        <Input
                          {...shared}
                          className="mt-2 h-12 min-h-11 rounded-xl border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-4 text-[15px] focus-visible:border-[color:var(--ink)] focus-visible:ring-4 focus-visible:ring-black/5 focus-visible:ring-offset-0"
                          onChange={(e) => update(field.key, e.target.value)}
                        />
                      )}
                      {error && (
                        <p
                          id={errorId}
                          role="alert"
                          className="mt-1.5 text-[13px] text-[color:var(--text-primary)]"
                        >
                          {error}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <details className="group mt-8">
                <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-full border border-[color:var(--border-default)] px-4 text-body-sm font-medium text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)] [&::-webkit-details-marker]:hidden">
                  See template structure
                  <ChevronDown
                    className="h-4 w-4 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <div className="mt-3">
                  <PromptSurface label="Structure">
                    {buildTemplateStarter(template, values)}
                  </PromptSurface>
                </div>
              </details>
            </div>
          </div>

          <div className="flex justify-end border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)]/95 px-5 py-4 backdrop-blur [padding-bottom:max(1rem,env(safe-area-inset-bottom))] sm:px-8">
            <Button type="submit" size="lg" variant="brand" className="min-h-11 w-full sm:w-auto">
              {continueLabel ?? `Continue in ${TOOL.prompt}`} <ArrowRight />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
