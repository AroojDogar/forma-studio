"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Decal } from "@react-three/drei";
import { buildSneaker, initialsAnchor } from "@/lib/geometry";
import { normalMap, speckleMap, initialsTexture } from "@/lib/textures";
import { PART_IDS, type MatId, type PartId } from "@/lib/config";
import { useStudio } from "@/lib/store";

type Look = {
  roughness: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  sheenRoughness?: number;
  normal?: "knit" | "leather" | "suede" | "canvas" | "textile" | "tread" | "foam";
  normalScale?: number;
  repeat?: number;
  speckle?: boolean;
  iridescence?: number;
};

// How each material reads under light.
const LOOKS: Record<MatId, Look> = {
  knit: { roughness: 0.82, sheen: 0.5, sheenRoughness: 0.7, normal: "knit", normalScale: 0.7, repeat: 8 },
  leather: { roughness: 0.46, clearcoat: 0.3, clearcoatRoughness: 0.45, normal: "leather", normalScale: 0.35, repeat: 2.4 },
  suede: { roughness: 1, sheen: 1, sheenRoughness: 0.5, normal: "suede", normalScale: 0.45, repeat: 3.5 },
  patent: { roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03 },
  canvas: { roughness: 0.92, normal: "canvas", normalScale: 0.6, repeat: 4 },
  metallic: { roughness: 0.3, metalness: 0.65, clearcoat: 0.5, clearcoatRoughness: 0.1 },
  cotton: { roughness: 0.92, sheen: 0.4, sheenRoughness: 0.8, normal: "textile", normalScale: 0.7, repeat: 14 },
  waxed: { roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, normal: "textile", normalScale: 0.5, repeat: 14 },
  reflective: { roughness: 0.22, metalness: 0.7, iridescence: 0.6, normal: "textile", normalScale: 0.3, repeat: 14 },
  textile: { roughness: 0.9, sheen: 0.35, sheenRoughness: 0.8, normal: "textile", normalScale: 0.5, repeat: 9 },
  foam: { roughness: 0.72, normal: "foam", normalScale: 0.35, repeat: 2.5 },
  gloss: { roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.08 },
  speckled: { roughness: 0.7, normal: "foam", normalScale: 0.3, repeat: 2.5, speckle: true },
  rubber: { roughness: 0.86, normal: "tread", normalScale: 1.1, repeat: 1.5 },
  gum: { roughness: 0.48, clearcoat: 0.5, clearcoatRoughness: 0.3, normal: "tread", normalScale: 1.1, repeat: 1.5 },
};

function styleMaterial(m: THREE.MeshPhysicalMaterial, matId: MatId) {
  const look = LOOKS[matId];
  m.roughness = look.roughness;
  m.metalness = look.metalness ?? 0;
  m.clearcoat = look.clearcoat ?? 0;
  m.clearcoatRoughness = look.clearcoatRoughness ?? 0;
  m.sheen = look.sheen ?? 0;
  m.sheenRoughness = look.sheenRoughness ?? 1;
  m.iridescence = look.iridescence ?? 0;
  m.normalMap?.dispose();
  m.normalMap = null;
  m.map = null;
  if (look.normal) {
    const tex = normalMap(look.normal).clone();
    tex.repeat.set(look.repeat ?? 1, look.repeat ?? 1);
    tex.needsUpdate = true;
    m.normalMap = tex;
    m.normalScale.set(look.normalScale ?? 1, look.normalScale ?? 1);
  }
  if (look.speckle) {
    const tex = speckleMap().clone();
    tex.repeat.set(1.6, 1.6);
    tex.needsUpdate = true;
    m.map = tex;
  }
  m.needsUpdate = true;
}

// Where each part travels in exploded view: [x, y, z] offset and z scale.
const EXPLODE: Record<PartId, { offset: [number, number, number]; scaleZ?: number }> = {
  upper: { offset: [0, 0, 0] },
  toe: { offset: [0.55, 0.18, 0] },
  stripe: { offset: [0, 0.05, 0], scaleZ: 1.45 },
  heel: { offset: [-0.55, 0.12, 0] },
  tongue: { offset: [0.1, 0.62, 0] },
  laces: { offset: [0.1, 1.05, 0] },
  lining: { offset: [-0.2, 0.32, 0] },
  midsole: { offset: [0, -0.48, 0] },
  outsole: { offset: [0, -0.92, 0] },
};

function displayFont() {
  if (typeof window === "undefined") return "sans-serif";
  const v = getComputedStyle(document.body).getPropertyValue("--font-display").trim();
  return v || "sans-serif";
}

export function Sneaker() {
  const geo = useMemo(() => buildSneaker(), []);
  const design = useStudio((s) => s.design);
  const hovered = useStudio((s) => s.hovered);
  const selected = useStudio((s) => s.selected);
  const exploded = useStudio((s) => s.exploded);

  const materials = useMemo(() => {
    const out = {} as Record<PartId, THREE.MeshPhysicalMaterial>;
    for (const id of PART_IDS) {
      out[id] = new THREE.MeshPhysicalMaterial({
        color: design.parts[id].color,
        side: id === "tongue" || id === "heel" ? THREE.DoubleSide : THREE.FrontSide,
      });
      styleMaterial(out[id], design.parts[id].mat);
    }
    out.lining.side = THREE.BackSide;
    return out;
    // materials are created once and then updated in place
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Collar padding and insole share the lining look but render front faces.
  const liningFront = useMemo(() => {
    const m = materials.lining.clone();
    m.side = THREE.FrontSide;
    return m;
  }, [materials]);

  const eyeletMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#8a8d93", metalness: 1, roughness: 0.3 }),
    [],
  );

  // Apply material type changes right away; colors blend over a few frames.
  const applied = useRef<Record<string, MatId>>({});
  useEffect(() => {
    for (const id of PART_IDS) {
      const mat = design.parts[id].mat;
      if (applied.current[id] !== mat) {
        styleMaterial(materials[id], mat);
        if (id === "lining") {
          styleMaterial(liningFront, mat);
        }
        applied.current[id] = mat;
      }
    }
  }, [design, materials, liningFront]);

  const targetColors = useMemo(() => {
    const out = {} as Record<PartId, THREE.Color>;
    for (const id of PART_IDS) out[id] = new THREE.Color(design.parts[id].color);
    return out;
  }, [design]);

  const groups = useRef({} as Record<PartId, THREE.Group | null>);
  const pulse = useRef(0);
  const lastSelected = useRef(selected);
  useEffect(() => {
    if (lastSelected.current !== selected) {
      pulse.current = 1;
      lastSelected.current = selected;
    }
  }, [selected]);

  const white = useMemo(() => new THREE.Color("#ffffff"), []);

  useFrame((state, delta) => {
    const k = 1 - Math.exp(-delta * 9);
    pulse.current = Math.max(0, pulse.current - delta * 1.6);
    for (const id of PART_IDS) {
      const m = materials[id];
      m.color.lerp(targetColors[id], k);
      const glow =
        (hovered === id ? 0.07 + 0.03 * Math.sin(state.clock.elapsedTime * 6) : 0) +
        (selected === id ? pulse.current * 0.25 : 0);
      m.emissive.copy(white);
      m.emissiveIntensity = THREE.MathUtils.lerp(m.emissiveIntensity, glow, k);
      if (id === "lining") {
        liningFront.color.copy(m.color);
        liningFront.emissive.copy(white);
        liningFront.emissiveIntensity = m.emissiveIntensity;
      }

      const g = groups.current[id];
      if (g) {
        const e = EXPLODE[id];
        const f = exploded ? 1 : 0;
        const ease = 1 - Math.exp(-delta * 5);
        g.position.x = THREE.MathUtils.lerp(g.position.x, e.offset[0] * f, ease);
        g.position.y = THREE.MathUtils.lerp(g.position.y, e.offset[1] * f, ease);
        g.position.z = THREE.MathUtils.lerp(g.position.z, e.offset[2] * f, ease);
        const sz = exploded ? (e.scaleZ ?? 1) : 1;
        g.scale.z = THREE.MathUtils.lerp(g.scale.z, sz, ease);
      }
    }
  });

  const hover = useStudio((s) => s.hover);
  const select = useStudio((s) => s.select);

  const handlers = (id: PartId) => ({
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      hover(id);
      document.body.style.cursor = "pointer";
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (useStudio.getState().hovered === id) hover(null);
      document.body.style.cursor = "";
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (e.delta > 6) return; // was a drag, not a click
      select(id);
    },
  });

  const setGroup = (id: PartId) => (g: THREE.Group | null) => {
    groups.current[id] = g;
  };

  // ----- initials decal -----
  const [font, setFont] = useState("sans-serif");
  useEffect(() => {
    document.fonts?.ready.then(() => setFont(displayFont()));
  }, []);
  const initialsTex = useMemo(
    () => (design.initials ? initialsTexture(design.initials, design.initialsColor, font) : null),
    [design.initials, design.initialsColor, font],
  );
  useEffect(() => () => initialsTex?.dispose(), [initialsTex]);
  const anchor = useMemo(() => initialsAnchor(), []);

  return (
    <group>
      <group ref={setGroup("outsole")} {...handlers("outsole")}>
        <mesh geometry={geo.outsole} material={materials.outsole} castShadow />
      </group>
      <group ref={setGroup("midsole")} {...handlers("midsole")}>
        <mesh geometry={geo.midsole} material={materials.midsole} castShadow />
      </group>
      <group ref={setGroup("upper")} {...handlers("upper")}>
        <mesh geometry={geo.upper} material={materials.upper} castShadow />
        <mesh geometry={geo.eyelets} material={eyeletMat} />
      </group>
      <group ref={setGroup("lining")} {...handlers("lining")}>
        <mesh geometry={geo.lining} material={materials.lining} />
        <mesh geometry={geo.collar} material={liningFront} castShadow />
        <mesh geometry={geo.insole} material={liningFront} />
      </group>
      <group ref={setGroup("toe")} {...handlers("toe")}>
        <mesh geometry={geo.toe} material={materials.toe} castShadow />
      </group>
      <group ref={setGroup("stripe")} {...handlers("stripe")}>
        <mesh geometry={geo.stripe} material={materials.stripe} />
      </group>
      <group ref={setGroup("heel")} {...handlers("heel")}>
        <mesh geometry={geo.heel} material={materials.heel} castShadow>
          {initialsTex && (
            <Decal
              position={anchor.position}
              rotation={[0, 0, 0]}
              scale={[0.42, 0.21, 0.3]}
              depthTest
            >
              <meshPhysicalMaterial
                map={initialsTex}
                transparent
                roughness={0.35}
                clearcoat={0.6}
                polygonOffset
                polygonOffsetFactor={-12}
                depthWrite={false}
              />
            </Decal>
          )}
        </mesh>
        <mesh geometry={geo.pullTab} material={materials.heel} castShadow />
      </group>
      <group ref={setGroup("tongue")} {...handlers("tongue")}>
        <mesh geometry={geo.tongue} material={materials.tongue} castShadow />
        <mesh geometry={geo.tongueEdge} material={materials.tongue} />
      </group>
      <group ref={setGroup("laces")} {...handlers("laces")}>
        <mesh geometry={geo.laces} material={materials.laces} castShadow />
      </group>
    </group>
  );
}
