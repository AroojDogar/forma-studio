"use client";

import dynamic from "next/dynamic";
import { Splash } from "./ui/Splash";

// The studio uses WebGL and browser storage, so it only renders in the browser.
const Studio = dynamic(() => import("./Studio"), {
  ssr: false,
  loading: () => <Splash visible />,
});

export function StudioLoader() {
  return <Studio />;
}
