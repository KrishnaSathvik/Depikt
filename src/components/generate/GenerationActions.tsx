import { Download, Plus, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface GenerationActionsProps {
  onDownload: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
  /** "Create another" — a blank composer for a new, unrelated image. Only
   *  /generate has a composer to return to, so this is opt-in; Build/
   *  Critique's inline result panel doesn't pass it. */
  onNew?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Shared result actions — same order, same labels, everywhere a generated
 * image can be acted on (/generate, Prompt Build inline result, Prompt
 * Critique inline result). Keeps action ordering from drifting per surface.
 */
export function GenerationActions({
  onDownload,
  onEdit,
  onRegenerate,
  onNew,
  disabled,
  className,
}: GenerationActionsProps) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className ?? ""}`}>
      <Button
        variant="outline"
        onClick={onDownload}
        disabled={disabled}
        className="flex-1 basis-[calc(50%-4px)] sm:flex-none sm:basis-auto"
      >
        <Download className="mr-1.5 h-4 w-4" /> Download
      </Button>
      <Button
        variant="outline"
        onClick={onEdit}
        disabled={disabled}
        className="flex-1 basis-[calc(50%-4px)] sm:flex-none sm:basis-auto"
      >
        <Wand2 className="mr-1.5 h-4 w-4" /> Edit
      </Button>
      <Button
        variant="outline"
        onClick={onRegenerate}
        disabled={disabled}
        className={`flex-1 sm:flex-none sm:basis-auto ${onNew ? "basis-[calc(50%-4px)]" : "basis-full"}`}
      >
        <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerate · 1 credit
      </Button>
      {onNew && (
        <Button
          variant="outline"
          onClick={onNew}
          disabled={disabled}
          className="flex-1 basis-[calc(50%-4px)] sm:flex-none sm:basis-auto"
        >
          <Plus className="mr-1.5 h-4 w-4" /> New
        </Button>
      )}
    </div>
  );
}
