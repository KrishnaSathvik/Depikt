import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GenerationMaskEditor } from "@/components/generate/GenerationMaskEditor";
import type { MaskStroke } from "@/lib/generation/edit-mask";

const DEFAULT_BRUSH_RADIUS = 0.04;

/**
 * Shared edit-image form for Generate's left pane and Build/Critique inline
 * generation — same chrome, same CTA sizing.
 */
export function GenerationEditForm({
  value,
  onChange,
  onApply,
  onCancel,
  imageUrl,
  sourceWidth,
  sourceHeight,
  editMode: editModeProp,
  onEditModeChange,
  strokes: strokesProp,
  onStrokesChange,
}: {
  value: string;
  onChange: (next: string) => void;
  onApply: () => void;
  onCancel: () => void;
  imageUrl?: string | null;
  sourceWidth?: number;
  sourceHeight?: number;
  editMode?: "area" | "whole";
  onEditModeChange?: (mode: "area" | "whole") => void;
  strokes?: MaskStroke[];
  onStrokesChange?: (next: MaskStroke[]) => void;
}) {
  const canSelectArea =
    typeof imageUrl === "string" &&
    imageUrl.length > 0 &&
    typeof sourceWidth === "number" &&
    sourceWidth > 0 &&
    typeof sourceHeight === "number" &&
    sourceHeight > 0;

  const [uncontrolledMode, setUncontrolledMode] = useState<"area" | "whole">(
    canSelectArea ? "area" : "whole",
  );
  const [uncontrolledStrokes, setUncontrolledStrokes] = useState<MaskStroke[]>([]);
  const [brushRadius, setBrushRadius] = useState(DEFAULT_BRUSH_RADIUS);
  const [tool, setTool] = useState<"paint" | "erase">("paint");

  const editMode = editModeProp ?? uncontrolledMode;
  const strokes = strokesProp ?? uncontrolledStrokes;
  const mode = canSelectArea ? editMode : "whole";

  function setEditMode(next: "area" | "whole") {
    if (editModeProp === undefined) setUncontrolledMode(next);
    onEditModeChange?.(next);
  }

  function setStrokes(next: MaskStroke[]) {
    if (strokesProp === undefined) setUncontrolledStrokes(next);
    onStrokesChange?.(next);
  }

  return (
    <div className="space-y-3 rounded-md border border-[color:var(--border-subtle)] p-4">
      <p className="text-body-sm font-medium text-[color:var(--text-primary)]">Edit image</p>
      {canSelectArea && (
        <div role="tablist" aria-label="Edit mode" className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            role="tab"
            aria-selected={mode === "area"}
            variant={mode === "area" ? "default" : "outline"}
            onClick={() => setEditMode("area")}
          >
            Select area
          </Button>
          <Button
            type="button"
            size="sm"
            role="tab"
            aria-selected={mode === "whole"}
            variant={mode === "whole" ? "default" : "outline"}
            onClick={() => setEditMode("whole")}
          >
            Edit whole image
          </Button>
        </div>
      )}
      {canSelectArea && mode === "area" && imageUrl && sourceWidth && sourceHeight ? (
        <>
          <p className="text-body-sm text-[color:var(--text-secondary)]">
            Select what you want to change.
          </p>
          <GenerationMaskEditor
            imageUrl={imageUrl}
            sourceWidth={sourceWidth}
            sourceHeight={sourceHeight}
            strokes={strokes}
            onStrokesChange={setStrokes}
            brushRadius={brushRadius}
            onBrushRadiusChange={setBrushRadius}
            tool={tool}
            onToolChange={setTool}
          />
        </>
      ) : null}
      <p className="text-body-sm text-[color:var(--text-secondary)]">What should change?</p>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Make the jacket dark blue and keep everything else unchanged."
      />
      <div className="flex flex-wrap gap-2">
        <Button size="default" className="gap-2" disabled={!value.trim()} onClick={onApply}>
          Apply edit → · 1 credit
        </Button>
        <Button size="default" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
