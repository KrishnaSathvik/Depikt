/**
 * generate-thumbnails.mjs
 *
 * One-time script to generate thumbnail images for curated prompts using GPT Image 2.
 * Outputs 400px-wide WebP files to scripts/thumbnails/{id}.webp
 *
 * Usage:
 *   node scripts/generate-thumbnails.mjs                   # Generate all missing
 *   node scripts/generate-thumbnails.mjs --dry-run         # Show what would be generated
 *   node scripts/generate-thumbnails.mjs --id curated-xyz  # Generate one specific prompt
 *   node scripts/generate-thumbnails.mjs --upload          # Upload to Supabase Storage after generating
 *
 * Requires: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY in .env
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(__dirname, "thumbnails");

// Load .env manually (no dotenv dependency needed)
const envFile = readFileSync(resolve(ROOT, ".env"), "utf8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const eq = l.indexOf("=");
      return [l.slice(0, eq), l.slice(eq + 1).replace(/^["']|["']$/g, "")];
    })
);

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const supabase = createClient(env.SUPABASE_URL || env.VITE_SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY);

// ─── Placeholder substitutions for the 9 prompts that need them ─────────────
const PLACEHOLDER_FILLS = {
  "curated-quote-card": {
    "[Your quote here]": "The only way to do great work is to love what you do",
    "[Author Name]": "Steve Jobs",
  },
  "curated-meme-template": {
    "[describe the scene or character reaction — e.g., \"golden retriever sitting at a desk wearing reading glasses looking confused at a laptop screen\"]":
      "golden retriever sitting at a desk wearing reading glasses looking confused at a laptop screen",
    "[target emotion — e.g., \"bewildered confusion\"]": "bewildered confusion",
  },
  "curated-twitter-thread-hook": {
    "[Your hook statement here]": "Most people use AI wrong",
  },
  "curated-fitness-infographic": {
    "[topic]": "upper body push day",
  },
  "curated-encyclopedia-card": {
    "[topic]": "Honeybees",
  },
  "curated-character-relationship-poster": {
    "[theme]": "Lord of the Rings",
  },
  "curated-silhouette-narrative-poster": {
    "[theme: xxx]": "theme: deep ocean exploration",
  },
  "curated-where-is-poster": {
    "[Your Name]": "Waldo",
  },
  "curated-low-quality-shot": {
    "[your scene description]":
      "a cat sitting on a kitchen counter staring at a microwave",
  },
  // ─── Batch 2 placeholder fills ──────────────────────────────────────────────
  "curated-prompt-anatomy-generic": {
    "[PROMPT NAME / USE CASE / SYSTEM NAME]": "AI Customer Support Chatbot",
    "[PROMPT NAME / USE CASE]": "AI Customer Support Chatbot",
  },
  "curated-isometric-vehicle-diorama": {
    "DeLorean DMC-12 (Back to the Future)": "DeLorean DMC-12",
    "(road with fire trails)": "(road with fire trails)",
    '"DELOREAN DMC-12"': '"DELOREAN DMC-12"',
  },
  "curated-scientific-creature-infographic": {
    "a Red Dragon": "a Red Dragon",
  },
  "curated-minimalist-sticker-collection": {
    "Japan": "Japan",
    '"JAPAN"': '"JAPAN"',
  },
  "curated-technical-annotation-photo": {
    "the human heart": "the human heart",
    '"HUMAN HEART"': '"HUMAN HEART"',
  },
  "curated-isometric-tech-infographic": {
    "iPhone 16 Pro": "iPhone 16 Pro",
    '"iPHONE 16 PRO"': '"iPHONE 16 PRO"',
  },
  "curated-tv-character-diagram": {
    "Breaking Bad": "Breaking Bad",
  },
  "curated-cutaway-educational": {
    "Submarine": "Submarine",
  },
  "curated-sketchnote-infographic": {
    '"AI STRATEGY 2026"': '"AI STRATEGY 2026"',
  },
  "curated-founder-infographic": {
    "[founder name]": "Jensen Huang",
    "[HEADLINE TEXT]": "THIS MAN BUILT THE AI ERA",
    "[brand color]": "NVIDIA green",
    "[title]": "Founder & CEO",
    "[company]": "NVIDIA",
    "[one-line description]": "Built the backbone of the AI revolution",
    "[famous quote]": "The more you buy, the more you save.",
  },
  // ─── Batch 3 placeholder fills ──────────────────────────────────────────────
  "curated-travel-infographic-guide": {
    "[COUNTRY]": "Japan",
  },
  "curated-isometric-movie-diorama": {
    "[SCENE NAME]": "The Space Station",
    "[MOVIE/SHOW]": "Interstellar",
    "[BACKGROUND COLOR]": "dark charcoal",
    '"MOVIE/SHOW"': '"INTERSTELLAR"',
  },
  "curated-mecha-techwear-poster": {
    "[COLOR]": "neon cyan",
  },
  // ─── Batch 4 placeholder fills ──────────────────────────────────────────────
  "curated-museum-creature-infographic": {
    "[CREATURE]": "Smilodon (Saber-Toothed Tiger)",
  },
  "curated-luxury-brand-identity-board": {
    "[BRAND NAME]": "Lumière",
  },
  "curated-luxury-product-hero-shot": {
    "[BRAND NAME]": "Lumière",
  },
  "curated-fashion-campaign-poster": {
    "[BRAND NAME]": "Lumière",
  },
  "curated-luxury-ecommerce-app": {
    "[BRAND NAME]": "Lumière",
  },
  "curated-luxury-packaging-design": {
    "[BRAND NAME]": "Lumière",
  },
  "curated-luxury-website-hero": {
    "[BRAND NAME]": "Lumière",
  },
  "curated-luxury-ad-editorial": {
    "[BRAND NAME]": "Lumière",
  },
  "curated-billboard-ad-concept": {
    "[BRAND NAME]": "Lumière",
  },
  "curated-social-media-campaign-set": {
    "[BRAND NAME]": "Lumière",
  },
  "curated-cinematic-ensemble-poster": {
    "[MOVIE/SHOW TITLE]": "The Heist",
    "[CITY]": "Paris",
    "[LANDMARK]": "Eiffel Tower",
  },
  // ─── Batch 5 placeholder fills ──────────────────────────────────────────────
  "curated-business-leader-ink-portrait": {
    "[TYPE HERE]": "VISIONARY",
  },
  "curated-life-path-decoder": {
    "[insert date]": "August 26",
  },
  "curated-soul-purpose-discoverer": {
    "[insert date]": "August 26",
  },
  "curated-career-destiny-detector": {
    "[insert date]": "August 26",
  },
  "curated-relationship-destiny-map": {
    "[insert date]": "August 26",
  },
  "curated-wealth-abundance-code": {
    "[insert date]": "August 26",
  },
  "curated-future-timeline-guide": {
    "[insert date]": "August 26",
  },
  "curated-celebrity-real-life": {
    "[celebrity 1]": "three famous comedians",
    "[celebrity 2]": "",
    "[celebrity 3]": "",
  },
  "curated-lol-midlane": {
    "[character A]": "a wizard",
    "[character B]": "a knight",
  },
  "curated-1980s-propaganda": {
    "[person 1]": "three tech leaders",
    "[person 2]": "the middle one",
    "[person 3]": "",
  },
  // ─── Batch 6 placeholder fills ──────────────────────────────────────────────
  "curated-blueprint-landmark-infographic": {
    "[LANDMARK]": "the Colosseum in Rome",
  },
  "curated-expressive-motion-study": {
    "[SUBJECT]": "A ballet dancer mid-leap",
    "[COLOR1]": "crimson red",
    "[COLOR2]": "deep teal",
  },
  "curated-anime-streetwear-poster-system": {
    "{character_name}": "Gojo Satoru",
    "{franchise}": "Jujutsu Kaisen",
    "{aspect_ratio}": "3:4",
  },
  "curated-architectural-minimalist-poster": {
    "[Building Name]": "the Guggenheim Museum Bilbao",
  },
  "curated-historical-illustrated-poster": {
    "[HISTORICAL EVENT]": "Napoleon's March on Moscow, 1812",
    "[battle / march / revolution / turning point]": "the Grande Armée crossing the Neman River",
    "[EVENT TITLE]": "THE RUSSIAN CAMPAIGN",
    "[SUBTITLE + DATE]": "Napoleon's Grande Armée — June 1812",
  },
  "curated-national-identity-poster": {
    "[COUNTRY]": "Japan",
  },
  "curated-anime-character-poster": {
    "{character_name}": "Levi Ackerman",
    "{franchise}": "Attack on Titan",
    "{aspect_ratio}": "3:4",
  },
  "curated-encyclopedia-infographic": {
    "{ TOPIC }": "Honeybees",
  },
  "curated-recipe-infographic": {
    "[FOOD/DISH]": "Margherita Pizza",
  },
  "curated-cake-infographic": {
    "[WRITE YOUR COUNTRY]": "France",
    "[WRITE CAKE 1]": "Mille-Feuille",
    "[WRITE CAKE 2]": "Paris-Brest",
    "[WRITE CAKE 3]": "Tarte Tatin",
    "[WRITE CAKE 4]": "Opéra Cake",
    "[WRITE CAKE 5]": "Saint-Honoré",
    "[WRITE CAKE 6]": "Fraisier",
    "[OPTIONAL MORE…]": "",
  },
  "curated-brand-moodboard-system": {
    "[BRAND NAME]": "Patagonia",
  },
  "curated-notion-style-illustration": {
    "[subject]": "young woman",
    "[outfit]": "oversized sweater and jeans",
    "[doing action]": "reading a book at a café",
    "[facial expression]": "calm and content",
  },
  // ─── Batch 7 placeholder fills ──────────────────────────────────────────────
  "curated-wooden-automaton-portrait": {
    "[subject]": "a Victorian clockmaker",
    "[cherry]": "cherry",
    "[walnut]": "walnut",
    "[pine]": "pine",
    "[warm amber]": "warm amber",
  },
  "curated-person-legacy-infographic": {
    "[Person's Name]": "Leonardo da Vinci",
  },
  "curated-paper-cut-layered-art": {
    "[subject]": "a Japanese pagoda garden",
    "[color1]": "coral red",
    "[color2]": "sage green",
  },
  "curated-social-media-blueprint-poster": {
    "[APP/PLATFORM NAME]": "Instagram",
    "[BACKGROUND STYLE]": "dark matte black",
    "[COLOR PALETTE]": "gradient pink-to-purple",
    "[METRIC TYPE]": "engagement",
  },
  "curated-dark-mode-sports-brand-board": {},
  "curated-luxury-fashion-brand-board": {},
  "curated-character-double-exposure-poster": {
    "[XXX]": "a powerful samurai warrior",
  },
  "curated-anime-streetwear-character-poster": {
    "{character_name}": "Tanjiro Kamado",
    "{franchise}": "Demon Slayer",
  },
  "curated-minimalist-city-line-art-poster": {
    "[CITY NAME]": "Tokyo",
  },
  "curated-flat-vector-travel-poster": {
    "[DESTINATION]": "Santorini",
    "[COUNTRY]": "Greece",
  },
  "curated-mid-century-3-color-poster": {
    "[CITY NAME]": "Kyoto",
    "[LANDMARK]": "Kinkaku-ji Temple",
    "[COLOR]": "vermillion red",
  },
  "curated-line-art-city-travel-poster": {
    "[CITY NAME]": "Paris",
  },
  "curated-vehicle-engineering-infographic": {
    "{VEHICLE_NAME}": "Boeing 747-400",
  },
  "curated-designer-grade-poster-layout": {},
  "curated-luxury-magazine-cover-closeup": {},
  "curated-anime-character-design-sheet-template": {
    "Enter here": "Medieval fantasy kingdom with a magic-tech hybrid civilization",
  },
  "curated-minimalist-cartoon-character-sheet": {
    "[accent color]": "electric blue",
    "[character description]": "a cheerful robot companion with antenna ears",
    "[clothing style]": "minimal futuristic jumpsuit",
    "[pose 1]": "waving hello",
    "[pose 2]": "running",
    "[pose 3]": "thinking with hand on chin",
    "[pose 4]": "surprised",
    "[pose 5]": "laughing",
    "[pose 6]": "sleeping",
  },
  "curated-luxury-watch-cinematic-product": {
    "TYPE HERE THE WATCH NAME": "Richard Mille RM 56-02 Sapphire",
    "TYPE HERE THE COLOR EDITION": "Transparent sapphire crystal edition with midnight blue accents.",
  },
  "curated-fantasy-couture-character-magazine": {
    "{character_name}": "Sailor Moon",
    "{franchise}": "Pretty Guardian Sailor Moon",
  },
  "curated-anime-character-worldview-archive": {
    "【Character Name】": "Uzumaki Naruto",
    "【Work Name】": "Naruto",
    "【Protagonist / Antagonist / Mentor / Warrior / Mage / Ninja / Survey Corps Captain / Jujutsu Sorcerer / Elven Sorcerer, etc.】": "Ninja / Jinchūriki",
    "【Must accurately display the character's full Chinese name, e.g., Uzumaki Naruto】": "漩涡鸣人",
    "【Can include character title / short slogan / character role】": "The Seventh Hokage",
    "【3:4 Portrait】": "3:4 Portrait",
    "【Such as black-orange, black-blue, black-red, silver-blue, black-white-gray, etc.】": "black-orange",
    "【Such as flame orange, electric blue, crimson, gold, cold white light, etc.】": "flame orange",
    "【Such as Rasengan, Nine-Tails Power, Infinite Void, Omni-Directional Mobility Gear, Ancient Magic, etc.】": "Rasengan, Nine-Tails Chakra Mode",
    "【Such as fox silhouette, flames, mechanical devices, starry magic circle, blue energy, ruined tower, etc.】": "fox silhouette, flames, ninja scrolls",
    "【Character's Full Chinese Name】": "漩涡鸣人",
  },
  "curated-dark-tide-ensemble-cover": {
    "[Theme: Character Names]": "Jujutsu Kaisen Sorcerers",
    "[Theme, e.g., Jujutsu Battle / Dark Journey to the West / Cyber Hunter / Classic of Mountains and Seas Demon Hunters / Doomsday Survivors / Magic Academy Battle Squad]": "Jujutsu Battle",
    "[Work Title]": "Jujutsu Kaisen",
    "[Brand Name or Series Name]": "CURSED CHRONICLES",
    "[Subtitle]": "The Shibuya Incident",
    "[Style Direction, e.g., dark fantasy, retro comic cover, hand-drawn thick impasto, fantasy novel cover, game key visual]": "dark fantasy",
    "[Main Color Scheme, e.g., ink green-black-gray / deep blue neon / dark brown-gold-red / sand yellow-rust / deep purple-gold]": "deep blue neon",
    "[Accent Color, e.g., blood-red energy, cyan-green spell light, golden divine glow, blue lightning]": "blue lightning",
    "[Aspect Ratio, e.g., 2:3 portrait / 3:4 portrait / 4:5 portrait / 9:16 portrait]": "3:4 portrait",
  },
  "curated-3d-historical-figure-biography-poster": {
    "[Character Name]": "Zhuge Liang",
    "[Emperor / Famous General / Famous Minister / Thinker / Literary Figure / Reformer / Military Strategist, etc.]": "Military Strategist / Prime Minister",
    "[Dynasty / Historical Period]": "Three Kingdoms Period",
    "[Unification / Reforms / Loyalty and Righteousness / Unity of Knowledge and Action / Northern Expedition / Institutions / School of Mind / Golden Age, etc.]": "Northern Expedition / Loyalty and Righteousness",
    "[Mystical Black Gold Red / Azure Blue Gray Gold / Dark Red Ink Gold / Iron Armor Deep Blue, etc.]": "Azure Blue Gray Gold",
  },
  "curated-gojo-streetwear-anime-poster": {
    "{character_name: Satoru Gojo}": "Satoru Gojo",
    "{franchise: Jujutsu Kaisen}": "Jujutsu Kaisen",
  },
};

// ─── Full prompt overrides (copyright-sensitive or brand-heavy prompts) ──────
const PROMPT_OVERRIDES = {
  "curated-luxury-perfume-ad":
    "Ultra-luxury perfume advertisement, cinematic studio lighting, deep red monochrome aesthetic. A beautiful elegant East Asian woman with smooth glowing skin and soft makeup, loose wavy brown hair, wearing a red silky satin shirt. She is holding a luxury perfume bottle close to her face. Bottle is crystal clear with soft pink liquid, reflective glass, metallic cap. Close-up portrait, chest-up framing. Background: rich deep red silk fabric waves. Dark marble table, red roses, petals scattered, glass candle with warm flame. Style: ultra realistic, 8k, fashion photography, luxury branding, glossy finish, cinematic, shallow depth of field.",
  "curated-zine-food-infographic":
    "A vibrant, colorful 3-page zine-style infographic about fried chicken. Style: mixed media collage combining realistic crispy fried chicken photography, bold graphic elements, halftone textures, retro ads, doodles, stickers, and playful handwritten typography. Red, white, and golden tones. Three vertical panels side-by-side. Left panel: bold title, hero image of golden fried chicken. Center panel: step-by-step recipe visuals with arrows. Right panel: variations and fun facts. Hand-drawn arrows, stars, flames, retro stickers, paper textures, slight grunge. Wide horizontal aspect ratio.",
  "curated-naruto-propaganda-poster":
    "An iconic propaganda-style anime poster. Top section: large silhouette of a ninja character's head with spiky hair, mask-like framing as dominant focal point. Bottom section: full-body ninja in orange outfit in stable stance. Visual style: double exposure, narrative collage, layered visual storytelling. Background: cloud textures, ink wash effects, white negative space. Collage elements: action micro-scenes, symbolic objects. Aesthetic: poetic Eastern tone, ink diffusion edges, pop vibrant striking contrast colors. A4 vertical poster. Strong visual hierarchy, narrative depth through layering.",
  "curated-gameboy-exploded-view":
    "Exploded view of a handheld retro gaming console, with a vintage, sepia-toned filter, components appearing aged and slightly worn, set against a backdrop of old blueprints, nostalgic feel, retro illustration. Show buttons, screen, circuit board, battery compartment, speaker, and case shell separated in 3D space.",
  "curated-brand-identity-system":
    "A complete brand identity system poster for a modern creative agency. Vertical 4:5 layout, multi-column grid. Sections include: brand header with commanding typography, color system with labeled swatches and hex codes, typography hierarchy examples, visual language mood board tiles, brand application mockups (business card, website, packaging, social media), design system components (buttons, cards, inputs), and iconography set. Premium Behance-style presentation, dense but clean layout, professional design portfolio aesthetic.",
  "curated-scientific-research-infographic":
    "A high-end corporate-style scientific infographic poster (portrait, A1). Warm beige background (#F4F1EC). Editorial report style with 2-3 column grid. Header with bold title and 'THE QUESTION / THE ANSWER' top-right. Sections: framework overview, core insight with large dominant stat number, mechanism diagram with connected blocks, horizontal bar charts with soft cyan highlights and direct labeling, supporting insights, footer with citation. Typography: large numbers, uppercase section headers, minimal body text. Colors: beige, soft cyan (#73C8E0), black, beige-gray. Clean, balanced density, corporate research report aesthetic.",
  "curated-isometric-movie-diorama":
    "Present a clear, 45-degree top-down isometric miniature 3D cartoon scene of a space station interior with floating astronauts, with soft refined textures, realistic PBR materials, and gentle lifelike lighting. Create a small raised diorama-style base that includes recognizable space station elements (control panels, windows with stars visible, floating objects), along with tiny stylized astronaut characters (no facial details). Use a clean solid dark charcoal background. At the top-center, display title text in large bold text. Composition: perfectly centered layout, square 1080x1080, ultra-clean, high-clarity diorama aesthetic.",
  "curated-time-magazine-cover":
    "A highly detailed realistic photograph of a TIME magazine cover, red border, white background. Top right corner text reads 'APRIL 29 / MAY 6, 2024'. Large bold text at the top: 'THE MOST INFLUENTIAL COMPANIES' above big red 'TIME' and black '100'. Main subject is a close-up portrait of an elegant young woman with sleek dark brown hair parted in the middle and pulled back into a tight low bun, flawless glowing skin, subtle makeup with glossy nude lips and defined eyebrows. She is looking slightly to the left with a confident expression. A large glossy deep red Anthurium flower is positioned near her neck and shoulder. She is wearing a white feathery fluffy garment. On the left side in bold text: 'HOW SHE BUILT HER EMPIRE'. Below it a vertical list of company names: APPLE, NVIDIA, MICROSOFT, AMAZON, TIKTOK, DISNEY, NETFLIX, UNITEDHEALTH + 90 MORE. Bottom right corner has 'http://time.com'. Professional studio lighting, clean editorial style, high resolution, sharp details, iconic TIME magazine cover composition.",
  "curated-luxury-skincare-ad":
    "Create a high-end luxury skincare advertisement. A young woman with radiant, glassy, and naturally glowing skin with soft highlights is holding a premium vitamin C face serum bottle close to her cheek. Only use the bottle, no box. Background should be elegant silky satin fabric (Dior-style) with smooth folds, in a rich champagne-olive tone, softly lit with golden highlights and gentle shadows to create depth and luxury. Outfit should be a silky satin dress matching the background tones, slightly reflective, premium fabric texture. Lighting: soft diffused front light + subtle golden rim light on hair + gentle glow on skin. DSLR quality, shallow depth of field. Add minimal premium typography on the left side: '10% Vitamin C' (large, elegant serif), 'Face Serum' (smaller), 'Triple Glow +++' (refined thin style). Add 3-4 minimal benefit points with small luxury icons. Text and icons in subtle gold/cream tone. Composition: clean, balanced, cinematic, ultra-realistic, premium skincare ad.",
  // ─── Batch 6 overrides (IP/brand-heavy prompts) ─────────────────────────────
  "curated-luxury-beauty-campaign-grid":
    "Ultra-realistic luxury beauty campaign, cinematic 6-image grid system (3x2), high-end cosmetic editorial. Campaign title: GLAZED DESIRE. All 6 frames feature the same luxury lip gloss product — transparent glossy pink lip oil, silver chrome cap, consistent across all frames. Grid rhythm: TOP ROW: model close-up → macro lip detail → product hero shot. BOTTOM ROW: texture close-up → model portrait → lip detail. Soft blush pink, milky nude, pearl white palette. Soft luxury daylight studio lighting, 85mm beauty lens, shallow depth of field. Female beauty model with hydrated glowing skin, minimal makeup. Ultra-realistic wet gloss textures, visible lip texture, realistic skin pores. Minimal pink-white studio background. Premium editorial beauty photography aesthetic.",
  "curated-naruto-propaganda-poster":
    "Ultra-premium propaganda poster, A4 vertical composition, anime ninja hero theme. Top section: large iconic silhouette of a ninja hero with spiky hair, headband, determined eyes. Inside silhouette: double exposure narrative collage with warm-to-cool gradient (orange, red, deep blue), layered action scenes, village skyline, energy patterns, symbolic scrolls and wind. Bottom section: full-body ninja in orange cloak, forward-leaning stance, forming an energy sphere. Vertical energy stream connecting both sections. Left: faint ally silhouettes. Right: abstract enemy presence. Eastern ink-wash + modern anime fusion style. Glowing oranges, electric blues, deep blacks, gold highlights. Epic cinematic layered storytelling poster.",
  "curated-rengoku-anime-poster":
    "Masterpiece anime character poster, cinematic side-profile portrait, elegant vertical Japanese poster design. Character facing left in calm heroic pose, sharp golden-orange eyes, thick flame-shaped eyebrows, long layered hair flowing with fiery yellow, orange, and crimson red flame tips. Wearing a detailed black uniform with white cape with flame-pattern edges, katana at waist. Warm golden cinematic lighting, minimal clean warm ivory background. Typography: large bold serif text in deep burnt red, Japanese kanji, small poetic text blocks. Watercolor-anime hybrid painting style, ultra detailed brushwork, soft paper grain texture, 8k masterpiece quality. Close-up side profile, chest-up framing.",
  "curated-food-brand-identity-poster":
    "Premium vertical 4:5 brand identity system poster for a Japanese food brand, featuring clean modern Japanese editorial layout with elegant typography, warm cinematic restaurant lighting, soy sauce textures, ramen steam, ceramic bowls, noodles, and wooden chopsticks. Brand header with tagline and descriptors Authentic / Warm / Iconic. Sophisticated color palette of soy sauce brown, cream white, warm red, noodle yellow, charcoal black displayed as modern swatches with HEX codes. Japanese-inspired typography, cinematic ramen photography, glossy gradients, culinary mood-board visuals. Brand applications: soy sauce bottle, noodle cup, website hero, mobile food app UI, social media posts, restaurant billboard. Japanese-style UI design system with food-themed icons.",
  "curated-breaking-bad-grid":
    "High-contrast cinematic graphic design poster, 2x6 vertical grid of twelve distinct title-card panels showcasing gritty crime drama characters. Urban Grunge aesthetic, distressed textures, film grain, bold typography masking effects. Each panel features a massive extra-bold sans-serif name (WALT, JESSE, SAUL, GUS, MIKE, HANK, etc.) with character portrait visible only inside the filled letterforms using clipping/masking effect. Smaller credit text like AS THE CHEMIST, THE LAWYER, THE FIXER. Gritty realistic portraits, high-contrast dramatic lighting with green chemical glow, neon cyan, magenta accents. Weathered concrete, rusted metal backgrounds. Heavy ink splatters, paint drips, scan lines, grain. Dark green, toxic lime, monochrome grey, charcoal palette.",
  "curated-solo-leveling-poster":
    "Promotional anime poster, vertical 4:5 composition (1080x1350). Hierarchy structure: top section features a very large head with shadowed face silhouette, glowing blue-violet eyes, dark hair, forming a strong instantly recognizable iconic silhouette. Dark atmospheric background with purple energy wisps. Bottom section shows smaller full-body figure in dark armor. Cinematic anime style, dark color palette with electric blue and violet accents.",
  "curated-bts-brand-identity":
    "Premium brand identity system poster for a global music group. Vertical 4:5 format. Soft lavender to deep purple gradient background. Multi-layered grid, dense and clean. Violet rule lines. Brand statement at top. Identity descriptors: ARTISTIC / EMOTIONAL / GLOBAL. Colors: Royal Purple #5A2D82, Deep Violet #6A0DAD, Lavender #C8A2C8, White, Soft Lilac, Silver Gray. Large color blocks with HEX codes. Display headline in white. Purple sans-serif subhead. 4-level typography hierarchy. Applications: album cover mockup, website hero with purple CTA, mobile music player UI, social posts, concert billboard. 8 line icons in purple 1.5px strokes: music note, lightstick, heart, globe, stage, mic, star, wings. Patterns: gradient waves, geometric tiling. Glassmorphism panels, subtle grain. Agency-quality poster.",
  "curated-gohan-beast-poster":
    "Ultra-detailed anime illustration of a powerful male warrior in beast transformation, standing in dominant full-body pose, low-angle cinematic perspective, muscular physique, torn purple gi outfit with red sash, glowing red eyes, sharp facial features with battle damage, extremely spiky silver hair, intense aura of purple energy flames, floating debris and particles. Background: large circular arcane energy ring with glowing symbols centered behind character like a halo, bright violet light rays, lightning streaks. Anime + semi-realistic fusion style, cinematic lighting, high contrast, volumetric glow, 8K resolution, perfectly centered poster composition.",
  "curated-intimate-pov-portrait":
    "Hyper-realistic photography, 8K ultra-HD, top-down first-person perspective portrait. A young Chinese woman lying on a wooden floor, black messy hair with strands across her face, expressive dark eyes gazing up toward the camera, wearing an ornate red velvet off-the-shoulder traditional garment with golden shoulder ornaments and golden hoop earrings. Soft warm low-light atmosphere, shallow depth of field, blurred background, soft shadows. Cinematic portrait, realistic skin textures, editorial fashion photography style.",
  "curated-tropical-beach-portrait":
    "A young Indian woman with long voluminous wavy brown hair with caramel highlights, hair dramatically blowing in the wind. She is standing on a tropical beach, turning slightly to the side while looking over her shoulder with a confident expression. She wears a sage green summer outfit with white trim details and an oversized white linen shirt draped loosely over her shoulders. Turquoise ocean water and white sand in the background, tropical palm trees, cloudy overcast sky. Windy atmosphere, natural soft daylight, realistic skin texture, cinematic composition, high resolution, 8k fashion photography style.",
  // ─── Batch 6b overrides ───────────────────────────────────────────────────
  "curated-mirror-selfie-evening-gown":
    "An elegant woman sitting on a velvet ottoman in front of an ornate gold-framed mirror, taking a refined mirror selfie. She wears a deep red high-slit evening gown with silky fabric pooling around her. Soft morning light filters through sheer curtains, casting a dreamy glow over the minimalist modern bedroom. A cup of coffee sits beside her on the wooden floor. Her hand elegantly holds her phone, dark eyes locked onto the reflection with quiet confidence. Cinematic portrait, editorial fashion photography, 8K, shallow depth of field.",
  "curated-luxury-bathroom-fashion":
    "A beautiful Indian woman with medium-tan skin, sharp attractive face, full lips with red lipstick, defined eyebrows, confident expression, dark brown hair with soft waves falling over her shoulders, standing in a luxurious modern bathroom. She wears a white satin slip dress with thin spaghetti straps and ruched detailing. One hand resting on her hip. Slightly angled body, looking at viewer with head tilted. Background: glass shower cabin with chrome fixtures, white marble walls with subtle gray veins, bright soft lighting with ceiling spotlights. Photorealistic, 8K, sharp focus, cinematic lighting, luxury fashion editorial.",
  // ─── Batch 7 overrides (IP/brand-heavy prompts) ─────────────────────────────
  "curated-naruto-will-of-fire-propaganda": "Ultra-premium propaganda-style anime poster, A4 vertical. Ninja hero with spiky blond hair, headband, battle-worn orange cloak flowing in wind. Low-angle cinematic perspective, one hand forming energy sphere (blue glow), other hand tightening headband. Expression: intense determination, glowing chakra eyes. Background: destroyed village battlefield, crumbling mountain monument, burning debris, torn banners, smoke-filled skyline, massive clouds opening. Behind character: gigantic faded nine-tailed fox spirit silhouette emerging from smoke. Typography: 'THE WILL OF FIRE' large distressed text, 'FROM OUTCAST TO LEGEND' secondary tagline. Style: Japanese propaganda poster × premium anime key art, deep crimson, burnt orange, parchment beige, chakra blue. Halftone textures, vintage paper grain, ink-brush strokes, manga impact lines. Museum-grade collector poster aesthetic, 8K.",
  "curated-titan-female-warrior-poster": "Ultra-realistic cinematic anime movie poster, vertical composition. Female warrior with short black hair, red scarf flowing in wind, dual swords, ODM gear flying across ruined city. Colossal titan silhouette emerging through smoke in background. Elegant double exposure layout with large emotional side-profile portrait. Atmospheric destruction, ash particles, storm clouds, cinematic soft lighting, muted gray and sepia tones. Highly detailed skin and fabric textures, realistic leather combat uniform, dynamic action scene, photorealistic anime adaptation, dramatic depth, 8K.",
  "curated-titan-warrior-dark-fantasy-poster": "Ultra-realistic dark fantasy anime poster, post-apocalyptic theme. Fierce young warrior with messy black hair, intense green eyes, dual blades and vertical maneuvering gear. Dynamic action pose lunging toward camera. Massive colossal giants emerging through storm clouds behind destroyed walls. Double exposure with giant side-profile face blended into battlefield. Cinematic lightning, smoke, ash, burning city ruins, dramatic volumetric fog. Gritty textures, rain-soaked skin, emotional rage expression, moody monochrome tones with orange embers, IMAX movie poster style, 8K.",
  "curated-anime-crossover-warriors-battle": "Full-body high-impact anime illustration featuring three powerful warriors on a shattered rock platform, combining intense detailed shonen action style. Center: Super Saiyan Blue warrior with spiky blue hair, glowing red eyes, shredded blue gi, magical blue sigil and lightning. Left: explosive hero in orange-black-green suit, crouching with explosive orange effects. Right: ascended warrior with massive silver hair, purple gi, green alchemical circle aura. Cosmic energy, floating debris, dark power-charged sky.",
  "curated-gojo-streetwear-anime-poster": "Stylized anime character poster, vertical 4:5 composition. Confident male figure with white spiky hair, blindfold/eye covering, slight smirk. Modern streetwear: oversized black tactical coat, layered hoodie, slim cargo pants, silver accessories, futuristic sneakers. Clean white background, electric blue energy accents, abstract geometric poster layout. Sharp directional lighting, crisp shadows, glowing blue energy around hands. Anime × streetwear × graphic poster hybrid, clean lineart, semi-flat shading, ultra-clean vector style, 4K.",
  "curated-solo-leveling-shadow-monarch-poster": "Ultra cinematic anime promotional poster, vertical 4:5 format (1080x1350). Upper section: enormous shadow-covered warrior face emerging from darkness, glowing electric purple eyes, sharp anime features, shadow soldiers behind like supernatural army. Middle section: main character standing on ruined battlefield in long black trench coat with glowing blue runes, dual daggers emitting neon energy. Dynamic particles, floating debris, lightning streaks. Bottom: typography space with cinematic fog, cracked ground, glowing embers. Premium anime movie poster mixed with luxury gaming ad. Deep blacks, neon blue and purple highlights, 8K.",
  "curated-anime-double-exposure-propaganda": "Propaganda poster themed around a powerful green-haired swordsman. Top half: large silhouette of character's head with bandana and earrings as iconic visual. Middle to bottom: full-body character holding three swords in stable pose. Double exposure and narrative collage with layered scenes, ink splatter, and white negative space. Supporting elements on left and right for narrative tension. Vertical flowing visual line connecting all elements. Large amounts of negative space, ink diffusion edges, Eastern aesthetic balance. Pop and striking green, black, and gold colors. A4 format, premium refined cinematic poster.",
  "curated-demon-empress-watercolor-fantasy": "Epic dark-fantasy anime poster, ultra-detailed watercolor and ink-splatter style. Massive vertical composition: graceful side-profile of mesmerizing woman with porcelain skin, long moonlit lavender hair, glowing ruby eyes, subtle dangerous smile. Obsidian-and-crimson horns, gigantic shadowy bat wings. Within silhouette: layered double-exposure — amethyst crystal caves, enchanted forests, floating temples, celestial rivers, astral nebula. Lower center: full-body demon empress in black-and-ruby battle attire, enormous crimson wings expanded. Swirling pink, magenta, violet magical flames. Watercolor textures, ink wash, cosmic galaxy effects. Deep purples, crimson, magenta, rich black. Typography top-left: bold brush calligraphy title. 8K resolution.",
  "curated-fmcg-billboard-ramen": "Hyper-realistic cinematic FMCG billboard poster, warmth and richness theme. Scene: slow-motion pour of noodles into deep bowl, broth splashing gently, vegetables and herbs visible. Product: noodle pack upright behind, open pack with noodles exposed. Environment: dark minimal kitchen with warm backlight, steam blending into atmosphere. Centered calm composition. Typography: center massive 'RICH IN EVERY BITE', background faint 'SLOW / WARM / DEEP / SATISFY', 'REAL FLAVOUR. REAL COMFORT.' Warm cinematic light, cream-brown-gold palette, steam and soft haze, comforting mood.",
  "curated-fmcg-billboard-noodles-spicy": "Hyper-realistic cinematic FMCG billboard poster, street-style bold flavor theme. Scene: noodles tossed mid-air in wok flame, fire burst illuminating strands, aggressive motion. Dark street kitchen setting with fire glow and smoke. Diagonal explosive composition, strong contrast. Typography: center massive 'DESI CHINESE FIRE', background faint 'SPICE / HEAT / WOK / POWER', 'TURN UP THE FLAVOUR.' Strong orange fire light + deep shadows, red-orange-black palette, smoke and sparks, bold high-energy mood.",
  "curated-fmcg-billboard-maggi": "Hyper-realistic cinematic FMCG billboard poster, craving and comfort theme. Scene: steaming bowl of freshly cooked noodles on wet roadside stall counter at sunrise, noodles lifted mid-air with fork, strands stretching, steam rising. Empty early morning street food setting, wet ground reflecting light. Low angle shot, strong diagonal movement. Typography: center massive '2 MINUTE MAGIC', background faint 'HOT / FAST / TASTY / AGAIN', 'NO WAIT. JUST CRAVE.' Warm sunrise backlight, golden glow through steam, yellow-golden-black palette, addictive energetic mood. 4:5 portrait.",
  "curated-fmcg-billboard-yippee": "Hyper-realistic cinematic FMCG billboard poster, fun chaos theme. Scene: noodles exploding mid-air in twisting motion above bowl, strands flying with sauce droplets and masala particles frozen in motion. Dark playful background with yellow-red color streaks, wet reflective base. Dynamic center burst, radial energy. Typography: center massive 'FULL ON MASTI', background faint 'TWIST / SLURP / SPIN / REPEAT', 'NO BORING BITES.' High contrast warm lighting, yellow-red-black palette, spice particles and motion blur, playful energetic mood.",
  "curated-miniature-world-jewelry-ad": "Hyper-detailed luxury advertising poster in cinematic miniature-world style. Gigantic royal diamond necklace with intricate gold filigree and massive ruby gemstones standing as architectural monument. Futuristic miniature city built around and inside the jewelry: skyscrapers, elevated highways, bridges, spiral staircases, tiny human figures, luxury billboards, drones, helicopters. Deep crimson red monochrome background with gold and ruby accents. Typography: 'EMBRACE THE EXTRAORDINARY'. Ultra realistic textures, tilt-shift miniature effect, 8K.",
  "curated-miniature-world-burger-ad": "Cinematic fast-food advertising poster. Gigantic double cheeseburger transformed into futuristic urban landmark towering above miniature city. Spiral staircases, observation decks, walkways, tiny people, helicopters, drones, busy streets. Ultra realistic burger with juicy patties, melted cheese, lettuce, sesame buns. Bold vibrant red background with golden accents. Dramatic commercial lighting, tilt-shift miniature photography, typography: 'GIGANTIC FLAVOR. NOW WITHIN REACH.' Ultra realistic 3D render, 8K.",
  "curated-miniature-world-chicken-ad": "Surreal advertising campaign poster. Enormous crispy fried chicken drumstick as monumental skyscraper in miniature futuristic city. Golden crunchy textures, spiral staircases, glass walkways, platforms, drones, helicopters, tiny crowds, delivery trucks. Vivid red monochromatic background, cinematic lighting. Typography: 'THE TASTE THAT RULED THE WORLD'. Tilt-shift depth of field, glossy textures, premium 3D rendering, 8K.",
  "curated-miniature-world-iphone-ad": "Futuristic tech advertising poster. Gigantic orange smartphone standing vertically as iconic skyscraper in miniature smart city. Elevated bridges, spiral staircases, floating walkways, tiny human figures, drones, helicopters, modern buildings with glowing branding. Vibrant monochromatic orange background, premium minimalist aesthetics, cinematic studio lighting. Ultra-realistic metallic edges, glossy reflections, elegant industrial design.",
  "curated-dunk-king-sneaker-campaign": "Hype sneaker advertisement poster. Young Black male basketball player frozen in powerful mid-air dunk pose beside gigantic orange-and-black basketball shoe nearly three times his height, 'DUNK KING' written across sole. Dramatic stadium court light beams, dark basketball arena, blurred cheering crowd. Massive bold orange typography 'DUNK KING' in background. Tagline: 'Rise above the rest.' Photorealistic, ultra-detailed, high-energy sports campaign aesthetic, cinematic lighting, 8K.",
  "curated-pirate-empress-character-sheet": "Professional anime character design sheet of a regal dark-haired empress inspired by classic pirate fantasy aesthetics. Clean manga-style reference board. Multiple elegant full-body poses: front view, back view, confident standing, graceful walking, side profile, crossed-arm royal pose, dramatic cape-flowing pose. Long silky black hair, refined features, gold earrings, luxurious crimson slit dress with intricate embroidery, high heels, white royal cape. Detailed costume close-ups, fabric texture notes, color palette, height markings, Japanese annotation labels. High-detail anime rendering, polished linework, 4K.",
  "curated-succubus-queen-character-sheet": "Professional anime-style character turnaround sheet. Dark fantasy succubus queen: long crimson hair, black horns, glowing red eyes, elegant gothic gown with gold embroidery. Poses: front standing, rear, seated, kneeling, dramatic low-angle. Close-up face study, wing detail section, jewelry accessories, color palette bar. White paper manga reference layout with Japanese annotations and measurement guides. Detailed shading, fantasy elegance, studio-quality character design sheet.",
};

// ─── Prompts to skip (need input image) ─────────────────────────────────────
const SKIP_IDS = new Set([
  "curated-season-swap",
  "curated-time-period-shift",
  "curated-weather-overlay-rain",
  "curated-remove-replace-background",
  "curated-color-grade-shift-portra",
  "curated-ms-paint-transformation",
  "curated-mixed-reality-comic-overlay",
  "curated-age-progression-portrait",
  "curated-miniature-tilt-shift",
  "curated-sketch-to-render",
  "curated-add-text-overlay",
  "curated-portrait-relight",
  "curated-object-removal-clean",
  "curated-floor-plan-3d-render",
  "example-edit-background",
  "example-edit-removal",
  "example-edit-outfit",
  "example-edit-restyle",
  "curated-song-dynasty-feed",
  "curated-meme-template-keep-original",
  // ─── Batch 2 skips (image-edit or text-only frameworks) ─────────────────
  "curated-chibi-clone-handaccount",
  "curated-dtc-brand-style-guide",
  "curated-scrapbook-photo-enhancement",
  "curated-forbes-magazine-cover",
  "curated-facial-aesthetics-report",
  "curated-japanese-magazine-annotations",
  "curated-logo-concept-generator",
  "curated-brand-identity-foundation",
  "curated-color-palette-framework",
  "curated-typography-framework",
  "curated-complete-brand-package",
  // ─── Batch 3 skips (image-edit — need input photo) ─────────────────────
  "curated-date-night-series",
  "curated-pinterest-doodle-aesthetic",
  "curated-food-doodle-fusion",
  "curated-designers-mind-illustration",
  "curated-botanical-painting-conversion",
  // ─── Batch 4 skips (image-edit — need input photo) ─────────────────────
  "curated-iridology-chart",
  "curated-face-feature-analysis",
  "curated-spectacles-guide",
  "curated-scrapbook-aesthetic-transform",
  "curated-rinpa-style-art",
  // ─── Batch 5 skips (image-edit or need input image) ───────────────────
  "curated-anime-pop-art-conversion",
  "curated-doodle-chibi-aesthetic",
  "curated-netflix-homepage-hero",
  "curated-character-breakdown-knolling",
  // ─── Batch 6 skips (image-edit or need input image) ───────────────────
  "curated-dual-split-techwear",
  "curated-doodle-overlay-cartoon",
  "curated-fantasy-popup-book",
  "curated-double-exposure-travel",
  // ─── Batch 7 skips (image-edit or need input image) ───────────────────
  "curated-wireframe-conversion",
  "curated-folk-art-reimagine",
  "curated-trending-anime-style-edit",
  "curated-manga-page-from-photo",
  "curated-colored-manga-page-female",
  "curated-gta-vi-portrait-poster",
  "curated-paper-craft-style-recreation",
  "curated-urban-fashion-editorial-collage",
  "curated-japanese-negative-film-portrait",
  "curated-ming-dynasty-godslayer-fashion",
  "curated-bedroom-selfie-smartphone-realism",
  "curated-freeform-fashion-lookbook-collage",
  "curated-y2k-cyberpunk-magazine-cover",
  "curated-ink-wash-ronin-duel",
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fillPlaceholders(id, prompt) {
  // Full override takes priority
  if (PROMPT_OVERRIDES[id]) return PROMPT_OVERRIDES[id];
  const fills = PLACEHOLDER_FILLS[id];
  if (!fills) return prompt;
  let result = prompt;
  for (const [placeholder, value] of Object.entries(fills)) {
    result = result.replaceAll(placeholder, value);
  }
  return result;
}

async function generateImage(prompt) {
  const response = await openai.images.generate({
    model: "gpt-image-2",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "medium",
  });
  // Response contains base64 or URL depending on response_format
  const image = response.data[0];
  if (image.b64_json) {
    return Buffer.from(image.b64_json, "base64");
  }
  // If URL, fetch it
  const res = await fetch(image.url);
  return Buffer.from(await res.arrayBuffer());
}

async function resizeToWebP(buffer) {
  return sharp(buffer).resize(400).webp({ quality: 80 }).toBuffer();
}

async function uploadToSupabase(id, webpBuffer) {
  const path = `${id}.webp`;
  const { error } = await supabase.storage
    .from("prompt-thumbnails")
    .upload(path, webpBuffer, {
      contentType: "image/webp",
      upsert: true,
    });
  if (error) throw new Error(`Upload failed for ${id}: ${error.message}`);

  const { data } = supabase.storage.from("prompt-thumbnails").getPublicUrl(path);
  return data.publicUrl;
}

async function updatePromptUrl(id, url) {
  const { error } = await supabase
    .from("curated_prompts")
    .update({ thumbnail_url: url })
    .eq("id", id);
  if (error) throw new Error(`DB update failed for ${id}: ${error.message}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const upload = args.includes("--upload");
  const singleIdIdx = args.indexOf("--id");
  const singleId = singleIdIdx !== -1 ? args[singleIdIdx + 1] : null;

  mkdirSync(OUT_DIR, { recursive: true });

  // Fetch all prompts
  const { data: prompts, error } = await supabase
    .from("curated_prompts")
    .select("id, title, category, prompt")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch prompts:", error.message);
    process.exit(1);
  }

  // Filter
  let toGenerate = prompts.filter((p) => !SKIP_IDS.has(p.id));
  if (singleId) {
    toGenerate = toGenerate.filter((p) => p.id === singleId);
    if (toGenerate.length === 0) {
      console.error(`Prompt "${singleId}" not found or is in skip list`);
      process.exit(1);
    }
  }

  // Skip already-generated (check local files)
  const pending = toGenerate.filter((p) => {
    const outPath = resolve(OUT_DIR, `${p.id}.webp`);
    return !existsSync(outPath);
  });

  console.log(`Total prompts: ${prompts.length}`);
  console.log(`Skipping (need input image): ${SKIP_IDS.size}`);
  console.log(`Eligible: ${toGenerate.length}`);
  console.log(`Already generated: ${toGenerate.length - pending.length}`);
  console.log(`To generate: ${pending.length}`);
  console.log();

  if (dryRun) {
    pending.forEach((p) => console.log(`  Would generate: ${p.id} — ${p.title}`));
    return;
  }

  if (pending.length === 0 && !upload) {
    console.log("Nothing to generate. All thumbnails exist locally.");
    if (!upload) console.log("Run with --upload to push to Supabase Storage.");
    return;
  }

  // Generate thumbnails
  let success = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const p = pending[i];
    const promptText = fillPlaceholders(p.id, p.prompt);
    const outPath = resolve(OUT_DIR, `${p.id}.webp`);

    process.stdout.write(
      `[${i + 1}/${pending.length}] ${p.title} (${p.id})... `
    );

    try {
      const raw = await generateImage(promptText);
      const webp = await resizeToWebP(raw);
      writeFileSync(outPath, webp);
      console.log(`OK (${(webp.length / 1024).toFixed(0)}KB)`);
      success++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      failed++;
    }

    // Rate limit: ~5 requests/min for image generation (be conservative)
    if (i < pending.length - 1) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log(`\nDone. Success: ${success}, Failed: ${failed}`);

  // Upload phase
  if (upload) {
    console.log("\n--- Uploading to Supabase Storage ---\n");
    const allEligible = toGenerate;
    let uploaded = 0;

    for (const p of allEligible) {
      const filePath = resolve(OUT_DIR, `${p.id}.webp`);
      if (!existsSync(filePath)) continue;

      process.stdout.write(`  Uploading ${p.id}... `);
      try {
        const buffer = readFileSync(filePath);
        const url = await uploadToSupabase(p.id, buffer);
        await updatePromptUrl(p.id, url);
        console.log("OK");
        uploaded++;
      } catch (err) {
        console.log(`FAILED: ${err.message}`);
      }
    }

    console.log(`\nUploaded: ${uploaded}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
