import { useGalleryReference } from "@/hooks/use-gallery-reference";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SampleImage } from "@/components/SampleImage";
import { GALLERY_IMAGES } from "@/data/gallery-images";
import { galleryLabel } from "@/lib/gallery-labels";
import { CTA } from "@/lib/product";

/** Reference preview shared by every Library content view. */
export function GalleryBrowser({
  selected,
  onClose,
}: {
  selected: string | null;
  onClose: () => void;
}) {
  const { attach: handleUseAsReference, attaching } = useGalleryReference();
  const label = selected ? galleryLabel(selected, GALLERY_IMAGES.indexOf(selected)) : "";
  return (
    <Dialog open={!!selected} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100%-1rem)] max-w-4xl flex-col gap-0 overflow-y-auto rounded-[24px] bg-[color:var(--bg-elevated)] p-0 sm:rounded-[24px] [&>button:last-child]:z-10 [&>button:last-child]:h-10 [&>button:last-child]:w-10 [&>button:last-child]:bg-white/85 [&>button:last-child]:text-[color:var(--text-primary)] [&>button:last-child]:shadow-[0_4px_14px_-6px_rgba(17,17,17,0.35)] [&>button:last-child]:backdrop-blur-md">
        {selected && (
          <>
            <div className="bg-[color:var(--bg-subtle)] p-3 sm:p-4">
              <SampleImage
                src={`/gallery/${selected}`}
                alt={label}
                maxHeightClass="max-h-[66vh]"
                className="rounded-2xl"
              />
            </div>
            <div className="flex flex-col gap-4 border-t border-[color:var(--border-subtle)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[color:var(--text-tertiary)]">
                  Reference
                </p>
                <DialogTitle className="mt-0.5 truncate text-[20px] font-semibold tracking-[-0.015em] text-[color:var(--text-primary)]">
                  {label}
                </DialogTitle>
              </div>
              <Button
                type="button"
                variant="brand"
                onClick={() => handleUseAsReference(selected)}
                disabled={attaching}
                className="min-h-11 shrink-0"
              >
                {attaching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {CTA.useAsReference}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
