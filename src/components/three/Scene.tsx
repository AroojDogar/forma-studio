"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls, ContactShadows, Environment, Float, Lightformer } from "@react-three/drei";
import { Sneaker } from "./Sneaker";
import { useStudio, type View } from "@/lib/store";
import type { Mood } from "@/lib/config";
import { setCanvas } from "@/lib/capture";

const VIEWS: Record<View, { pos: [number, number, number]; target: [number, number, number] }> = {
  home: { pos: [2.0, 1.7, 7.6], target: [0, 0.45, 0] },
  upper: { pos: [2.4, 1.9, 5.0], target: [0, 0.65, 0] },
  toe: { pos: [4.9, 1.7, 3.5], target: [0.9, 0.45, 0] },
  stripe: { pos: [0.1, 1.0, 5.0], target: [0, 0.6, 0] },
  heel: { pos: [-4.1, 1.6, 2.5], target: [-1.0, 0.7, 0] },
  tongue: { pos: [2.4, 3.5, 1.6], target: [0.1, 0.9, 0] },
  laces: { pos: [1.8, 3.8, 1.1], target: [0.2, 1.0, 0] },
  lining: { pos: [-2.6, 4.1, 0.5], target: [-0.45, 0.7, 0] },
  midsole: { pos: [0.6, 0.45, 5.0], target: [0, 0.3, 0] },
  outsole: { pos: [0.8, -4.3, 1.8], target: [0, 0.1, 0] },
};

const LIGHTS: Record<Mood, { key: string; rim: string; fill: string; shadow: string; keyI: number; rimI: number }> = {
  studio: { key: "#ffffff", rim: "#ffffff", fill: "#dfe6ee", shadow: "#2a2e35", keyI: 2.2, rimI: 2.5 },
  sunset: { key: "#ffd0a1", rim: "#ff7a5c", fill: "#f6b1c3", shadow: "#5a2a22", keyI: 2.4, rimI: 3.2 },
  neon: { key: "#bfe9ff", rim: "#ff3df2", fill: "#5b3bff", shadow: "#05030f", keyI: 2.0, rimI: 4.2 },
};

function Lighting() {
  const mood = useStudio((s) => s.mood);
  const l = LIGHTS[mood];
  return (
    <>
      <Environment resolution={256} frames={1} key={mood}>
        <Lightformer form="rect" intensity={l.keyI} color={l.key} position={[0, 5, 2]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={l.rimI} color={l.rim} position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} color={l.fill} position={[6, 1, 3]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="ring" intensity={1.5} color={l.key} position={[2, 3, 6]} scale={3} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.6} color={l.fill} position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>
      <ambientLight intensity={mood === "neon" ? 0.15 : 0.35} />
      <directionalLight position={[3, 6, 4]} intensity={mood === "neon" ? 0.6 : 1.2} color={l.key} />
      <ContactShadows position={[0, -0.32, 0]} opacity={mood === "neon" ? 0.75 : 0.45} scale={9} blur={2.8} far={3} resolution={512} color={l.shadow} frames={Infinity} />
    </>
  );
}

function Rig() {
  const ref = useRef<CameraControls>(null);
  const view = useStudio((s) => s.view);
  const ready = useStudio((s) => s.ready);
  const autoRotate = useStudio((s) => s.autoRotate);
  const exploded = useStudio((s) => s.exploded);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  // narrow screens need the camera further back to fit the whole shoe
  const fit = aspect < 1.2 ? Math.min(1.9, 1 + (1.2 - aspect) * 1.1) : 1;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    // opening shot: start wide and high, then sweep in
    c.setLookAt(7.5, 4.2, 9, 0, 0.55, 0, false);
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c || !ready) return;
    const v = VIEWS[view.target];
    const lift = exploded ? 0.35 : 0;
    const zoom = (exploded ? 1.25 : 1) * (v === VIEWS.home || exploded ? fit : Math.min(fit, 1.3));
    const [tx, ty, tz] = v.target;
    const [px, py, pz] = v.pos;
    c.setLookAt(
      tx + (px - tx) * zoom,
      ty + lift + (py - ty) * zoom,
      tz + (pz - tz) * zoom,
      tx,
      ty + lift,
      tz,
      true,
    );
  }, [view, ready, exploded, fit]);

  useFrame((_, delta) => {
    if (autoRotate && ref.current) ref.current.rotate(delta * 0.35, 0, false);
  });

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={2.4}
      maxDistance={16}
      smoothTime={0.55}
      draggingSmoothTime={0.12}
    />
  );
}

function Stage() {
  const group = useRef<THREE.Group>(null);
  const exploded = useStudio((s) => s.exploded);
  const setReady = useStudio((s) => s.setReady);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const t = setTimeout(setReady, 350);
    return () => clearTimeout(t);
  }, [setReady]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const ease = 1 - Math.exp(-delta * 3.2);
    g.position.y = THREE.MathUtils.lerp(g.position.y, exploded ? 0.4 : 0, ease);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, 0, ease);
    const s = THREE.MathUtils.lerp(g.scale.x, 1, ease);
    g.scale.setScalar(s);
  });

  return (
    <group ref={group} position={[0, 2.2, 0]} rotation={[0, -2.6, 0]} scale={0.6}>
      <Float speed={1.3} rotationIntensity={0.12} floatIntensity={0.35} floatingRange={[-0.04, 0.06]}>
        <group position={[0, -0.12, 0]}>
          <Sneaker />
        </group>
      </Float>
    </group>
  );
}

function CanvasBridge() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    setCanvas({ gl, scene, camera });
  }, [gl, scene, camera]);
  return null;
}

export default function Scene() {
  const hover = useStudio((s) => s.hover);
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 30, near: 0.1, far: 100, position: [7.5, 4.2, 9] }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onPointerMissed={() => hover(null)}
      aria-label="3D sneaker preview. Drag to rotate, scroll to zoom, click a part to customize it."
    >
      <CanvasBridge />
      <Lighting />
      <Stage />
      <Rig />
    </Canvas>
  );
}
