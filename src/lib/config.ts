// Everything that describes a design: parts, materials, colors, presets, pricing
// and the compact encoding used for share links.

export const PART_IDS = [
  "upper",
  "toe",
  "stripe",
  "heel",
  "tongue",
  "laces",
  "lining",
  "midsole",
  "outsole",
] as const;

export type PartId = (typeof PART_IDS)[number];

export const MAT_IDS = [
  "knit",
  "leather",
  "suede",
  "patent",
  "canvas",
  "metallic",
  "cotton",
  "waxed",
  "reflective",
  "textile",
  "foam",
  "gloss",
  "speckled",
  "rubber",
  "gum",
] as const;

export type MatId = (typeof MAT_IDS)[number];

export type PartSpec = { color: string; mat: MatId };

export type Design = {
  name: string;
  parts: Record<PartId, PartSpec>;
  initials: string;
  initialsColor: string;
};

export type Mood = "studio" | "sunset" | "neon";

export const PARTS: Record<
  PartId,
  { label: string; hint: string; mats: MatId[] }
> = {
  upper: {
    label: "Upper",
    hint: "The main body that wraps your foot.",
    mats: ["knit", "leather", "suede", "canvas"],
  },
  toe: {
    label: "Toe cap",
    hint: "The overlay that protects the front.",
    mats: ["leather", "suede", "patent", "knit"],
  },
  stripe: {
    label: "Side stripe",
    hint: "The sweeping Forma mark on both sides.",
    mats: ["leather", "patent", "metallic", "suede"],
  },
  heel: {
    label: "Heel",
    hint: "Heel counter and pull tab.",
    mats: ["leather", "suede", "patent"],
  },
  tongue: {
    label: "Tongue",
    hint: "Padded tongue under the laces.",
    mats: ["knit", "suede", "leather"],
  },
  laces: {
    label: "Laces",
    hint: "Flat laces with a tied bow.",
    mats: ["cotton", "waxed", "reflective"],
  },
  lining: {
    label: "Lining",
    hint: "Inside lining, collar padding and insole.",
    mats: ["textile", "suede"],
  },
  midsole: {
    label: "Midsole",
    hint: "The foam cushioning under the upper.",
    mats: ["foam", "gloss", "speckled"],
  },
  outsole: {
    label: "Outsole",
    hint: "Rubber grip on the bottom.",
    mats: ["rubber", "gum"],
  },
};

export const MATERIALS: Record<MatId, { label: string; price: number }> = {
  knit: { label: "Engineered knit", price: 0 },
  leather: { label: "Full-grain leather", price: 10 },
  suede: { label: "Suede", price: 12 },
  patent: { label: "Patent leather", price: 18 },
  canvas: { label: "Canvas", price: 0 },
  metallic: { label: "Metallic", price: 8 },
  cotton: { label: "Cotton", price: 0 },
  waxed: { label: "Waxed cotton", price: 4 },
  reflective: { label: "Reflective", price: 6 },
  textile: { label: "Textile", price: 0 },
  foam: { label: "Matte foam", price: 0 },
  gloss: { label: "Gloss foam", price: 5 },
  speckled: { label: "Speckled foam", price: 6 },
  rubber: { label: "Rubber", price: 0 },
  gum: { label: "Gum rubber", price: 8 },
};

export const SWATCHES: { name: string; hex: string }[] = [
  { name: "Chalk", hex: "#f3f2ee" },
  { name: "Bone", hex: "#e7dfcf" },
  { name: "Fog", hex: "#bfc3c2" },
  { name: "Slate", hex: "#6e7479" },
  { name: "Graphite", hex: "#2b2d31" },
  { name: "Jet", hex: "#121315" },
  { name: "Cobalt", hex: "#2f45d9" },
  { name: "Sky", hex: "#8fc2eb" },
  { name: "Teal", hex: "#127a7a" },
  { name: "Sage", hex: "#9cb59a" },
  { name: "Moss", hex: "#4c5f3a" },
  { name: "Volt", hex: "#d8f23a" },
  { name: "Sun", hex: "#f5b82e" },
  { name: "Ember", hex: "#e2462f" },
  { name: "Brick", hex: "#8e3b2e" },
  { name: "Blush", hex: "#f2b8c0" },
  { name: "Orchid", hex: "#a56bd6" },
  { name: "Tan", hex: "#c49a6c" },
  { name: "Cocoa", hex: "#5e3f2c" },
  { name: "Gold", hex: "#c9a45c" },
];

export function colorName(hex: string): string {
  const found = SWATCHES.find((s) => s.hex.toLowerCase() === hex.toLowerCase());
  return found ? found.name : `Custom ${hex.toUpperCase()}`;
}

export const BASE_PRICE = 160;
export const INITIALS_PRICE = 12;

export function priceOf(d: Design): number {
  let p = BASE_PRICE;
  for (const id of PART_IDS) p += MATERIALS[d.parts[id].mat].price;
  if (d.initials.trim()) p += INITIALS_PRICE;
  return p;
}

type PresetParts = Record<PartId, [string, MatId]>;

function preset(name: string, parts: PresetParts, initialsColor = "#121315"): Design {
  const out = {} as Record<PartId, PartSpec>;
  for (const id of PART_IDS) out[id] = { color: parts[id][0], mat: parts[id][1] };
  return { name, parts: out, initials: "", initialsColor };
}

export const PRESETS: Design[] = [
  preset("Arctic", {
    upper: ["#f3f2ee", "knit"],
    toe: ["#f3f2ee", "leather"],
    stripe: ["#2f45d9", "patent"],
    heel: ["#bfc3c2", "leather"],
    tongue: ["#f3f2ee", "knit"],
    laces: ["#f3f2ee", "cotton"],
    lining: ["#8fc2eb", "textile"],
    midsole: ["#f3f2ee", "foam"],
    outsole: ["#bfc3c2", "rubber"],
  }, "#2f45d9"),
  preset("Midnight", {
    upper: ["#2b2d31", "knit"],
    toe: ["#121315", "suede"],
    stripe: ["#c9a45c", "metallic"],
    heel: ["#121315", "leather"],
    tongue: ["#2b2d31", "knit"],
    laces: ["#121315", "waxed"],
    lining: ["#2f45d9", "textile"],
    midsole: ["#2b2d31", "gloss"],
    outsole: ["#121315", "rubber"],
  }, "#c9a45c"),
  preset("Volt", {
    upper: ["#121315", "knit"],
    toe: ["#121315", "patent"],
    stripe: ["#d8f23a", "patent"],
    heel: ["#2b2d31", "suede"],
    tongue: ["#121315", "knit"],
    laces: ["#d8f23a", "cotton"],
    lining: ["#d8f23a", "textile"],
    midsole: ["#f3f2ee", "speckled"],
    outsole: ["#121315", "rubber"],
  }, "#d8f23a"),
  preset("Sakura", {
    upper: ["#f2b8c0", "knit"],
    toe: ["#e7dfcf", "suede"],
    stripe: ["#f3f2ee", "leather"],
    heel: ["#f2b8c0", "suede"],
    tongue: ["#e7dfcf", "knit"],
    laces: ["#f3f2ee", "cotton"],
    lining: ["#a56bd6", "textile"],
    midsole: ["#e7dfcf", "foam"],
    outsole: ["#c8874a", "gum"],
  }, "#a56bd6"),
  preset("Desert", {
    upper: ["#c49a6c", "suede"],
    toe: ["#5e3f2c", "suede"],
    stripe: ["#e7dfcf", "leather"],
    heel: ["#5e3f2c", "leather"],
    tongue: ["#c49a6c", "suede"],
    laces: ["#e7dfcf", "waxed"],
    lining: ["#9cb59a", "textile"],
    midsole: ["#e7dfcf", "foam"],
    outsole: ["#c8874a", "gum"],
  }, "#5e3f2c"),
  preset("Ember", {
    upper: ["#f3f2ee", "leather"],
    toe: ["#e2462f", "leather"],
    stripe: ["#e2462f", "patent"],
    heel: ["#e2462f", "leather"],
    tongue: ["#f3f2ee", "leather"],
    laces: ["#f3f2ee", "cotton"],
    lining: ["#2b2d31", "textile"],
    midsole: ["#f3f2ee", "foam"],
    outsole: ["#8e3b2e", "rubber"],
  }, "#f3f2ee"),
];

export const DEFAULT_DESIGN: Design = { ...PRESETS[0], name: "My Forma 01" };

export function cloneDesign(d: Design): Design {
  return JSON.parse(JSON.stringify(d));
}

// ---------- share-link encoding ----------
// Compact form: name | initials | initialsColor | part1Color.matIndex,part2...
function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const HEX = /^#[0-9a-f]{6}$/i;

export function encodeDesign(d: Design): string {
  const parts = PART_IDS.map(
    (id) => `${d.parts[id].color.slice(1)}.${MAT_IDS.indexOf(d.parts[id].mat)}`,
  ).join(",");
  return b64urlEncode(
    [d.name, d.initials, d.initialsColor.slice(1), parts].join("|"),
  );
}

export function decodeDesign(code: string): Design | null {
  try {
    const [name, initials, ic, partsStr] = b64urlDecode(code).split("|");
    const items = partsStr.split(",");
    if (items.length !== PART_IDS.length) return null;
    const parts = {} as Record<PartId, PartSpec>;
    PART_IDS.forEach((id, i) => {
      const [hex, mi] = items[i].split(".");
      const color = `#${hex}`;
      const mat = MAT_IDS[Number(mi)];
      if (!HEX.test(color) || !mat || !PARTS[id].mats.includes(mat)) throw new Error("bad");
      parts[id] = { color, mat };
    });
    const initialsColor = HEX.test(`#${ic}`) ? `#${ic}` : "#121315";
    return {
      name: (name || "Shared design").slice(0, 32),
      initials: (initials || "").slice(0, 4).toUpperCase(),
      initialsColor,
      parts,
    };
  } catch {
    return null;
  }
}

export const SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];
