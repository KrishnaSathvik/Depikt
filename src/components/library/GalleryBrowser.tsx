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
  return (
    <Dialog open={!!selected} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto bg-[color:var(--bg-elevated)] px-4 pb-4 pt-12 sm:px-6 sm:pb-6 sm:pt-12">
        {selected && (
          <>
            <DialogTitle className="sr-only">
              {galleryLabel(selected, GALLERY_IMAGES.indexOf(selected))}
            </DialogTitle>
            <div className="flex flex-col items-center gap-4">
              <SampleImage
                src={`/gallery/${selected}`}
                alt={galleryLabel(selected, GALLERY_IMAGES.indexOf(selected))}
                maxHeightClass="max-h-[70vh]"
                className="rounded-md"
              />
              <Button
                type="button"
                onClick={() => handleUseAsReference(selected)}
                disabled={attaching}
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
