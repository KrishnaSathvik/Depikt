// Generates small programmatic reference-image fixtures for the benchmark.
// No image-generation model is used. Run: node tests/bench/fixtures/make-fixtures.mjs
import sharp from "sharp";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const dir = dirname(fileURLToPath(import.meta.url));

const svg = (w, h, body) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);

// 1. Transparent PNG: a simple badge/logo-like mark on a transparent background.
await sharp(
  svg(
    512,
    512,
    `
  <circle cx="256" cy="256" r="200" fill="#1f6feb"/>
  <polygon points="256,110 380,330 132,330" fill="#ffffff"/>
  <text x="256" y="440" font-family="Arial" font-size="64" font-weight="bold" fill="#1f6feb" text-anchor="middle">NOVA</text>
`,
  ),
)
  .png()
  .toFile(resolve(dir, "transparent-logo.png"));

// 2. Sketch / wireframe: rough landing-page hero layout with boxes and squiggles.
await sharp(
  svg(
    800,
    600,
    `
  <rect width="800" height="600" fill="#fbfbf7"/>
  <rect x="40" y="30" width="720" height="60" fill="none" stroke="#333" stroke-width="3" stroke-dasharray="6,4"/>
  <text x="60" y="70" font-family="Comic Sans MS, Arial" font-size="26" fill="#333">nav / logo left, links right</text>
  <rect x="40" y="120" width="420" height="300" fill="none" stroke="#333" stroke-width="3"/>
  <text x="60" y="170" font-family="Comic Sans MS, Arial" font-size="30" fill="#333">BIG HEADLINE</text>
  <text x="60" y="215" font-family="Comic Sans MS, Arial" font-size="22" fill="#333">subline text here</text>
  <rect x="60" y="260" width="180" height="50" fill="none" stroke="#333" stroke-width="3"/>
  <text x="80" y="293" font-family="Comic Sans MS, Arial" font-size="22" fill="#333">CTA button</text>
  <rect x="500" y="120" width="260" height="300" fill="none" stroke="#333" stroke-width="3"/>
  <line x1="500" y1="120" x2="760" y2="420" stroke="#333" stroke-width="2"/>
  <line x1="760" y1="120" x2="500" y2="420" stroke="#333" stroke-width="2"/>
  <text x="560" y="280" font-family="Comic Sans MS, Arial" font-size="22" fill="#333">product image</text>
  <rect x="40" y="450" width="220" height="110" fill="none" stroke="#333" stroke-width="3"/>
  <rect x="290" y="450" width="220" height="110" fill="none" stroke="#333" stroke-width="3"/>
  <rect x="540" y="450" width="220" height="110" fill="none" stroke="#333" stroke-width="3"/>
  <text x="60" y="510" font-family="Comic Sans MS, Arial" font-size="22" fill="#333">3 feature cards</text>
`,
  ),
)
  .png()
  .toFile(resolve(dir, "sketch-layout.png"));

// 3. Composition blocks: rule-of-thirds arrangement with a dominant left mass and a small right accent.
await sharp(
  svg(
    900,
    600,
    `
  <rect width="900" height="600" fill="#e9e4d8"/>
  <rect x="0" y="380" width="900" height="220" fill="#7a6f5d"/>
  <rect x="60" y="120" width="330" height="260" fill="#2f3a4a"/>
  <circle cx="720" cy="170" r="60" fill="#d9542b"/>
  <rect x="600" y="300" width="240" height="80" fill="#a89f8f"/>
`,
  ),
)
  .png()
  .toFile(resolve(dir, "composition-blocks.png"));

// 4. Product-like object: a matte bottle silhouette with a label on a plain backdrop.
await sharp(
  svg(
    600,
    800,
    `
  <rect width="600" height="800" fill="#f2f2f2"/>
  <rect x="220" y="120" width="160" height="80" rx="16" fill="#2b2b2b"/>
  <rect x="180" y="200" width="240" height="480" rx="40" fill="#3d7a5b"/>
  <rect x="210" y="330" width="180" height="200" fill="#f7f3e8"/>
  <text x="300" y="400" font-family="Georgia" font-size="34" fill="#2b2b2b" text-anchor="middle">VERDE</text>
  <text x="300" y="445" font-family="Arial" font-size="20" fill="#2b2b2b" text-anchor="middle">hand lotion</text>
  <text x="300" y="500" font-family="Arial" font-size="16" fill="#555" text-anchor="middle">250 ml</text>
`,
  ),
)
  .png()
  .toFile(resolve(dir, "product-bottle.png"));

// 5. Style reference: warm duotone gradient with grain-like dots, no subject.
await sharp(
  svg(
    800,
    600,
    `
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4a261"/><stop offset="1" stop-color="#264653"/></linearGradient></defs>
  <rect width="800" height="600" fill="url(#g)"/>
  ${Array.from({ length: 400 }, (_, i) => `<circle cx="${(i * 37) % 800}" cy="${(i * 91) % 600}" r="2" fill="#ffffff" opacity="0.25"/>`).join("")}
`,
  ),
)
  .png()
  .toFile(resolve(dir, "style-duotone.png"));

console.log("fixtures written");

// 6. Stylized character (identity fixture): distinctive, non-real features so
// identity-preservation prompts can be checked for concrete details.
await sharp(
  svg(
    600,
    700,
    `
  <rect width="600" height="700" fill="#dfe8f0"/>
  <ellipse cx="300" cy="360" rx="150" ry="180" fill="#f1c9a5"/>
  <path d="M150 300 Q300 120 450 300 L450 260 Q300 80 150 260 Z" fill="#2e8b57"/>
  <rect x="150" y="250" width="300" height="40" fill="#2e8b57"/>
  <circle cx="240" cy="360" r="42" fill="none" stroke="#d62828" stroke-width="12"/>
  <circle cx="360" cy="360" r="42" fill="none" stroke="#d62828" stroke-width="12"/>
  <line x1="282" y1="360" x2="318" y2="360" stroke="#d62828" stroke-width="12"/>
  <circle cx="240" cy="360" r="10" fill="#333"/>
  <circle cx="360" cy="360" r="10" fill="#333"/>
  <circle cx="210" cy="430" r="5" fill="#b5651d"/><circle cx="230" cy="445" r="5" fill="#b5651d"/><circle cx="250" cy="432" r="5" fill="#b5651d"/>
  <circle cx="350" cy="432" r="5" fill="#b5651d"/><circle cx="370" cy="445" r="5" fill="#b5651d"/><circle cx="390" cy="430" r="5" fill="#b5651d"/>
  <path d="M250 480 Q300 520 350 480" stroke="#8b3a3a" stroke-width="8" fill="none"/>
  <rect x="170" y="540" width="260" height="160" rx="20" fill="#f4a261"/>
`,
  ),
)
  .png()
  .toFile(resolve(dir, "character-portrait.png"));

// 7. App screenshot: a simple mobile settings screen with real labels, for
// "redesign this UI but keep every feature" cases.
await sharp(
  svg(
    390,
    844,
    `
  <rect width="390" height="844" fill="#ffffff"/>
  <rect width="390" height="90" fill="#f5f5f7"/>
  <text x="24" y="60" font-family="Arial" font-size="28" font-weight="bold" fill="#111">Settings</text>
  ${["Account", "Notifications", "Privacy", "Storage", "Language", "Help &amp; Support", "Log out"]
    .map(
      (l, i) => `
    <rect x="16" y="${110 + i * 84}" width="358" height="68" rx="12" fill="#f7f7f9"/>
    <text x="36" y="${152 + i * 84}" font-family="Arial" font-size="20" fill="#111">${l}</text>
    <text x="340" y="${152 + i * 84}" font-family="Arial" font-size="20" fill="#999">›</text>`,
    )
    .join("")}
  <rect x="0" y="760" width="390" height="84" fill="#f5f5f7"/>
  ${["Home", "Search", "Library", "Profile"].map((l, i) => `<text x="${48 + i * 98}" y="810" font-family="Arial" font-size="14" fill="#333" text-anchor="middle">${l}</text>`).join("")}
`,
  ),
)
  .png()
  .toFile(resolve(dir, "app-screenshot.png"));
console.log("extra fixtures written");
