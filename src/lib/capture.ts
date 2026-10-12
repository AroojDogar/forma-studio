"use client";

import type * as THREE from "three";
import type { Design, Mood } from "./config";
import { priceOf } from "./config";

type Bridge = { gl: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera };
let bridge: Bridge | null = null;

export function setCanvas(b: Bridge) {
  bridge = b;
}

export const MOOD_BG: Record<Mood, [string, string, string]> = {
  // top, bottom, ink
  studio: ["#f2f3ef", "#c9cec7", "#1c1f26"],
  sunset: ["#fde3c2", "#c8605a", "#2a1410"],
  neon: ["#2a1d5c", "#06040e", "#f1eefe"],
};

function freshFrame(): HTMLCanvasElement | null {
  if (!bridge) return null;
  bridge.gl.render(bridge.scene, bridge.camera);
  return bridge.gl.domElement;
}

/** Small JPEG of the current view for saved designs and the bag. */
export function thumbnail(mood: Mood, w = 360, h = 240): string {
  const src = freshFrame();
  if (!src) return "";
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const [top, bottom] = MOOD_BG[mood];
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  drawCover(ctx, src, w, h, 1.6);
  return c.toDataURL("image/jpeg", 0.82);
}

function drawCover(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, w: number, h: number, zoom = 1) {
  // fit the whole frame, then zoom in a little: the shoe sits in the middle of the canvas
  const scale = Math.min(w / src.width, h / src.height) * zoom;
  const dw = src.width * scale;
  const dh = src.height * scale;
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** Poster-style PNG: mood background, the shoe, design name, price. */
export async function poster(design: Design, mood: Mood): Promise<Blob | null> {
  const src = freshFrame();
  if (!src) return null;
  const W = 1600;
  const H = 1000;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const [top, bottom, ink] = MOOD_BG[mood];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const display = getComputedStyle(document.body).getPropertyValue("--font-display").trim() || "sans-serif";
  const body = getComputedStyle(document.body).getPropertyValue("--font-body").trim() || "sans-serif";

  // giant outlined model name behind the shoe
  ctx.save();
  ctx.font = `800 360px ${display}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.14;
  ctx.lineWidth = 3;
  ctx.strokeText("FORMA 01", W / 2, H / 2 - 20);
  ctx.restore();

  drawCover(ctx, src, W, H, 1.25);

  ctx.fillStyle = ink;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `800 44px ${display}`;
  ctx.fillText("forma", 64, 96);
  ctx.font = `500 26px ${body}`;
  ctx.globalAlpha = 0.7;
  ctx.fillText("Runner 01, designed by you", 64, 134);
  ctx.globalAlpha = 1;

  ctx.textAlign = "right";
  ctx.font = `700 40px ${display}`;
  ctx.fillText(design.name, W - 64, H - 92);
  ctx.font = `500 26px ${body}`;
  ctx.globalAlpha = 0.7;
  ctx.fillText(`$${priceOf(design)}`, W - 64, H - 56);
  ctx.globalAlpha = 1;

  return new Promise((resolve) => c.toBlob(resolve, "image/png"));
}
