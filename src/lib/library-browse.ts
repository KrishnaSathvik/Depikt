import { GALLERY_METADATA } from "../data/gallery-metadata.ts";
import type { LibraryPrompt } from "../types/library.ts";
import type { Template } from "../data/templates.ts";
import { galleryLabel } from "./gallery-labels.ts";

export const BROWSE_CATEGORIES = [
  "All",
  "Posters",
  "Portraits",
  "Products",
  "Editorial",
  "Social",
  "UI",
  "Interiors",
  "Food",
  "Reference",
] as const;
export type BrowseCategory = (typeof BROWSE_CATEGORIES)[number];
export type BrowseType = "all" | "prompts" | "templates" | "gallery";
interface EntryBase {
  key: string;
  title: string;
  description: string;
  categories: BrowseCategory[];
  searchText: string;
  image?: string | null;
}
export type BrowseEntry = EntryBase &
  (
    | { type: "prompts"; prompt: LibraryPrompt }
    | { type: "templates"; template: Template }
    | { type: "gallery"; filename: string }
  );

const CATEGORY_RULES: [BrowseCategory, RegExp][] = [
  ["Posters", /poster|flyer|typograph|infographic/],
  ["Portraits", /portrait|character|headshot|selfie/],
  ["Products", /product|packaging|packshot|brand|logo/],
  ["Editorial", /editorial|fashion|cinematic|storyboard|magazine/],
  ["Social", /social|thumbnail|instagram|youtube/],
  ["UI", /\bui\b|interface|dashboard|website|app screen/],
  ["Interiors", /interior|room|architecture|furniture/],
  ["Food", /food|recipe|dish|restaurant/],
  ["Reference", /reference|image edit|identity|style transfer/],
];

/** Display taxonomy only: original catalogue categories and model labels stay intact. */
export function browseCategories(text: string): BrowseCategory[] {
  return CATEGORY_RULES.filter(([, pattern]) => pattern.test(text.toLowerCase())).map(
    ([category]) => category,
  );
}

export function buildBrowseEntries(
  prompts: LibraryPrompt[],
  templates: readonly Template[],
  images: readonly string[],
): BrowseEntry[] {
  const promptEntries: BrowseEntry[] = prompts.map((prompt) => {
    const categories = browseCategories(
      [
        prompt.title,
        prompt.category === "Interior/Food/Fashion" ? "" : prompt.category,
        ...(prompt.tags ?? []),
      ].join(" "),
    );
    return {
      key: `${prompt.source}-${prompt.id}`,
      type: "prompts",
      title: prompt.title,
      description: prompt.user_input || prompt.prompt,
      image: prompt.thumbnail_url,
      categories,
      searchText: [
        prompt.title,
        prompt.prompt,
        prompt.user_input,
        prompt.category,
        ...categories,
        ...(prompt.tags ?? []),
      ]
        .join(" ")
        .toLowerCase(),
      prompt,
    };
  });
  // Prefer reviewed current-collection outputs for the mixed starting view.
  promptEntries.sort(
    (a, b) =>
      Number(b.type === "prompts" && b.prompt.target_model === "gpt-image-2.5") -
      Number(a.type === "prompts" && a.prompt.target_model === "gpt-image-2.5"),
  );
  const templateEntries: BrowseEntry[] = [...templates]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((template) => {
      const categories = browseCategories(
        [template.title, template.description, ...template.tags].join(" "),
      );
      return {
        key: `template-${template.slug}`,
        type: "templates",
        title: template.title,
        description: template.description,
        categories,
        searchText: [
          template.title,
          template.description,
          template.best_for,
          template.template_prompt,
          ...template.tags,
          ...categories,
        ]
          .join(" ")
          .toLowerCase(),
        template,
      };
    });
  const galleryEntries: BrowseEntry[] = images.map((filename, index) => {
    const title = galleryLabel(filename, index);
    const metadata = GALLERY_METADATA[filename];
    const terms = metadata?.terms ?? "";
    const categories: BrowseCategory[] = [
      ...new Set<BrowseCategory>(["Reference", ...browseCategories(`${title} ${terms}`)]),
    ];
    return {
      key: `reference-${filename}`,
      type: "gallery",
      filename,
      title,
      description: metadata
        ? `${metadata.subject}. Use as a visual reference.`
        : "Use this image to guide your next creation.",
      image: `/gallery/${filename}`,
      categories,
      searchText: [title, terms, "reference", ...categories].join(" ").toLowerCase(),
    };
  });
  // Round-robin makes every content type visible from the first row without duplicating records.
  const entries: BrowseEntry[] = [];
  for (
    let i = 0;
    i < Math.max(promptEntries.length, templateEntries.length, galleryEntries.length);
    i++
  ) {
    for (const group of [promptEntries, templateEntries, galleryEntries])
      if (group[i]) entries.push(group[i]);
  }
  return entries;
}

export function filterBrowseEntries(
  entries: BrowseEntry[],
  filters: {
    tab: BrowseType;
    q: string;
    category: BrowseCategory;
    collection: string;
    favorites: boolean;
  },
  favoriteIds: ReadonlySet<string>,
): BrowseEntry[] {
  const words = filters.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return entries.filter(
    (entry) =>
      (filters.tab === "all" || filters.tab === entry.type) &&
      (filters.category === "All" || entry.categories.includes(filters.category)) &&
      words.every((word) => entry.searchText.includes(word)) &&
      (!filters.favorites || favoriteIds.has(entry.key)) &&
      (filters.tab === "templates" ||
        filters.tab === "gallery" ||
        filters.collection === "all" ||
        (entry.type === "prompts" &&
          (entry.prompt.target_model ?? "gpt-image-2") === filters.collection)),
  );
}

/** Only expose categories backed by content in the selected Library tab. */
export function availableBrowseCategories(
  entries: BrowseEntry[],
  tab: BrowseType,
): BrowseCategory[] {
  const populated = new Set(
    entries
      .filter((entry) => tab === "all" || entry.type === tab)
      .flatMap((entry) => entry.categories),
  );
  return BROWSE_CATEGORIES.filter((category) => category === "All" || populated.has(category));
}
