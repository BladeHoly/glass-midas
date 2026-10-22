// Ondine's product images, drawn from shapes and gradients: no photos. Each piece is a small SVG
// model whose colors come from its finish, so picking a finish really changes the picture. For
// every piece there are four views:
//
// - <id>-<finish>.svg: the piece, on a studio backdrop
// - <id>-<finish>-detail.svg: a close-up of the same drawing
// - <id>-plate.webp: its Chladni figure in sand on a plate, the frequency it's tuned to
// - <id>-box.svg: its box, printed with a harmonograph
import fs from 'node:fs';
import sharp from 'sharp';
import { products } from '../src/shared/data.js';
import { harmonograph, round } from './figures.mjs';
import { hex, random } from './noise.mjs';

const toHex = (rgb) =>
  `#${rgb
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
/** Lighter (amount > 0) or darker (amount < 0) by mixing with white or black. */
const shade = (color, amount) => {
  const c = hex(color);
  const t = amount > 0 ? 255 : 0;
  return toHex(c.map((v) => v + (t - v) * Math.abs(amount)));
};

/** Gradients for a finish: the body, its rim light, and a soft sheen. */
function defs(color) {
  return `<defs>
    <radialGradient id="studio" cx="50%" cy="42%" r="70%">
      <stop offset="0" stop-color="#3a3158"/><stop offset="0.55" stop-color="#1b1729"/><stop offset="1" stop-color="#0d0b14"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#5fd0bf" stop-opacity="0.22"/><stop offset="1" stop-color="#5fd0bf" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${shade(color, 0.35)}"/><stop offset="0.45" stop-color="${color}"/><stop offset="1" stop-color="${shade(color, -0.55)}"/>
    </linearGradient>
    <linearGradient id="side" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${shade(color, -0.45)}"/><stop offset="0.5" stop-color="${shade(color, -0.15)}"/><stop offset="1" stop-color="${shade(color, -0.6)}"/>
    </linearGradient>
    <radialGradient id="cone" cx="45%" cy="40%" r="60%">
      <stop offset="0" stop-color="#4a4658"/><stop offset="0.7" stop-color="#1c1a24"/><stop offset="1" stop-color="#0c0b10"/>
    </radialGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f2efe8"/><stop offset="0.5" stop-color="#a9a6a0"/><stop offset="1" stop-color="#5c5a57"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.4" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>`;
}

const shadow = (cx, cy, rx, ry) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#shadow)"/>`;

/** Each piece, drawn in an 800 × 800 box, standing on the floor at y ≈ 640. */
const DRAW = {
  tide: () => `
    ${shadow(400, 650, 250, 34)}
    <path d="M190 470 C190 200 610 200 610 470" fill="none" stroke="url(#body)" stroke-width="34" stroke-linecap="round"/>
    <path d="M206 452 C214 236 586 236 594 452" fill="none" stroke="url(#sheen)" stroke-width="8" stroke-linecap="round"/>
    <path d="M232 300 C300 230 500 230 568 300" fill="none" stroke="#1a1820" stroke-width="22" stroke-linecap="round" opacity="0.85"/>
    ${[190, 610]
      .map(
        (x, i) => `<g transform="translate(${x} 0)">
      <rect x="-14" y="410" width="28" height="80" rx="12" fill="url(#side)"/>
      <ellipse cx="${i ? 18 : -18}" cy="520" rx="82" ry="104" fill="#16141c"/>
      <ellipse cx="${i ? 8 : -8}" cy="520" rx="78" ry="100" fill="url(#body)"/>
      <ellipse cx="${i ? 8 : -8}" cy="520" rx="58" ry="78" fill="${'url(#side)'}" opacity="0.6"/>
      <ellipse cx="${i ? -4 : 4}" cy="492" rx="40" ry="26" fill="url(#sheen)"/>
    </g>`,
      )
      .join('')}`,
  ripple: () => `
    ${shadow(400, 600, 230, 26)}
    <rect x="230" y="330" width="340" height="240" rx="96" fill="url(#body)"/>
    <path d="M242 400 H558" stroke="#000" stroke-opacity="0.3" stroke-width="3"/>
    <rect x="244" y="340" width="312" height="60" rx="40" fill="url(#sheen)"/>
    <circle cx="400" cy="500" r="7" fill="#7fe3cf"/>
    ${shadow(400, 668, 210, 18)}
    ${[
      [310, 610, -62],
      [492, 622, 58],
    ]
      .map(
        ([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})">
      <rect x="-13" y="0" width="26" height="84" rx="13" fill="url(#side)"/>
      <ellipse cx="0" cy="-6" rx="44" ry="40" fill="url(#body)"/>
      <ellipse cx="0" cy="-22" rx="22" ry="14" fill="#15131b"/>
      <ellipse cx="-10" cy="4" rx="18" ry="10" fill="url(#sheen)"/>
    </g>`,
      )
      .join('')}`,
  choir: () =>
    [235, 565]
      .map(
        (x) => `
    ${shadow(x, 650, 140, 22)}
    <rect x="${x - 120}" y="230" width="240" height="410" rx="18" fill="url(#body)"/>
    <rect x="${x - 120}" y="230" width="240" height="60" rx="18" fill="url(#sheen)"/>
    <circle cx="${x}" cy="320" r="34" fill="url(#cone)"/>
    <circle cx="${x}" cy="320" r="12" fill="#2b2833"/>
    <circle cx="${x}" cy="480" r="92" fill="#141219"/>
    <circle cx="${x}" cy="480" r="82" fill="url(#cone)"/>
    <circle cx="${x}" cy="480" r="28" fill="#222029"/>
    <circle cx="${x - 10}" cy="470" r="10" fill="#fff" opacity="0.12"/>`,
      )
      .join(''),
  ember: () => {
    const dots = [];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 16; col++)
        dots.push(
          `<circle cx="${236 + col * 22 + (row % 2) * 11}" cy="${440 + row * 22}" r="5" fill="#000" opacity="0.32"/>`,
        );
    }
    return `
    ${shadow(400, 640, 230, 28)}
    <rect x="200" y="380" width="400" height="250" rx="125" fill="url(#body)"/>
    ${dots.join('')}
    <rect x="216" y="390" width="368" height="70" rx="40" fill="url(#sheen)"/>
    <path d="M250 392 C250 280 550 280 550 392" fill="none" stroke="${'url(#side)'}" stroke-width="18" stroke-linecap="round"/>
    <circle cx="400" cy="408" r="8" fill="#fff" opacity="0.7"/>`;
  },
  orbit: () => `
    ${shadow(400, 640, 300, 30)}
    <rect x="110" y="300" width="580" height="330" rx="22" fill="url(#body)"/>
    <rect x="110" y="590" width="580" height="40" rx="12" fill="url(#side)"/>
    <circle cx="350" cy="450" r="140" fill="#0f0e13"/>
    ${Array.from({ length: 14 }, (_, i) => `<circle cx="350" cy="450" r="${132 - i * 6}" fill="none" stroke="#fff" stroke-opacity="${0.04 + (i % 3) * 0.02}"/>`).join('')}
    <circle cx="350" cy="450" r="46" fill="#5fd0bf"/>
    <circle cx="350" cy="450" r="6" fill="#e9e6ef"/>
    <path d="M300 410 a60 60 0 0 1 60 -30" stroke="#fff" stroke-opacity="0.25" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="590" cy="350" r="26" fill="url(#metal)"/>
    <path d="M590 350 L560 520 L470 560" fill="none" stroke="url(#metal)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="452" y="550" width="34" height="18" rx="4" fill="#2a2731" transform="rotate(-24 469 559)"/>`,
  lantern: () => `
    ${shadow(400, 640, 270, 28)}
    <rect x="150" y="420" width="500" height="210" rx="20" fill="url(#body)"/>
    <rect x="150" y="420" width="500" height="44" rx="20" fill="url(#sheen)"/>
    ${[290, 510]
      .map(
        (x) => `<g>
      <rect x="${x - 40}" y="402" width="80" height="26" rx="6" fill="#1a1820"/>
      <path d="M${x - 46} 404 C${x - 46} 270 ${x + 46} 270 ${x + 46} 404 Z" fill="#cfd8ff" opacity="0.18"/>
      <path d="M${x - 46} 404 C${x - 46} 270 ${x + 46} 270 ${x + 46} 404" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="3"/>
      <ellipse cx="${x}" cy="360" rx="20" ry="34" fill="#ff9a5c" opacity="0.65"/>
      <ellipse cx="${x}" cy="360" rx="8" ry="16" fill="#ffd9a8"/>
    </g>`,
      )
      .join('')}
    ${[230, 330, 470, 570].map((x) => `<circle cx="${x}" cy="540" r="22" fill="url(#metal)"/><path d="M${x} 540 l0 -16" stroke="#333" stroke-width="4" stroke-linecap="round"/>`).join('')}`,
  thread: () => {
    const strand = (phase) =>
      Array.from({ length: 61 }, (_, i) => {
        const t = i / 60;
        const x = 150 + t * 500;
        const y = 420 + Math.sin(t * Math.PI * 2.2) * 120 + Math.sin(t * Math.PI * 22 + phase) * 9;
        return `${i ? 'L' : 'M'}${round(x)} ${round(y)}`;
      }).join('');
    return `
    ${shadow(400, 640, 260, 22)}
    <path d="${strand(0)}" fill="none" stroke="url(#body)" stroke-width="20" stroke-linecap="round"/>
    <path d="${strand(Math.PI)}" fill="none" stroke="${'url(#side)'}" stroke-width="10" stroke-linecap="round" opacity="0.8"/>
    ${[
      [150, 420],
      [650, 420 + Math.sin(Math.PI * 2.2) * 120],
    ]
      .map(
        ([x, y], i) =>
          `<g transform="translate(${x} ${round(y)}) rotate(${i ? 20 : 200})"><rect x="0" y="-15" width="70" height="30" rx="8" fill="url(#metal)"/><rect x="70" y="-6" width="34" height="12" rx="3" fill="#c9c6c0"/></g>`,
      )
      .join('')}`;
  },
  vesper: () => `
    ${shadow(400, 640, 250, 26)}
    <rect x="200" y="440" width="230" height="74" rx="18" fill="url(#body)"/>
    <rect x="200" y="508" width="230" height="110" rx="10" fill="#2a2420"/>
    ${Array.from({ length: 30 }, (_, i) => `<path d="M${210 + i * 7} 518 v${88 + (i % 3) * 6}" stroke="#d8cbb0" stroke-opacity="0.55" stroke-width="2"/>`).join('')}
    <rect x="490" y="330" width="110" height="290" rx="26" fill="#d6e9e4" opacity="0.35"/>
    <rect x="502" y="400" width="86" height="208" rx="18" fill="#5fd0bf" opacity="0.45"/>
    <rect x="512" y="280" width="66" height="60" rx="10" fill="url(#side)"/>
    <rect x="502" y="440" width="86" height="80" fill="url(#body)"/>`,
};

function render(product, finish, { detail = false } = {}) {
  const view = detail ? DETAIL[product.id] : '0 0 800 800';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" role="img" aria-label="${product.name} in ${finish.name}">
  ${defs(finish.color)}
  <rect x="-400" y="-400" width="1600" height="1600" fill="url(#studio)"/>
  <ellipse cx="400" cy="420" rx="340" ry="300" fill="url(#glow)"/>
  ${DRAW[product.id]()}
</svg>`;
}

/** Where each close-up looks: the part worth seeing. */
const DETAIL = {
  tide: '400 300 340 340',
  ripple: '230 470 340 260',
  choir: '120 360 230 230',
  ember: '230 360 340 340',
  orbit: '200 300 300 300',
  lantern: '220 260 280 280',
  thread: '520 300 260 260',
  vesper: '190 420 260 260',
};

/** Sand on a plate, gathered where the plate is still. */
async function plate(product, out) {
  const [n, m] = product.figure;
  const rand = random(n * 31 + m);
  const S = 900;
  const f = (x, y) =>
    Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y) +
    Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y);
  const dots = [];
  while (dots.length < 9000) {
    const x = rand() * 2 - 1;
    const y = rand() * 2 - 1;
    const near = Math.exp(-Math.abs(f(x, y)) * 9);
    if (rand() < near)
      dots.push(
        `<circle cx="${round(S / 2 + x * S * 0.44)}" cy="${round(S / 2 + y * S * 0.44)}" r="${round(1 + rand() * 1.6)}"/>`,
      );
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
    <defs><radialGradient id="p" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#2c2a33"/><stop offset="1" stop-color="#0e0d12"/></radialGradient></defs>
    <rect width="${S}" height="${S}" fill="#0b0a10"/>
    <rect x="${S * 0.04}" y="${S * 0.04}" width="${S * 0.92}" height="${S * 0.92}" rx="18" fill="url(#p)"/>
    <g fill="#efe6d2" fill-opacity="0.85">${dots.join('')}</g>
  </svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 78 }).toFile(`${out}/${product.id}-plate.webp`);
}

/** The box: matte, the name, and the piece's harmonograph printed across it. */
function box(product, index) {
  const face = product.finishes[0].color;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${product.name}'s box">
  ${defs(face)}
  <rect width="800" height="800" fill="url(#studio)"/>
  ${shadow(400, 660, 260, 30)}
  <path d="M170 250 L400 170 L630 250 L400 330 Z" fill="${shade('#e9e3d6', -0.05)}"/>
  <path d="M170 250 L400 330 L400 650 L170 570 Z" fill="#d9d1c1"/>
  <path d="M630 250 L400 330 L400 650 L630 570 Z" fill="#bdb4a3"/>
  <g transform="matrix(1 0.35 0 1 170 250)"><g transform="translate(14 30) scale(0.42)">
    <path d="${harmonograph(index * 7 + 3, 480, 3200)}" fill="none" stroke="#1d1a24" stroke-width="1.6" opacity="0.75"/>
  </g></g>
  <g transform="matrix(1 -0.35 0 1 400 330)">
    <text x="115" y="150" text-anchor="middle" font-family="Georgia, serif" font-size="42" letter-spacing="6" fill="#1d1a24">${product.name.toUpperCase()}</text>
    <text x="115" y="190" text-anchor="middle" font-family="Georgia, serif" font-size="16" letter-spacing="4" fill="#1d1a24" opacity="0.7">ONDINE</text>
  </g>
</svg>`;
}

export async function renderProducts(out) {
  for (const [i, p] of products.entries()) {
    for (const f of p.finishes) {
      const slug = f.name.toLowerCase();
      fs.writeFileSync(`${out}/${p.id}-${slug}.svg`, render(p, f));
      fs.writeFileSync(`${out}/${p.id}-${slug}-detail.svg`, render(p, f, { detail: true }));
    }
    fs.writeFileSync(`${out}/${p.id}-box.svg`, box(p, i));
    await plate(p, out);
  }
}
