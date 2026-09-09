import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Wand2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SampleImage } from "@/components/SampleImage";
import { GALLERY_IMAGES } from "@/data/gallery-images";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { JSONLD_DESCRIPTIONS, JSONLD_NAMES, SEO, TOOL } from "@/lib/product";

const GALLERY_URL = absoluteUrl("/gallery");

export const Route = createFileRoute("/gallery")({
  head: () => {
    const GALLERY_OG_IMAGE = getOgImageForPath();
    return {
      meta: [
        { title: SEO.gallery.title },
        { name: "description", content: SEO.gallery.description },
        { property: "og:title", content: SEO.gallery.title },
        { property: "og:description", content: SEO.gallery.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: GALLERY_URL },
        { property: "og:image", content: GALLERY_OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: SEO.gallery.title },
        { name: "twitter:description", content: SEO.gallery.description },
        { name: "twitter:image", content: GALLERY_OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: GALLERY_URL }],
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
  const [selected, setSelected] = useState<string | null>(null);

  const handleUseAsReference = (filename: string) => {
    navigate({
      to: "/generate",
      search: { ref: `/gallery/${filename}` },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-10 sm:px-6 sm:py-16 lg:px-12">
        <p className="eyebrow">{TOOL.gallery}</p>
        <h1 className="mt-4 text-display-md sm:text-display-lg text-[color:var(--text-primary)]">
          Reference Gallery
        </h1>
        <p className="mt-4 max-w-[56ch] text-body-lg text-[color:var(--text-secondary)]">
          Click any image to preview it, then send it to the {TOOL.builder} as a reference. You
          choose there how it is used: style, subject, composition, and so on.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 lg:gap-3">
          {GALLERY_IMAGES.map((filename) => (
            <button
              key={filename}
              type="button"
              onClick={() => setSelected(filename)}
              aria-label={`Preview gallery image ${filename}`}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-sm bg-[color:var(--bg-subtle)]"
            >
              <img
                src={`/gallery/${filename}`}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
              />
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto bg-[color:var(--bg-elevated)] px-4 pb-4 pt-12 sm:px-6 sm:pb-6 sm:pt-12">
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          {selected && (
            <div className="flex flex-col items-center gap-4">
              <SampleImage
                src={`/gallery/${selected}`}
                alt={`Gallery image ${selected}`}
                maxHeightClass="max-h-[70vh]"
                className="rounded-md"
              />
              <Button type="button" onClick={() => handleUseAsReference(selected)}>
                <Wand2 className="h-4 w-4" />
                Use as reference in {TOOL.builder}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
