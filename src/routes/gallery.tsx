import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Pagination } from "@/components/Pagination";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SampleImage } from "@/components/SampleImage";
import { GALLERY_IMAGES } from "@/data/gallery-images";
import { galleryLabel } from "@/lib/gallery-labels";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { pageSeoHead } from "@/lib/seo";
import { CTA, JSONLD_DESCRIPTIONS, JSONLD_NAMES, ROUTES, SEO, TOOL } from "@/lib/product";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { saveGenerationHandoff } from "@/lib/generation/handoff";
import { urlToProcessedImage } from "@/lib/image-utils";
import { toast } from "sonner";

const GALLERY_URL = absoluteUrl("/gallery");

// Six rows of the four-column desktop grid per page.
const PAGE_SIZE = 24;

const searchSchema = z.object({
  page: fallback(z.number().int().min(1), 1).default(1),
});

export const Route = createFileRoute("/gallery")({
  validateSearch: zodValidator(searchSchema),
  head: () => {
    const { meta, links } = pageSeoHead(SEO.gallery, {
      url: GALLERY_URL,
      image: getOgImageForPath("gallery"),
    });
    return {
      meta,
      links,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: JSONLD_NAMES.gallery,
            url: GALLERY_URL,
            description: JSONLD_DESCRIPTIONS.gallery,
          }),
        },
      ],
    };
  },
  component: GalleryPage,
});

function GalleryPage() {
  const navigate = useNavigate();
  const { page } = Route.useSearch();
  const [selected, setSelected] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(GALLERY_IMAGES.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => GALLERY_IMAGES.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [safePage],
  );

  const goToPage = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p));
    navigate({ to: "/gallery", search: { page: next } });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const [attaching, setAttaching] = useState(false);

  const handleUseAsReference = async (filename: string) => {
    if (isNativeGenerationEnabled()) {
      setAttaching(true);
      try {
        const processed = await urlToProcessedImage(`/gallery/${filename}`);
        saveGenerationHandoff({
          prompt: "",
          references: [{ dataUrl: processed.dataUrl }],
          structuredAspectRatio: null,
          sourceType: "gallery",
          sourceId: filename,
        });
        void navigate({ to: ROUTES.legacyBuilder });
      } catch {
        toast.error("Could not use this image as a reference");
      } finally {
        setAttaching(false);
      }
      return;
    }
    navigate({
      to: "/prompt",
      search: { mode: "build" as const, ref: `/gallery/${filename}` },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-12">
        <p className="eyebrow">{TOOL.gallery}</p>
        <h1 className="mt-3 text-heading-xl sm:text-display-md text-[color:var(--text-primary)]">
          Visual inspiration
        </h1>
        <p className="mt-3 max-w-[56ch] text-body-md text-[color:var(--text-secondary)]">
          Browse images and use one as a reference in Generate.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 lg:gap-3">
          {paged.map((filename, i) => {
            const label = galleryLabel(filename, (safePage - 1) * PAGE_SIZE + i);
            return (
              <button
                key={filename}
                type="button"
                onClick={() => setSelected(filename)}
                aria-label={`Preview ${label}`}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-sm bg-[color:var(--bg-subtle)]"
              >
                <img
                  src={`/gallery/${filename}`}
                  alt={label}
                  loading="lazy"
                  className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
                />
              </button>
            );
          })}
        </div>

        {totalPages > 1 && (
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={goToPage} />
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
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
    </div>
  );
}
