// Category playbooks: short, category-specific guidance for the Prompt Writer.
// Only the playbook matching the Intent's category is sent with a request.

import type { CategoryId } from "../categories.ts";
import { cinematic } from "./cinematic.ts";
import { poster } from "./poster.ts";
import { infographic } from "./infographic.ts";
import { ui } from "./ui.ts";
import { social } from "./social.ts";
import { storyboard } from "./storyboard.ts";
import { product } from "./product.ts";
import { visualSummary } from "./visual-summary.ts";
import { imageEdit } from "./image-edit.ts";
import { creative } from "./creative.ts";

export interface Playbook {
  id: CategoryId;
  title: string;
  guidance: string;
}

export const PLAYBOOKS: Record<CategoryId, Playbook> = {
  cinematic,
  poster,
  infographic,
  ui,
  social,
  storyboard,
  product,
  visual_summary: visualSummary,
  image_edit: imageEdit,
  creative,
};

export function selectPlaybook(category: CategoryId): Playbook {
  return PLAYBOOKS[category];
}
