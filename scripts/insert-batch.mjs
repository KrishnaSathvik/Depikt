/**
 * insert-batch.mjs
 * Inserts new batch 5 prompts into Supabase curated_prompts table.
 * Usage: node scripts/insert-batch.mjs [--dry-run]
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Load .env
const envFile = readFileSync(resolve(ROOT, ".env"), "utf8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const eq = l.indexOf("=");
      return [l.slice(0, eq), l.slice(eq + 1).replace(/^["']|["']$/g, "")];
    }),
);

const supabase = createClient(
  env.SUPABASE_URL || env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

const dryRun = process.argv.includes("--dry-run");

// ─── Batch 5 prompts ──────────────────────────────────────────────────────────

const BATCH_5 = [
  {
    id: "curated-deconstructed-portrait-collage",
    title: "Deconstructed Multimedia Portrait Collage",
    category: "Cinematic",
    prompt:
      "A high-fashion cinematic portrait of a young woman with a thoughtful expression, looking slightly upward. The image is a deconstructed multimedia collage: her face is overlaid with faint, intricate architectural blueprints, geometric grid lines, and technical schematics. The composition features an explosive, splattered edge effect with charcoal and white paint strokes. Scattered hyper-realistic orange autumn maple leaves drift around her neck and hair. She wears a thick, textured brown knit scarf. High-contrast lighting, 8k resolution, ultra-sharp focus on the eyes, featuring hyper-realistic skin textures, muted earth-tone color palette with pops of vibrant orange, editorial photography style.",
    why_it_works:
      "Layering architectural blueprints and technical schematics over a portrait creates a unique mixed-media effect. The specific paint-splatter edge treatment, combined with hyper-realistic autumn leaves, gives the model clear textural contrasts to render. Earth tones with pops of orange provide a controlled color palette that feels cohesive.",
    source: "curated",
    tags: ["portrait", "collage", "mixed-media", "fashion", "editorial", "blueprint", "autumn"],
  },
  {
    id: "curated-choreography-sheet-infographic",
    title: "Street Dance Choreography Sheet",
    category: "Infographics",
    prompt:
      'A colored pencil sketch style choreography sheet infographic for an urban street dance solo performance.\n\nLayout: 16 steps arranged in a clean 4x4 grid, each panel showing a different breakdance-inspired move.\n\nSubject: a teenage Asian girl with long wavy hair, wearing effortless urban streetwear with stylish layered details (oversized washed black hoodie, loose cargo jogger pants, fitted inner top, chunky sneakers with muted grey, soft lavender, and faded blue accents, silver chain accessories, fingerless gloves).\n\nStyle: hand-drawn colored pencil illustration, soft shading, visible pencil texture, slightly sketchy but clean lines, muted urban tones blended with subtle pastel accents and dark outfit contrast.\n\nMovement: each frame shows dynamic breakdance motions and freestyle street dance energy (toprock, footwork, spins, freezes, slides, shoulder drops, groove transitions, power poses), with small arrows indicating movement direction, momentum, and flow.\n\nDesign: modern urban dance aesthetic, minimal and stylish infographic layout, subtle graffiti-inspired visual accents, step numbers (1\u201316), short captions under each frame.\n\nText: Title at the top \u2014 "URBAN STREET BREAKDANCE \u2013 16 COUNTS \u2013 10 SECONDS \u2013 FREESTYLE FLOW".\n\nEnvironment: simple industrial dance studio background with concrete textures, soft cinematic lighting, minimal shadows.\n\nQuality: high detail, sharp composition, balanced layout, editorial dance tutorial poster, stylish choreography reference sheet.',
    why_it_works:
      "The 4x4 grid with numbered steps gives the model a rigid structural constraint that prevents layout drift. Specifying the colored pencil medium with visible texture creates a distinctive hand-drawn aesthetic. Movement arrows and caption callouts add informational density that makes the infographic feel functional rather than decorative.",
    source: "curated",
    tags: [
      "infographic",
      "dance",
      "choreography",
      "colored-pencil",
      "streetwear",
      "grid",
      "tutorial",
    ],
  },
  {
    id: "curated-uk-citizenship-card",
    title: "UK Citizenship Identity Card",
    category: "Cinematic",
    prompt:
      'Ultra-realistic 16:9 close-up studio photograph of a United Kingdom citizenship identity card placed on a clean light grey or white background. The card is horizontally aligned, centered in frame, captured in sharp focus with soft diffused studio lighting.\nThe design follows an official government-issued ID aesthetic with structured layout, clean typography, and advanced anti-counterfeit detailing. The top header reads: "UNITED KINGDOM" and "CITIZENSHIP CARD," with a subtitle: "The United Kingdom of Great Britain and Northern Ireland."\nTop-left includes the Union Jack flag. Top-right features the royal coat of arms.\nThe card contains a passport-style portrait of a young British woman:\n\u2013 Fair to light skin tone with natural freckles\n\u2013 Medium-length brown hair, softly wavy, center-parted\n\u2013 Hazel or light brown eyes, neutral expression, direct gaze\n\u2013 Minimal makeup, natural skin texture\n\u2013 Wearing a dark top with small gold hoop earrings\nPersonal identity details displayed clearly in bilingual format (English / Welsh):\n\u2013 Surname / Cyfenw: WILLIAMS\n\u2013 Given names / Enwau cyntaf: OLIVIA ANNE\n\u2013 Date of birth / Dyddiad geni: 23 MAY / MAI 1994\n\u2013 Place of birth / Lleoliad geni: MANCHESTER, ENGLAND\n\u2013 Nationality / Cenedligrwydd: BRITISH CITIZEN\n\u2013 Citizenship number / Rhif dinasyddiaeth: UKC-94-523456\n\u2013 Date of issue / Dyddiad cyhoeddi: 17 APR / EBR 2024\n\u2013 Date of expiry / Dyddiad dod i ben: 17 APR / EBR 2034\n\u2013 Sex / Rhyw: F\nSecurity and design features include:\n\u2013 Intricate guilloche patterns across the entire surface\n\u2013 Fine-line engraving and microprinted text\n\u2013 Holographic security patch with iridescent reflections\n\u2013 Circular "UK" seal with crown emblem\n\u2013 Subtle Union Jack pattern blended into background\n\u2013 Engraved illustration of Big Ben / Westminster Palace on right side\n\u2013 Signature at bottom: "Olivia A. Williams"\nAdditional elements:\n\u2013 Machine-readable ID strip and barcode at bottom\n\u2013 Subtle red, blue, and white gradient accents inspired by UK flag\nMaterial: laminated polycarbonate card with slight gloss, visible reflections, layered holographic overlays.\nLighting: soft, even studio lighting highlighting texture, print clarity, and security features.\nNo hand visible. Clean, minimal, professional composition.\nStyle: ultra-detailed, photorealistic, 8K resolution, macro clarity, professional product photography.',
    why_it_works:
      "Exhaustive specification of every card element \u2014 guilloche patterns, holographic patches, bilingual text fields, machine-readable strips \u2014 forces the model to render a convincingly detailed government document. The studio photography framing with material callouts (laminated polycarbonate, visible reflections) adds physical realism.",
    source: "curated",
    tags: [
      "photorealism",
      "document",
      "identity-card",
      "product-photography",
      "studio",
      "official",
    ],
  },
  {
    id: "curated-anime-pop-art-conversion",
    title: "Anime \u00d7 Pop Art Style Conversion",
    category: "Image Edits",
    prompt:
      "Convert this illustration into a unique style that strongly blends modern anime-style character design with pop art, finishing it as an attractive and refined design typical of modern anime. For the background, boldly arrange repetitive motifs such as abstract patterns, geometric shapes, dots, lines, spirals, swirls, and wave patterns to create an energetic composition reminiscent of street art or graffiti. For the colors, combine soft, pale pastel tones (pastel pink, mint green, lavender, light blue, etc.) to achieve both strong contrast and a light, airy feel. The drawing technique should primarily use uniform flat coloring, emphasizing thick, clean, and sharp outline lines. Avoid complex shading or gradients as much as possible, and instead create a graphical and dynamic impression through flat, vibrant color planes. Do not include any text, logos, or typography elements. Maintain the original illustration's composition and characters.",
    why_it_works:
      "Clear style directive: flat coloring with thick outlines, no gradients. The pop art background instructions (dots, spirals, wave patterns) create visual energy without competing with the subject. Pastel palette constraint prevents the AI from defaulting to oversaturated anime colors while maintaining contrast.",
    source: "curated",
    tags: [
      "anime",
      "pop-art",
      "style-transfer",
      "flat-color",
      "pastel",
      "illustration",
      "image-edit",
    ],
  },
  {
    id: "curated-jinx-arcane-poster",
    title: "Jinx from Arcane \u2014 Thick Paint Poster",
    category: "Posters",
    prompt:
      "Jinx from Arcane, rendered in an American-style thick paint illustration. Side-profile, half-body close-up with the character faithfully matching the original design, gaze directed to the left. Minimalist beige background with extensive negative space, composition weighted to the right. Clean, premium aesthetic with soft, cinematic lighting, rim light, high contrast but low saturation color palette, with subtle accent colors reflecting the character's main tones. Geometric, faceted painting style with detailed skin texture and hair strands. Commercial poster layout with bold headline typography design. Vertical 9:16 format.",
    why_it_works:
      'The "American-style thick paint" directive creates a distinctive textured medium. Side-profile composition with right-weighted framing and extensive negative space gives the layout commercial poster DNA. Low saturation with subtle character-matched accents prevents the usual oversaturated anime look.',
    source: "curated",
    tags: [
      "poster",
      "arcane",
      "character",
      "thick-paint",
      "illustration",
      "commercial",
      "portrait",
    ],
  },
  {
    id: "curated-aot-eren-poster",
    title: "Attack on Titan Eren \u2014 Thick Paint Poster",
    category: "Posters",
    prompt:
      '"Attack on Titan \u2013 Eren Yeager" in an American-style thick paint illustration, side-profile half-body close-up. The character faithfully matches the original design, looking toward the left. Minimalist beige background with extensive negative space, right-aligned composition, clean and premium aesthetic. Soft cinematic lighting with rim light, high contrast but low saturation color palette, with subtle accents of the character\'s main colors. Geometric faceted shading style, detailed skin and hair rendering. Commercial poster layout with bold headline typography design. 9:16 vertical format.',
    why_it_works:
      "Same proven thick-paint poster formula applied to a different character. The geometric faceted shading creates painterly depth while the minimalist beige background and commercial layout prevent the typical busy anime aesthetic. Naming the specific character ensures design fidelity.",
    source: "curated",
    tags: ["poster", "anime", "character", "thick-paint", "illustration", "commercial", "portrait"],
  },
  {
    id: "curated-business-leader-ink-portrait",
    title: "Business Leader Ink & Watercolor Portrait",
    category: "Posters",
    prompt:
      'A powerful portrait of a high-status business leader wearing a premium luxury formal suit (tailored dark suit, crisp white shirt, elegant tie).\nSharp facial features, clean grooming, ultra-realistic detailing.\nExpression & Mood:\nCalm, confident, and highly authoritative expression \u2014 focused gaze symbolizing intelligence, control, and global influence.\nPose & Composition:\nHalf-body portrait (chest-up)\nSlight diagonal cinematic angle for depth and intensity\nStrong executive posture (hands relaxed or adjusting suit)\nArt Style:\nHand-drawn ink sketch lines blended with watercolor textures\nLuxury-inspired gold, black, and deep blue/red paint splashes\nDynamic abstract brush strokes representing power and innovation\nHighly detailed realistic face with subtle gritty texture\nBackground:\nClean white or soft neutral base\nElegant watercolor splashes (gold + dark tones)\nSoft glowing aura behind the subject for a premium elite feel\nTypography Elements:\nMain Title:\n"[TYPE HERE]"\nName:\n"[TYPE HERE]" (bold handwritten luxury brush style)\nExtra Details:\nSubtle gold accents for premium billionaire aesthetic\nLight grunge texture overlay for cinematic depth\nMinimal crown or abstract wealth/power symbols\nSignature (Bottom):\n"[TYPE HERE]"\nOptional Quote Section:\n"[TYPE HERE]"\nMood & Tone:\nElite, powerful, cinematic, luxury-driven legacy aesthetic',
    why_it_works:
      "The ink-sketch-meets-watercolor medium creates a premium editorial look. Structured layout with typography placeholders makes this a reusable template. Gold + black + deep blue palette with dynamic brush strokes conveys luxury without being gaudy. The diagonal cinematic angle adds visual tension to what could be a static portrait.",
    source: "curated",
    tags: [
      "portrait",
      "business",
      "ink",
      "watercolor",
      "luxury",
      "editorial",
      "poster",
      "template",
    ],
  },
  {
    id: "curated-doodle-chibi-aesthetic",
    title: "Doodle & Chibi Aesthetic Photo Enhancement",
    category: "Image Edits",
    prompt:
      'Add hand-drawn doodle elements around the main objects: white outline strokes, sketchy sparkles, stars, hearts, arrows, tiny flowers, playful swirls, mini handwritten notes. Add small cute mascot-style doodles that match the vibe of the photo (tiny bear, smiling drink, cute food character, sleepy cloud, etc.) but keep them subtle and balanced. Use handwritten white text with short relatable captions only.\n\nDo NOT add too many words or overcrowd the image. Use a real face as a reference photo. The background is the same as in the photo. The lighting is warm, soft, and clean, with subtle shadows. Around the image, add several mini chibi (3D cute style) versions of the character, while maintaining the original facial features. Chibi characters have various poses and expressions: jumping cheerfully, waving, sitting relaxed, holding a drink, cute and playful expressions.\n\nAdd hand-drawn white doodle elements: outline around the main body, stars, hearts, sparkles, motion lines, small cute icons. Add aesthetic handwriting such as: "shine," "bright day," "happy," "smile," "gym time," etc. (casual doodle font). Overall style: clean & aesthetic composition, white sticker outline, soft pastel color tone, high detail 3D chibi glossy look, cute Korean aesthetic.',
    why_it_works:
      'Layered enhancement approach: white doodles add whimsy without obscuring the photo, while 3D chibi versions of the subject create a viral social-media-ready aesthetic. The "do NOT overcrowd" constraint prevents the common failure of AI adding too many elements. Korean aesthetic styling gives a clear visual direction.',
    source: "curated",
    tags: ["doodle", "chibi", "aesthetic", "photo-enhancement", "cute", "korean", "image-edit"],
  },
  {
    id: "curated-instagram-breakout-3d",
    title: "Instagram Frame 3D Breakout Scene",
    category: "Social Posts",
    prompt:
      "A hyper-realistic 3D cinematic scene of a stylish young woman bursting out of a tilted Instagram post frame, breaking through a cracked concrete wall with debris and dust flying in motion, dynamic forward stepping pose with one leg outside the frame creating strong depth illusion, confident intense facial expression, short messy black bob haircut with volume and soft waves, wearing a black fitted turtleneck top with beige cargo pants and an oversized beige trench coat, black combat boots, gold hoop earrings and minimal necklace, dramatic cinematic lighting, high contrast shadows, ultra detailed textures, Instagram UI with profile name Noor and verification badge visible, viral social media concept, motion freeze, depth of field, 8k, ultra realistic",
    why_it_works:
      'The "breaking out of a frame" concept creates an eye-catching dimensional illusion. Specific outfit details (turtleneck, cargo pants, trench coat, combat boots) give the model enough to render a cohesive look. The cracked concrete and debris add dynamism while the Instagram UI overlay grounds it in a social media context.',
    source: "curated",
    tags: ["3d", "instagram", "social-media", "breakout", "cinematic", "fashion", "viral"],
  },
  {
    id: "curated-time-magazine-cover",
    title: "TIME Magazine Cover Recreation",
    category: "Posters",
    prompt:
      'A highly detailed realistic photograph of a TIME magazine cover, red border, white background. Top right corner text reads "APRIL 29 / MAY 6, 2024". Large bold text at the top: "THE MOST INFLUENTIAL COMPANIES" above big red "TIME" and black "100".\nMain subject is a close-up portrait of Hailey Bieber, elegant and beautiful, with sleek dark brown hair parted in the middle and pulled back into a tight low bun, flawless glowing skin, subtle makeup with glossy nude lips and defined eyebrows. She is looking slightly to the left with a confident expression.\nA large, glossy, deep red Anthurium flower (with prominent spadix) is positioned near her neck and shoulder. She is wearing a white feathery or fluffy garment.\nOn the left side in bold text: "HOW HAILEY BIEBER DREAMS UP Rhode". Below it a vertical list of company names: APPLE, NVIDIA, MICROSOFT, AMAZON, TIKTOK, DISNEY, NETFLIX, UNITEDHEALTH + 90 MORE. Bottom right corner has "http://time.com".\nProfessional studio lighting, clean editorial style, high resolution, sharp details, iconic TIME magazine cover composition.',
    why_it_works:
      "Exhaustive recreation of every element of a recognizable magazine cover \u2014 red border, masthead placement, cover lines, date stamp, company list. The Anthurium flower prop and white feathery garment add specific editorial styling cues. This level of layout detail tests and showcases text rendering and compositional control.",
    source: "curated",
    tags: ["magazine", "cover", "editorial", "portrait", "typography", "photorealism", "time"],
  },
  {
    id: "curated-luxury-skincare-ad",
    title: "Luxury Skincare Campaign Ad",
    category: "Posters",
    prompt:
      'Create a high-end luxury skincare advertisement. A young woman with radiant, glassy, and naturally glowing skin with soft highlights is holding a vitamin C face serum bottle close to her cheek. Only use the bottle, no box. Background should be elegant silky satin fabric (Dior-style) with smooth folds, in a rich champagne\u2013olive tone, softly lit with golden highlights and gentle shadows to create depth and luxury.\nOutfit should be a silky satin dress matching the background tones (olive/champagne), slightly reflective, premium fabric texture.\nLighting: soft diffused front light + subtle golden rim light on hair + gentle glow on skin. DSLR quality, shallow depth of field.\nAdd minimal, premium typography on the left side:\n"10% Vitamin C" (large, elegant serif)\n"Face Serum" (smaller)\n"Triple Glow +++" (refined thin style)\nAdd 3\u20134 minimal benefit points with small luxury icons:\nBoosts natural glow\nFades dark spots\nHydrates & repairs\nAntioxidant protection\nText and icons should be subtle gold/cream tone, well-spaced, not cluttered.\nComposition should feel like a Dior-style campaign: clean, balanced, cinematic, ultra-realistic, premium skincare ad.',
    why_it_works:
      "The Dior-style satin background with matching outfit creates a monochromatic luxury palette. Specific lighting setup (diffused front + golden rim + skin glow) mimics professional beauty photography. Typography hierarchy with benefit points adds commercial readability without cluttering the premium feel.",
    source: "curated",
    tags: ["skincare", "advertisement", "luxury", "beauty", "product", "editorial", "dior-style"],
  },
  {
    id: "curated-snack-brand-identity-system",
    title: "Snack Brand Identity System Poster",
    category: "Infographics",
    prompt:
      'Create a premium snack brand identity system poster using the provided logo as the only source of visual DNA.\nAll design decisions must be derived from the logo itself including color palette, tone, shapes, textures, and visual rhythm. Do not reference or imitate existing brands. Build a bold, original, high-energy snack identity.\nCanvas & Layout: Vertical 4:5 aspect ratio. Dark near-black background (#0D0D0D range). Dense multi-layered grid system. No empty space, every area should feel intentional. Use sharp accent-colored rule lines to divide sections.\nTop Section: Prominent brand wordmark in bold, clean, modern display type. Brand statement: "Snack Loud. Live Bigger." Three descriptors: BOLD / PLAYFUL / HIGH-ENERGY. Tight spacing, strong hierarchy, visually punchy.\nColor System: Primary palette derived from logo. Display as large swatches with HEX codes and usage labels. Include a gradient strip.\nTypography System: Headline: bold display sans-serif, white, text: "Make It Viral." Subhead: modern sans-serif in accent color. Body: light gray. Caption: tiny monospaced font. Show clear 4-level hierarchy with scale contrast.\nApplications Section: Chocolate bar packaging mockup (hero focus, premium lighting). Dark e-commerce website hero with bold CTA. Mobile product card UI. Three social posts (bold hype style, dark premium style, fun lifestyle style). Business card with neon edge stripe. Full-bleed billboard campaign.\nIcon System: 8 minimal line icons (1.5px stroke). Pattern System: Logo-based repeat grid, diagonal neon stripes, dot matrix texture, monogram tile pattern.\nMicro Details: Layered soft shadows, foil texture, gloss reflections, cross-section depth slices.\nOverall Feel: Behance-level presentation, agency-quality execution, high-energy snack branding, sharp, modern, bold, and addictive visual language.',
    why_it_works:
      "Exhaustive brand system specification \u2014 color swatches with HEX codes, 4-level typography hierarchy, icon system with stroke weights, multiple application mockups \u2014 forces the model to render a comprehensive, agency-grade presentation. The dark background with neon accents creates visual punch while the grid system maintains order.",
    source: "curated",
    tags: [
      "brand-identity",
      "snack",
      "packaging",
      "branding",
      "behance",
      "dark-theme",
      "grid-system",
    ],
  },
  {
    id: "curated-imperial-anime-flame-character",
    title: "East Asian Imperial Flame Character",
    category: "Open-Ended Creative",
    prompt:
      "An ultra-detailed, ornate East Asian imperial illustration of a regal anime-style male character inspired by flame aesthetics, standing in a full-body portrait pose. He has long flowing golden-blonde hair with fiery red-orange tips, styled voluminously with elegant movement, sharp eyes, and a calm, noble expression.\nHe wears luxurious layered traditional robes in deep red, gold, and ivory tones, heavily embroidered with intricate phoenix and flame motifs, with detailed patterns, brocade textures, and gold thread ornamentation. The sleeves are wide and flowing, with rich inner linings and tassel accessories hanging from the waist.\nThe background is a highly decorative classical Chinese painting composition: golden clouds, distant mountains, a large red sun, traditional lanterns, floral elements (peonies), and ornate architectural panels with vertical calligraphy scrolls.\nColor palette is warm and rich: crimson, gold, amber, ivory, and black accents.\nArt style blends anime character design with traditional Chinese ink painting and gold-leaf illustration.\nHighly detailed, symmetrical composition, soft atmospheric depth, elegant lighting, intricate textures, premium poster quality, 4K resolution. 2:3 aspect ratio.",
    why_it_works:
      "Blending anime character design with traditional Chinese ink painting and gold-leaf illustration creates a distinctive fusion style. The exhaustive costume detail (phoenix motifs, brocade textures, gold thread, tassel accessories) gives the model rich material to render. The warm crimson-gold-amber palette with symmetrical composition creates an iconic, regal presentation.",
    source: "curated",
    tags: [
      "anime",
      "chinese",
      "imperial",
      "character-design",
      "illustration",
      "gold-leaf",
      "fantasy",
    ],
  },
  {
    id: "curated-printmaking-pastel-poster",
    title: "Printmaking Pastel Poster",
    category: "Open-Ended Creative",
    prompt:
      "A crisp, printmaking-like aesthetic with bold outlines and natural deformation. Pastel color palette, vintage print texture, slightly misaligned ink layers, and rough paper grain. A calm poster composition with generous negative space rather than filling the frame. Props and background kept minimal. Color theme 2\u20133 colors.",
    why_it_works:
      'Deliberately minimal prompt that works by specifying a precise aesthetic rather than content. The "misaligned ink layers" and "rough paper grain" create authentic printmaking imperfections. Limiting to 2-3 colors with generous negative space prevents the model from overproducing detail, resulting in a refined, gallery-worthy output.',
    source: "curated",
    tags: ["printmaking", "pastel", "minimal", "vintage", "poster", "texture", "negative-space"],
  },
  {
    id: "curated-netflix-homepage-hero",
    title: "Netflix Homepage UI with Hero Film",
    category: "UI Mockups",
    prompt:
      "Create a Netflix homepage UI featuring a main hero film with its title and still generated from the uploaded reference.",
    why_it_works:
      "Concise prompt that leverages the model's knowledge of Netflix's UI patterns. The reference image provides the creative direction while the model fills in the familiar dark UI, navigation elements, and row-based content layout. Demonstrates how minimal text + strong reference can produce detailed results.",
    source: "curated",
    tags: ["ui-mockup", "netflix", "streaming", "hero", "reference-based", "interface"],
  },
  {
    id: "curated-character-breakdown-knolling",
    title: "3D Character Breakdown Knolling Poster",
    category: "Posters",
    prompt:
      'Based on the reference image provided by the user, create an ultra-high-quality, photorealistic 3D character breakdown art poster. Transform the character into an Unreal Engine 5 (Metahuman)-level hyper-realistic digital human, and arrange their intensely personal, charismatic items in a meticulous "Knolling" style layout display.\n\nAspect ratio: 16:9 landscape. Core art style: Fashion Hyper-realism \u2014 extreme skin texture, luxurious material rendering, seductive cinematic atmosphere. Quality benchmark: On par with Tom Ford/Gucci fashion ad campaigns, Cyberpunk 2077\'s high-end character modeling, Vogue photography.\n\nItem Layout \u2014 Knolling Radial Composition: Total items 25-30 pieces, arranged radially around the character, emphasizing negative space.\n\nCategory 1: Haute Couture Outfits (Deep Red Velvet Labels) \u2014 Main outfit breakdown with material focus on silk\'s fluid shimmer, leather\'s grainy texture, and skin-fabric contact impressions.\nCategory 2: Intimate Beauty (Champagne Gold Labels) \u2014 Makeup details with creamy textures, vintage perfume bottle, half-burned scented candle with smoke wisps, glass of red wine.\nCategory 3: Luxury Accessories (Platinum Labels) \u2014 Diamond necklace with dispersion fire, snake-shaped bracelet, mechanical watch with see-through movement, genuine leather handbag.\nCategory 4: Symbols of Desire (Neon Purple Labels) \u2014 Retro sunglasses, film camera, fashion magazine, vinyl record, scattered pearls, red rose with dewdrops.\n\nCharacter: slightly languid confident posture, eyes locking with the lens. Skin with real pores, faint peach fuzz, lip texture, collarbone shadows, dewy glow.\nConnection lines: ultra-fine golden laser lines with glow halos. Technical annotations in tiny sharp fonts.\nTypography: Didot or Bodoni serifs, white or gold. Subtitle: "Elegance is an attitude."\nColor scheme: Midnight blue (#000033) + Burgundy red (#800020) + Champagne gold (#D4AF37).\nLighting: Rembrandt lighting with dramatic triangular face patches + strong rim light. Dark backdrop with caustics or city bokeh. Subtle swirling smoke.\nCamera: 85mm portrait, f/1.8, sharp focus on eyes and key items. Cinematic LUT color grading, Pro-Mist filter glow on highlights.',
    why_it_works:
      "The most ambitious single-prompt specification in the library \u2014 25-30 categorized items in knolling layout, each with material-specific rendering instructions. Fashion brand benchmarks (Tom Ford, Gucci, Vogue) set the quality bar. Rembrandt lighting + rim light + caustics create cinematic depth. The color-coded category labels add information design structure to what could be a chaotic composition.",
    source: "curated",
    tags: [
      "3d",
      "character-breakdown",
      "knolling",
      "fashion",
      "luxury",
      "hyper-realistic",
      "poster",
      "reference-based",
    ],
  },
  {
    id: "curated-convenience-store-storyboard",
    title: "Convenience Store Action Storyboard",
    category: "Storyboards",
    prompt:
      "A cinematic 3x3 storyboard grid showing a dramatic action sequence inside a modern convenience store at night. The style is dark, moody, high-end film stills, realistic lighting, slight teal-green color grading, shallow depth of field, motion blur in action shots.\n\nEach of the 9 panels should be separated by thin black borders, forming a clean storyboard layout.\n\nEach panel has small white text in the top-left corner showing: Shot number (SHOT 1\u20139), Camera type (e.g. ARRI Alexa Mini LF), Lens (e.g. 35mm, 50mm, 85mm). Subtle cinematic subtitles in English at the bottom of each frame describing the action. Maintain consistent character appearance: a young athletic Asian woman, energetic and physically strong, toned body, lively yet intense expression, wearing a pink spaghetti-strap sports top and a pink sporty mini skirt, with practical athletic styling suited for fast movement.\n\nSHOT 1 \u2013 Medium shot, 35mm: A young athletic woman standing in a convenience store aisle, casually looking at a snack package. Fluorescent lighting, calm atmosphere.\nSHOT 2 \u2013 Wide shot, 24mm: Store doors burst open violently. A large group of heavily armed tactical soldiers rush in.\nSHOT 3 \u2013 Over-the-shoulder shot, 50mm: From behind the woman, facing a line of soldiers aiming rifles directly at her.\nSHOT 4 \u2013 Extreme close-up, 85mm: The woman's eyes sharpen with focus, showing intense determination. Background slightly blurred.\nSHOT 5 \u2013 Motion blur tracking shot, 35mm: The woman suddenly dashes forward at superhuman speed. Her pink athletic outfit flows dynamically. Soldiers appear blurred.\nSHOT 6 \u2013 Wide action shot, 28mm: She strikes multiple soldiers mid-air, dynamic combat pose, debris flying.\nSHOT 7 \u2013 Low angle shot, 35mm: Close combat: the woman overpowering soldiers on the ground, fast brutal movements.\nSHOT 8 \u2013 Wide aftermath shot, 24mm: All soldiers are down. The woman stands in the center, surrounded by fallen bodies, breathing steadily.\nSHOT 9 \u2013 Medium wide shot, 35mm: The woman stands calmly in the destroyed store, untouched. Pink sports outfit contrasts sharply with the dark cinematic environment.\n\nStyle: cinematic, film stills, ultra realistic, dramatic lighting, teal color grade, shallow depth of field, motion blur, high detail, 8k, storyboard layout, grid composition, professional filmmaking, ARRI Alexa look.",
    why_it_works:
      "The 3x3 grid with camera specs (ARRI Alexa, specific focal lengths) per panel creates authentic storyboard production value. Each shot specifies a distinct camera angle and narrative beat, building dramatic tension. The pink athletic outfit against dark teal cinematography creates strong visual contrast that reads even at small panel sizes. Consistent character description across 9 panels tests coherence.",
    source: "curated",
    tags: ["storyboard", "action", "cinematic", "grid", "film-stills", "narrative", "combat"],
  },
  // ─── Numerology / Life Path Series ──────────────────────────────────────────
  {
    id: "curated-life-path-decoder",
    title: "The Life Path Decoder \u2014 Numerology Infographic",
    category: "Infographics",
    prompt:
      'A premium editorial infographic poster titled "THE LIFE PATH DECODER" for birth date [insert date]. Vertical 9:16 format, dark navy-to-black gradient background with gold and warm white typography.\n\nTop section: large birth date "[insert date]" in bold serif type with a glowing golden celestial ring behind it. Below, a circular numerology wheel diagram showing the calculated life path number at center, surrounded by segmented arcs for personality, strengths, weaknesses, and destiny.\n\nMiddle section: three vertical columns with gold divider lines \u2014 "CORE TRAITS" (3\u20134 personality descriptors with minimal icons), "HIDDEN STRENGTHS" (key talents with subtle star symbols), "SHADOW SIDE" (honest weaknesses with small warning icons). Each item is short, punchy text \u2014 not paragraphs.\n\nBottom section: a horizontal "DESTINY MAP" timeline ribbon showing life phases (Youth, Growth, Peak, Legacy) with age ranges and one-line descriptions. Below, a bold callout box: "YOUR LIFE PURPOSE" with a single powerful sentence.\n\nDesign style: astrology app meets luxury editorial \u2014 clean grid layout, constellation dot patterns in the background, subtle zodiac line art, gold foil texture on headings, modern sans-serif body text. Inspired by Co-Star and The Pattern app aesthetics. No clutter, generous negative space, premium feel, 4K resolution.',
    why_it_works:
      "The circular numerology wheel at the center creates a strong visual anchor. Three-column trait breakdown with icons adds informational density without clutter. The destiny timeline ribbon at the bottom provides narrative structure. Dark background with gold foil typography creates the premium astrology-app aesthetic that performs well on social media.",
    source: "curated",
    tags: [
      "numerology",
      "infographic",
      "astrology",
      "life-path",
      "editorial",
      "dark-theme",
      "gold",
    ],
  },
  {
    id: "curated-soul-purpose-discoverer",
    title: "The Soul Purpose Discoverer \u2014 Visual Guide",
    category: "Infographics",
    prompt:
      'A mystical editorial infographic poster titled "SOUL PURPOSE DISCOVERER" for birth date [insert date]. Vertical 9:16 format, deep indigo-to-purple gradient background with soft luminous white and lavender typography.\n\nTop section: birth date "[insert date]" set inside a radiant mandala design with layered geometric petals and soft glowing light at the center, symbolizing the soul\'s core.\n\nMain section: a vertical flowchart-style layout with three interconnected nodes \u2014 "CORE LIFE MISSION" (a single bold statement inside a glowing orb), "LESSONS TO LEARN" (3 key lessons in rounded cards with symbolic icons \u2014 mirror, flame, compass), and "YOUR CONTRIBUTION" (one clear sentence about the impact this person is meant to make, inside a diamond-shaped frame).\n\nBottom section: "START TODAY" action panel \u2014 3 short, concrete daily actions displayed as minimal checklist items with soft checkmark icons and brief captions.\n\nDesign style: spiritual yet modern \u2014 sacred geometry patterns in the background, subtle nebula textures, thin luminous connection lines between nodes, elegant serif headings with clean sans-serif body text. Ethereal, premium, contemplative. No clutter, balanced whitespace, 4K resolution.',
    why_it_works:
      'The mandala center piece creates immediate spiritual visual identity. The flowchart structure (mission \u2192 lessons \u2192 contribution \u2192 actions) provides a clear reading path. Sacred geometry background adds depth without competing with content. The actionable "Start Today" section grounds the mystical theme in practical steps, making it shareable and useful.',
    source: "curated",
    tags: [
      "numerology",
      "soul-purpose",
      "infographic",
      "spiritual",
      "mandala",
      "flowchart",
      "mystical",
    ],
  },
  {
    id: "curated-career-destiny-detector",
    title: "The Career Destiny Detector \u2014 Infographic",
    category: "Infographics",
    prompt:
      'A bold, professional infographic poster titled "CAREER DESTINY DETECTOR" for birth date [insert date]. Vertical 9:16 format, charcoal-black background with electric teal, white, and gold accents.\n\nTop section: birth date "[insert date]" displayed in a futuristic data-panel style with thin tech grid lines and a subtle radar/scan animation aesthetic. Heading in bold condensed sans-serif.\n\nCore section: a three-lane horizontal layout \u2014 each lane is a "DESTINY PATH" card showing one ideal career/business path. Each card includes: a minimal icon representing the field, a bold career title, a 2-line description of why this path fits, and a small "match score" percentage bar. Cards have subtle glassmorphism styling with frosted borders.\n\nBelow: a single "DANGER ZONE" red-accented panel showing the one career field to avoid, with a warning icon and brief explanation.\n\nSide column: "YOUR NATURAL TALENTS" \u2014 4\u20135 small badge-style tags (e.g., "Strategic Thinker," "Creative Problem Solver," "Natural Leader") with thin outline icons.\n\nBottom: "DECISION STYLE" \u2014 a small horizontal spectrum bar showing where this person falls between intuitive and analytical.\n\nDesign style: tech-meets-editorial \u2014 futuristic dashboard aesthetic, clean data visualization, subtle circuit-pattern background textures, professional and aspirational. No clutter, sharp grid, 4K resolution.',
    why_it_works:
      'The dashboard/data-panel aesthetic makes career analysis feel objective and tech-driven rather than mystical. Three destiny path cards with match-score bars add a gamified, personalized element. The "Danger Zone" red panel creates contrast and urgency. Badge-style talent tags and the decision-style spectrum bar add layered data visualization.',
    source: "curated",
    tags: [
      "career",
      "infographic",
      "dashboard",
      "tech",
      "data-visualization",
      "futuristic",
      "glassmorphism",
    ],
  },
  {
    id: "curated-relationship-destiny-map",
    title: "Relationship Destiny Map \u2014 Visual Guide",
    category: "Infographics",
    prompt:
      'An elegant editorial infographic poster titled "RELATIONSHIP DESTINY MAP" for birth date [insert date]. Vertical 9:16 format, warm blush-to-rose gradient background with cream, gold, and deep burgundy typography.\n\nTop section: birth date "[insert date]" framed inside two interlocking celestial rings (representing connection), with soft golden light at the intersection point.\n\nMain section: three horizontal panels stacked vertically \u2014\nPanel 1: "MOST COMPATIBLE WITH" \u2014 3 personality archetype cards side by side, each with a minimal symbolic icon (e.g., anchor, flame, star), a short archetype name, and a one-line description of why they\'re compatible.\nPanel 2: "LOVE LESSONS" \u2014 3 key relationship lessons displayed as numbered insights with elegant small icons (heart, key, mirror), each with a brief sentence.\nPanel 3: "YOUR IDEAL PARTNER" \u2014 a detailed profile card with traits listed in a clean two-column layout (emotional style, communication, values, growth style), framed with a subtle ornate border.\n\nBottom: "ROLE OF LOVE IN YOUR PATH" \u2014 a single reflective sentence in italic serif, centered, with subtle decorative flourishes.\n\nDesign style: romantic editorial \u2014 soft watercolor texture accents, delicate gold line art, warm intimate color palette, elegant serif headings with modern sans-serif body. Premium, intimate, visually warm. 4K resolution.',
    why_it_works:
      "The interlocking celestial rings create a romantic visual hook. Three stacked panels provide clear information hierarchy \u2014 compatibility, lessons, ideal partner profile. The two-column partner trait card mimics dating-app aesthetics while the watercolor textures and gold line art elevate it to editorial quality. Warm blush-rose palette signals romance without being clich\u00e9.",
    source: "curated",
    tags: [
      "relationship",
      "infographic",
      "love",
      "compatibility",
      "editorial",
      "romantic",
      "warm-palette",
    ],
  },
  {
    id: "curated-wealth-abundance-code",
    title: "The Wealth & Abundance Code \u2014 Infographic",
    category: "Infographics",
    prompt:
      'A luxurious editorial infographic poster titled "THE WEALTH & ABUNDANCE CODE" for birth date [insert date]. Vertical 9:16 format, deep black background with rich gold, emerald green, and cream accents.\n\nTop section: birth date "[insert date]" engraved inside a golden vault-door circular motif with intricate gear-like detailing and radiating golden light beams.\n\nMain section: four stacked content blocks \u2014\nBlock 1: "FINANCIAL PERSONALITY" \u2014 a bold archetype name (e.g., "The Strategic Builder") inside a gold-bordered banner with a one-line description and a minimal icon.\nBlock 2: "WEALTH BLOCKS" \u2014 3 specific mistakes or patterns displayed as crossed-out items in muted red, each with a brief callout explaining the trap.\nBlock 3: "YOUR ABUNDANCE STRATEGY" \u2014 a step-by-step vertical flow (3 steps) with numbered gold circles, bold action titles, and short descriptions. Connected by thin golden lines.\nBlock 4: "MONEY MAGNETISM SCORE" \u2014 a horizontal gauge/meter styled like a luxury dashboard, showing a position on a spectrum from "Dormant" to "Magnetic."\n\nBottom: a single bold quote in elegant serif: "Your wealth path is unique \u2014 stop following generic blueprints."\n\nDesign style: luxury finance meets editorial \u2014 gold foil textures, subtle money-inspired patterns (fine guilloche lines), premium dark-mode aesthetic, sharp typography hierarchy, Art Deco geometric accents. 4K resolution.',
    why_it_works:
      "The vault-door motif at the top immediately signals wealth and exclusivity. Red crossed-out wealth blocks create visual contrast and urgency. The step-by-step abundance strategy with gold numbered circles provides actionable structure. The luxury dashboard gauge adds a gamified element. Art Deco + gold foil textures create a premium feel that matches the wealth theme.",
    source: "curated",
    tags: [
      "wealth",
      "abundance",
      "infographic",
      "luxury",
      "finance",
      "gold",
      "dark-theme",
      "art-deco",
    ],
  },
  {
    id: "curated-future-timeline-guide",
    title: "Future Timeline Guide \u2014 Life Roadmap",
    category: "Infographics",
    prompt:
      'A cinematic editorial infographic poster titled "YOUR FUTURE TIMELINE" for birth date [insert date]. Vertical 9:16 format, deep space-black background with soft blue, silver, and white accents.\n\nTop section: birth date "[insert date]" displayed inside a glowing orbital ring system, with small planetary dots marking key life phases along the orbit.\n\nMain section: a vertical timeline running down the center of the poster with a luminous silver line. Five milestone nodes along the timeline, each representing a life phase:\nNode 1: "PAST \u2014 Foundation Phase" \u2014 small card with age range and a one-line insight about formative experiences.\nNode 2: "PRESENT \u2014 Current Crossroads" \u2014 slightly larger highlighted card with a glowing border, showing where you are now and the key decision ahead.\nNode 3: "YEAR 1\u20132 \u2014 Growth Surge" \u2014 card showing the opportunity window opening.\nNode 4: "YEAR 3\u20134 \u2014 Challenge & Transformation" \u2014 card with a subtle amber accent showing the difficulty phase and what it teaches.\nNode 5: "YEAR 5 \u2014 Breakthrough" \u2014 gold-accented card showing the destination and achievement.\n\nSide elements: small constellation-style dots and thin lines connecting related phases. Subtle nebula textures in the background adding depth.\n\nBottom: "YOUR ROADMAP IS WRITTEN IN THE STARS \u2014 BUT YOU HOLD THE PEN." in elegant spaced serif type.\n\nDesign style: cosmic editorial \u2014 planetarium-inspired, soft atmospheric glow effects, clean data visualization meets celestial aesthetics, silver and blue with gold highlights at the breakthrough node. Premium, contemplative, aspirational. 4K resolution.',
    why_it_works:
      'The orbital ring system with planetary dots creates a literal "life orbit" visual metaphor. The vertical timeline with progressively larger nodes builds narrative momentum toward the breakthrough. Amber accent on the challenge phase adds honest visual tension. Cosmic/planetarium aesthetic gives the life roadmap a sense of grandeur. The closing quote adds a personal, empowering touch.',
    source: "curated",
    tags: [
      "timeline",
      "infographic",
      "future",
      "roadmap",
      "cosmic",
      "celestial",
      "life-path",
      "editorial",
    ],
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Batch 5: ${BATCH_5.length} prompts to insert\n`);

  // Fetch existing IDs from Supabase
  const { data: existing, error: fetchError } = await supabase.from("curated_prompts").select("id");

  if (fetchError) {
    console.error("Failed to fetch existing prompts:", fetchError.message);
    process.exit(1);
  }

  const existingIds = new Set(existing.map((p) => p.id));
  const newPrompts = BATCH_5.filter((p) => !existingIds.has(p.id));

  console.log(`Already in DB: ${BATCH_5.length - newPrompts.length}`);
  console.log(`New to insert: ${newPrompts.length}\n`);

  if (newPrompts.length === 0) {
    console.log("Nothing to insert. All prompts already exist in DB.");
    process.exit(0);
  }

  newPrompts.forEach((p) => console.log(`  ${p.id} — ${p.title} [${p.category}]`));

  if (dryRun) {
    console.log("\n--dry-run: No changes made.");
    process.exit(0);
  }

  // Insert in batches of 20
  const BATCH_SIZE = 20;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < newPrompts.length; i += BATCH_SIZE) {
    const batch = newPrompts.slice(i, i + BATCH_SIZE);

    const { error: insertError } = await supabase
      .from("curated_prompts")
      .upsert(batch, { onConflict: "id" });

    if (insertError) {
      console.error(`\nBatch insert failed: ${insertError.message}`);
      failed += batch.length;
    } else {
      inserted += batch.length;
      console.log(`\n  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} prompts`);
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Failed: ${failed}`);
  console.log("\nNext steps:");
  console.log("  1. node scripts/generate-thumbnails.mjs          # Generate thumbnail images");
  console.log("  2. node scripts/generate-thumbnails.mjs --upload  # Upload to Supabase Storage");
  console.log("  3. node scripts/sync-curated-prompts.mjs          # Re-sync TS file from DB");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
