import { Download, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface GenerationActionsProps {
  onDownload: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
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
  disabled,
  className,
}: GenerationActionsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <Button variant="outline" onClick={onDownload} disabled={disabled}>
        <Download className="mr-1.5 h-4 w-4" /> Download
      </Button>
      <Button variant="outline" onClick={onEdit} disabled={disabled}>
        <Wand2 className="mr-1.5 h-4 w-4" /> Edit
      </Button>
      <Button variant="outline" onClick={onRegenerate} disabled={disabled}>
        <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerate · 1 credit
      </Button>
    </div>
  );
}
