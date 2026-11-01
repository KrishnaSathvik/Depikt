/**
 * Generate's inspiration wall: approved, gallery-ready ChatGPT Images 2.5
 * Library results whose recipe needs no reference image, so "Use prompt"
 * reproduces what is pictured. Extracted from the reviewed upserts in
 * supabase/insert-images-2-5-batch{1,2}-staged.sql (status = approved,
 * needs_reference_images = false, reference_mode = none, gallery_ready = true).
 * `idea` is the row's `user_input`, used by the Improve prompt showcase.
 * Images live in public/library/images-2-5/<slug>.webp.
 */

export interface InspirationItem {
  slug: string;
  title: string;
  category: string;
  /** The rough request the recipe was written from (Library `user_input`). */
  idea: string;
  prompt: string;
}

export const GENERATE_INSPIRATION: readonly InspirationItem[] = [
  {
    slug: "showa-travel-poster-exact-title",
    title: "Showa Travel Poster with Exact Title",
    category: "Posters",
    idea: "Vintage Japanese railway tourism poster for Kyoto with an exact title",
    prompt:
      'Create a vertical 3:4 travel poster for Kyoto in the style of a 1960s Japanese National Railways tourism advertisement.\n\nScene: the Yasaka Pagoda seen up a narrow stone lane at dusk, two stylised figures in kimono walking away from the viewer, a single lit paper lantern. Simplified architecture, bold geometric forms, strong silhouettes, clean perspective lines, generous sky.\n\nPrint treatment: flat printed colour fields, no digital gradients. Palette limited to deep navy, warm ivory paper, muted mustard and one vermilion accent. Add subtle paper grain, slight ink wear and a small misregistration offset so it reads as a screen print, not a photo with a filter.\n\nTypography: reserve the bottom fifth as clean negative space. Set the title "KYOTO" in a wide bold sans, letter-spaced, in navy. Beneath it, smaller, the subtitle "京都へ、汽車で。" in vermilion. Text appears only in these two places; nothing else in the image carries lettering.',
  },
  {
    slug: "impressionist-san-francisco",
    title: "Impressionist San Francisco Scene",
    category: "Open-Ended Creative",
    idea: "An impressionist oil painting of a San Francisco hill street toward the bay",
    prompt:
      "Impressionist oil painting, portrait 3:4: looking down a steep San Francisco street between pastel Victorian houses toward the bay, with the Golden Gate Bridge in the distance at the left and Coit Tower on its hill at the right. Bougainvillea on a wall in the foreground, a few parked cars, one white sailboat on the water.\n\nThick visible brushstrokes, broken colour, no hard outlines; a bright midday palette of cobalt, lilac, peach and olive with the bridge in vermilion. The sky is a flat field of strokes with no clouds. No text, no signature.",
  },
  {
    slug: "app-icon-set-six",
    title: "App Icon Set, One System",
    category: "UI Mockups",
    idea: "Six app icons that share one visual system, presented on a grid",
    prompt:
      "Design a set of six app icons for a fictional productivity suite, shown on one presentation board.\n\nSystem: rounded-square iOS-style icons, identical corner radius, each with a single flat white glyph centred on a two-tone background (one base colour plus a slightly darker diagonal split in the lower-right). Same glyph stroke weight across all six. No text, no letters as glyphs.\n\nThe six, left to right in two rows of three, each with its base colour: Notes (paper sheet glyph, warm yellow), Calendar (grid glyph, coral red), Tasks (check circle glyph, leaf green), Timer (stopwatch glyph, indigo), Files (folder glyph, sky blue), Mail (envelope glyph, slate grey).\n\nPresent them at equal size on a plain off-white board with even spacing and a soft contact shadow under each. Nothing else on the board.",
  },
  {
    slug: "board-game-box-cover",
    title: "Board Game Box Cover with Exact Title",
    category: "Posters",
    idea: "Square board-game box art with an exact title and player count badge",
    prompt:
      'Design the top of a square board-game box.\n\nTitle, exactly: "TIDEWATER" in a tall serif with a slight sea-worn texture, set in cream across the upper third. Beneath it, smaller, in the same cream: "A game of lighthouses and lost cargo".\n\nIllustration: a night harbour seen from above at an angle, three lighthouses sweeping beams across dark water, small cargo ships leaving glowing wakes, a coastline of stone cottages. Painterly, rich navy and teal with warm amber light, fine detail in the ships.\n\nBottom-right corner, a small round cream badge with three lines: "2–4", "45 MIN", "AGE 10+". Bottom-left, a thin cream frame line with no other text. Square 1:1, print-ready feel, no publisher logo.',
  },
  {
    slug: "mosaic-earth-and-stars",
    title: "Mosaic Earth and Stars",
    category: "Open-Ended Creative",
    idea: "A tile mosaic of Earth under a starry sky",
    prompt:
      "A tile mosaic, landscape 16:9, seen straight on: the curve of Earth fills the lower third with continents in green and ochre tesserae and oceans in three blues, cloud bands in white; above it a night sky of deep navy and cobalt tiles with gold eight-pointed stars, a ringed planet at the left, a spiral galaxy at the upper right and a small grey moon at the far right.\n\nEvery tile is an individual square or irregular piece of glass or stone with slight size variation, visible grout lines and small chips; light catches the gold tiles. No smooth gradients anywhere; all tone comes from tile colour. No text.",
  },
  {
    slug: "podcast-cover-art-exact-title",
    title: "Podcast Cover Art with Exact Title",
    category: "Posters",
    idea: "Square podcast cover that stays legible at thumbnail size",
    prompt:
      'Design a square podcast cover, 1:1, that must read at 64 pixels wide.\n\nTitle, exactly: "SLOW FIELDS" in a heavy geometric sans, two stacked lines, filling the top half, in off-white. Below it, small: "a walking podcast". No other text.\n\nArtwork: a bold flat-colour illustration of a single figure with a backpack walking along a ridge, seen from behind, against a huge low sun. Three colours only: deep forest green, burnt orange, off-white. No gradients, no photographic texture, no fine detail: every shape must survive being shrunk to an app icon.\n\nLeave a clear margin around the title; nothing overlaps the letters.',
  },
  {
    slug: "national-park-stamp-sheet",
    title: "National Park Stamp Sheet",
    category: "Posters",
    idea: "Eight vintage-style national park postage stamps in one sheet",
    prompt:
      'One image, landscape 3:2, on a black ground: eight postage stamps arranged in two rows of four with perforated edges and a thin cream border on each. Each stamp is a flat-colour illustration in a 1930s WPA travel-poster style with fine printed texture.\n\nEach stamp carries three lines of type: the park name large in a serif at the top left, "NATIONAL PARK" small and letter-spaced beneath it, the state at the top right, and a tagline in small capitals on a dark band at the bottom. Text and scenes, in order:\n\n1. "Yosemite" — "CALIFORNIA" — granite cliffs and a waterfall at sunrise — "GRANITE AND LIGHT"\n2. "Olympic" — "WASHINGTON" — mossy rainforest with a river — "FOREST TO THE SEA"\n3. "Arches" — "UTAH" — a red sandstone arch under stars — "STONE WINDOWS"\n4. "Badlands" — "SOUTH DAKOTA" — striped buttes at dusk — "LAYERS OF TIME"\n5. "Joshua Tree" — "CALIFORNIA" — Joshua trees and boulders at golden hour — "DESERT SILENCE"\n6. "Shenandoah" — "VIRGINIA" — blue ridges in mist — "BLUE HORIZONS"\n7. "Redwood" — "CALIFORNIA" — a road through giant trunks — "AMONG GIANTS"\n8. "Crater Lake" — "OREGON" — deep blue lake with Wizard Island — "BLUE BEYOND BLUE"\n\nEvery stamp uses the same layout and type sizes. No other text, no denominations.',
  },
  {
    slug: "six-expression-sticker-sheet",
    title: "Six-Expression Sticker Sheet",
    category: "Open-Ended Creative",
    idea: "One character, six expressions, as a transparent sticker sheet",
    prompt:
      "Create a sticker sheet of one original character: a round-faced orange cat in a tiny green knitted beanie, drawn in a clean kawaii style with thick dark-brown outlines and flat colours.\n\nSix stickers in a 3 x 2 grid, each showing the same character with a different expression, in this order: 1 delighted, 2 sleepy, 3 shocked, 4 smug, 5 crying-laughing, 6 confused. The character must be identical across all six: same beanie, same proportions, same outline weight, same palette. Only the face and small hand gestures change.\n\nEach sticker has a thick white die-cut border with a rounded outline. Even spacing, no overlap, no text, no numbers, no background: fully transparent PNG.",
  },
  {
    slug: "architectural-minimalist-poster-pavilion",
    title: "Architectural Minimalist Poster",
    category: "Posters",
    idea: "Clean architecture poster: one building, one giant word, small annotations",
    prompt:
      'Vertical 2:3 minimalist architecture poster, off-white ground. This is a flat graphic illustration, not a photograph or 3D render: no photographic lighting, no reflections, no gradients, no texture.\n\nSubject: the Barcelona Pavilion (Mies van der Rohe, 1929) drawn in exactly three flat tones: travertine cream for the walls, roof slab and paving; deep viridian for the green-marble wall; a single thin grey line for the chrome columns and edges. Slight elevation view showing the flat roof plane, the reflecting pool as one flat pale-blue shape, and one free-standing wall.\n\nBehind the building, one enormous word in a light-weight geometric sans, cropped by the left and right poster edges, in a grey only two steps darker than the ground: "PLANE".\n\nSmall annotations in a mono typeface, each placed near what it names with a thin leader line, in this exact wording: "roof plane, 1929" · "onyx and marble" · "eight cruciform columns" · "reflecting pool".\n\nNo other text. No frame, no logo, no date line.',
  },
  {
    slug: "tattoo-flash-sheet",
    title: "Traditional Tattoo Flash Sheet",
    category: "Open-Ended Creative",
    idea: "American-traditional flash sheet with nine designs and no lettering",
    prompt:
      "Design an American-traditional tattoo flash sheet on aged cream paper.\n\nNine designs arranged in a loose 3 x 3 layout with hand-placed spacing, each a self-contained tattoo: a swallow in flight, a dagger through a rose, a lighthouse with waves, a panther head, a ship's anchor with rope, a lit candle, a snake coiled around a heart, a compass rose, a single peony.\n\nStyle rules: bold black outlines of even weight, limited palette of red, golden yellow, forest green and black, solid fills with minimal shading, whip-shading only inside the black. Slight ink bleed and paper texture so it reads as a hand-painted sheet, not a vector file.\n\nNo banners with words, no lettering, no signature. Portrait orientation.",
  },
  {
    slug: "holiday-card-exact-greeting",
    title: "Holiday Card with Exact Greeting",
    category: "Posters",
    idea: "Printable 5x7 holiday card with a hand-lettered exact greeting",
    prompt:
      'Design the front of a 5 x 7 portrait holiday card.\n\nIllustration: a cosy winter scene in a warm gouache style, a small red cottage in deep snow at dusk, warm light in every window, a string of lights across the porch, pine trees behind, big soft snowflakes falling. Limited palette of cream, deep green, warm red and gold.\n\nGreeting, exactly, in hand-lettered brush script in cream across the sky area: "Warm wishes from our home to yours". Nothing else written anywhere on the card.\n\nLeave a quarter-inch clean margin for print bleed. No border line, no year, no names.',
  },
  {
    slug: "historical-illustrated-poster-silk-road",
    title: "Historical Illustrated Poster",
    category: "Posters",
    idea: "Editorial historical poster with an exact heading and subheading, map above, scene below",
    prompt:
      'Vertical 3:4 editorial poster on aged parchment.\n\nHeading, top centre, in a wide serif: "THE SILK ROAD". Directly beneath it, smaller, in small capitals: "CARAVANS OF THE TANG DYNASTY, 618–907". These are the only text elements.\n\nTop half: an illustrated map from Chang\'an westward through the Hexi Corridor, the Taklamakan\'s edge, Kashgar and Samarkand to Baghdad, drawn in ink with watercolour washes: route lines in vermilion, mountains in hatched sepia, oasis towns as small walled icons. No place names are lettered; the towns are marked only with icons.\n\nBottom half: a cinematic scene of a camel caravan leaving a walled oasis at first light, dust in the air, silk bales on the camels, watercolour and ink with realistic light and historically accurate Tang-era dress.\n\nA thin ruled line separates map and scene. Museum-quality illustration, restrained palette of sepia, vermilion, indigo and parchment.',
  },
  {
    slug: "aurora-explainer-slide",
    title: "Northern Lights Explainer Slide",
    category: "Visual Summaries",
    idea: "Presentation slide explaining a science topic with a four-step icon diagram",
    prompt:
      'A single 16:9 presentation slide, dark navy background, with a photographic image of the aurora over a snowy ridge filling the right third and fading into the slide colour.\n\nTop left, small letter-spaced label: "THE SUN\'S ENERGY, SEEN FROM EARTH". Below it, the title in a large serif on two lines: "What Causes" / "the Northern Lights?" with the second line in a pale green.\n\nBeneath the title, a short paragraph in a light sans: "Charged particles from the Sun are steered by Earth\'s magnetic field toward the poles, where they collide with gases in the upper atmosphere and make them glow."\n\nAlong the bottom, four steps in a row, each with a thin-line circular icon, a numbered caption in small capitals and one sentence beneath:\n"1. SOLAR WIND" — "The Sun streams charged particles into space."\n"2. MAGNETIC FIELD" — "Earth\'s field bends them toward the poles."\n"3. COLLISION" — "Particles strike oxygen and nitrogen high above the ground."\n"4. GLOW" — "Oxygen glows green and red; nitrogen adds blue and violet."\n\nThin arrows between the steps. Footer left: "small changes, a clearer sky". Footer right: "4". No other text.',
  },
  {
    slug: "nine-poster-grid",
    title: "3×3 Social Poster Grid",
    category: "Posters",
    idea: "A 3-by-3 grid of mid-century posters, each with its own exact slogan",
    prompt:
      'One image, portrait 3:4: a 3×3 grid of nine separate mid-century modern posters on an off-white ground, with even gutters between them. Each poster is its own composition of flat geometric shapes and one bold slogan, set in a different display style per poster (wide grotesque, rounded bubble type, condensed capitals, stencil, and so on).\n\nPalette across the whole grid: cobalt blue, tomato red, mustard yellow, pale pink, forest green and black on off-white. Exactly one poster may use a halftone photographic element (a single eye).\n\nSlogans, one per poster, reading left to right, top to bottom, spelled exactly:\n"WALK MORE"\n"MAKE SOMETHING"\n"GROW TOGETHER"\n"LISTEN FIRST"\n"REST WELL"\n"DRINK WATER"\n"LEARN DAILY"\n"LOOK CLOSER"\n"BE KIND"\n\nEach slogan is the only text on its poster. Shapes stay simple: sun, stairs, overlapping circles, leaf, profile faces, arch. No borders around the grid, no captions.',
  },
  {
    slug: "sticker-pack-poster",
    title: "Sticker-Pack Poster",
    category: "Posters",
    idea: "A vintage poster announcing a sticker pack, with a cat holding the sheet",
    prompt:
      'Vertical 2:3 poster on a flat royal-blue ground with a worn-paper finish: faint fold creases, a little edge wear, slightly soft ink.\n\nTop: the headline "STICKER CLUB" in very large condensed bold sans, bright yellow, two lines. Below it, smaller, in white: "New pack: eight stickers". Above the headline, small, in yellow: "ステッカークラブ".\n\nCentre: a black cat with yellow eyes sitting upright, photographic fur, holding a white sticker sheet in one paw and looking at the viewer. On the sheet, eight clearly separated die-cut stickers, each on its own: a speech bubble, a goldfish, a thumbs-up, a heart, a star, a small black cat face, a lightning bolt, a cloud. The sheet is tilted slightly toward the camera so every sticker is readable.\n\nDown the left edge, small vertical Japanese copy in yellow: "はって、つたえよう。"\n\nNo other text anywhere. No logos.',
  },
];
