"use client";

// Material surface detail generated on the fly with <canvas>, so the project
// ships with zero texture files. Height patterns become normal maps.

import * as THREE from "three";

const SIZE = 256;

type Painter = (ctx: CanvasRenderingContext2D, size: number, rand: () => number) => void;

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function heightCanvas(paint: Painter, seed: number) {
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "rgb(128,128,128)";
  ctx.fillRect(0, 0, SIZE, SIZE);
  paint(ctx, SIZE, seeded(seed));
  return c;
}

function toNormalMap(src: HTMLCanvasElement, strength: number) {
  const ctx = src.getContext("2d")!;
  const h = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const out = document.createElement("canvas");
  out.width = out.height = SIZE;
  const octx = out.getContext("2d")!;
  const img = octx.createImageData(SIZE, SIZE);
  const at = (x: number, y: number) => h[(((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)) * 4] / 255;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * SIZE + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, inner: string, outer: string) {
  // draw wrapped so the texture tiles seamlessly
  for (const ox of [-SIZE, 0, SIZE]) {
    for (const oy of [-SIZE, 0, SIZE]) {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      g.addColorStop(0, inner);
      g.addColorStop(1, outer);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

const painters: Record<string, Painter> = {
  knit: (ctx, s) => {
    // rows of V-shaped stitches
    const cw = s / 16;
    const ch = s / 16;
    ctx.fillStyle = "rgb(70,70,70)";
    ctx.fillRect(0, 0, s, s);
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const x = c * cw + cw / 2;
        const y = r * ch + ch / 2;
        for (const dir of [-1, 1]) {
          ctx.save();
          ctx.translate(x + (dir * cw) / 4.2, y);
          ctx.rotate((dir * Math.PI) / 5.5);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ch * 0.55);
          g.addColorStop(0, "rgb(235,235,235)");
          g.addColorStop(1, "rgb(70,70,70)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(0, 0, cw * 0.2, ch * 0.56, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  },
  leather: (ctx, s, rand) => {
    for (let i = 0; i < 900; i++) {
      const r = 4 + rand() * 7;
      blob(ctx, rand() * s, rand() * s, r, "rgba(200,200,200,0.55)", "rgba(128,128,128,0)");
    }
    ctx.strokeStyle = "rgba(60,60,60,0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
      const x = rand() * s;
      const y = rand() * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + rand() * 20 - 10, y + rand() * 20 - 10, x + rand() * 30 - 15, y + rand() * 30 - 15, x + rand() * 40 - 20, y + rand() * 40 - 20);
      ctx.stroke();
    }
  },
  suede: (ctx, s, rand) => {
    const img = ctx.getImageData(0, 0, s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (rand() - 0.5) * 90;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
    ctx.globalAlpha = 0.5;
    ctx.filter = "blur(1px)";
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = "none";
    ctx.globalAlpha = 1;
  },
  canvas: (ctx, s) => {
    const n = 32;
    const w = s / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const over = (x + y) % 2 === 0;
        const g = over
          ? ctx.createLinearGradient(x * w, 0, x * w + w, 0)
          : ctx.createLinearGradient(0, y * w, 0, y * w + w);
        g.addColorStop(0, "rgb(80,80,80)");
        g.addColorStop(0.5, "rgb(210,210,210)");
        g.addColorStop(1, "rgb(80,80,80)");
        ctx.fillStyle = g;
        ctx.fillRect(x * w, y * w, w, w);
      }
    }
  },
  textile: (ctx, s) => {
    ctx.fillStyle = "rgb(110,110,110)";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "rgb(170,170,170)";
    const n = 48;
    const w = s / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        ctx.beginPath();
        ctx.arc(x * w + w / 2 + (y % 2) * (w / 2), y * w + w / 2, w * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  tread: (ctx, s) => {
    // chevron lugs
    ctx.fillStyle = "rgb(40,40,40)";
    ctx.fillRect(0, 0, s, s);
    const rows = 8;
    const h = s / rows;
    ctx.fillStyle = "rgb(225,225,225)";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 4; c++) {
        const x = (c * s) / 4 + (r % 2) * (s / 8);
        const y = r * h;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 6);
        ctx.lineTo(x + s / 8, y + h / 2);
        ctx.lineTo(x + s / 4 - 4, y + 6);
        ctx.lineTo(x + s / 4 - 4, y + h - 6);
        ctx.lineTo(x + s / 8, y + h / 2 + h * 0.35);
        ctx.lineTo(x + 4, y + h - 6);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.filter = "blur(1.5px)";
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = "none";
  },
  foam: (ctx, s, rand) => {
    for (let i = 0; i < 400; i++) {
      blob(ctx, rand() * s, rand() * s, 3 + rand() * 4, "rgba(100,100,100,0.4)", "rgba(128,128,128,0)");
    }
  },
};

const STRENGTH: Record<string, number> = {
  knit: 3.2,
  leather: 2.2,
  suede: 1.6,
  canvas: 2.4,
  textile: 2.2,
  tread: 5,
  foam: 1.2,
};

const cache = new Map<string, THREE.Texture>();

export function normalMap(kind: keyof typeof painters, seed = 7): THREE.Texture {
  const key = `n:${kind}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const tex = new THREE.CanvasTexture(toNormalMap(heightCanvas(painters[kind], seed), STRENGTH[kind] ?? 2));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.NoColorSpace;
  cache.set(key, tex);
  return tex;
}

/** White base with dark flecks: multiplies with the part color. */
export function speckleMap(): THREE.Texture {
  const hit = cache.get("speckle");
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 512, 512);
  const rand = seeded(42);
  const inks = ["#1b1c1f", "#2f45d9", "#e2462f", "#1b1c1f"];
  for (let i = 0; i < 520; i++) {
    ctx.fillStyle = inks[Math.floor(rand() * inks.length)];
    ctx.beginPath();
    const r = 0.8 + rand() * 2.6;
    ctx.ellipse(rand() * 512, rand() * 512, r, r * (0.5 + rand() * 0.6), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set("speckle", tex);
  return tex;
}

/** Transparent texture with the initials for the heel decal. */
export function initialsTexture(text: string, color: string, fontFamily: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 256);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = 200;
  ctx.font = `800 ${size}px ${fontFamily}`;
  while (ctx.measureText(text).width > 470 && size > 40) {
    size -= 8;
    ctx.font = `800 ${size}px ${fontFamily}`;
  }
  ctx.fillText(text, 256, 136);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
