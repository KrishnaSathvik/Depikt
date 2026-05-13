import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Wand2 } from "lucide-react";
import { Header } from "@/components/Header";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { GALLERY_IMAGES } from "@/data/gallery-images";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";

const GALLERY_OG_IMAGE = getOgImageForPath("/gallery");
const GALLERY_URL = absoluteUrl("/gallery");

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Reference Gallery — Depikt" },
      {
        name: "description",
        content:
          "Browse reference images and use them to inspire AI-generated prompts.",
      },
      { property: "og:title", content: "Reference Gallery — Depikt" },
      {
        property: "og:description",
        content:
          "Browse reference images and use them to inspire AI-generated prompts.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: GALLERY_URL },
      { property: "og:image", content: GALLERY_OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Reference Gallery — Depikt" },
      {
        name: "twitter:description",
        content:
          "Browse reference images and use them to inspire AI-generated prompts.",
      },
      { name: "twitter:image", content: GALLERY_OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: GALLERY_URL }],
  }),
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
    <div className="min-h-screen bg-[color:var(--bg)]">
      <Header />
      <div className="mx-auto max-w-[1400px] px-6 py-12 sm:py-16 lg:px-12">
        <h1 className="text-display-md sm:text-display-lg tracking-tight text-[color:var(--text-primary)]">
          Reference Gallery
        </h1>
        <p className="mt-3 text-body-md text-[color:var(--text-secondary)] max-w-2xl">
          Click any image to preview it, then use it as a style reference.
        </p>

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {GALLERY_IMAGES.map((filename) => (
            <button
              key={filename}
              type="button"
              onClick={() => setSelected(filename)}
              className="group relative aspect-square overflow-hidden rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] cursor-pointer"
            >
              <img
                src={`/gallery/${filename}`}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
              <img
                src={`/gallery/${selected}`}
                alt=""
                className="max-h-[70vh] w-full rounded-md object-contain"
              />
              <button
                type="button"
                onClick={() => handleUseAsReference(selected)}
                className="flex items-center gap-2 rounded-md bg-[color:var(--accent)] px-4 py-2.5 text-sm font-medium text-[color:var(--bg-elevated)] shadow-sm hover:opacity-90 transition-opacity"
              >
                <Wand2 className="h-4 w-4" />
                Use as reference
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
