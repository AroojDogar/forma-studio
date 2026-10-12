import type { Metadata, Viewport } from "next";
// Self-hosted variable fonts: no request to Google at runtime.
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "@fontsource-variable/instrument-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forma Studio: design your own sneaker in 3D",
  description:
    "Customize every part of the Forma Runner 01 in real time: colors, materials, initials and lighting. Save, share and download your design.",
  openGraph: {
    title: "Forma Studio",
    description: "Design your own sneaker in 3D.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f7f3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
