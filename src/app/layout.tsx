import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-sans/latin-400.css";
import "@fontsource/instrument-sans/latin-600.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@brambach/design-tokens/tokens.css";
import "@brambach/design-tokens/themes/warm-paper.css";
import "./globals.css";
import { palette } from "@/lib/palette";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "comehome: lost pets around Tahoe and Truckee", template: "%s · comehome" },
  description:
    "Make one shareable page for a lost pet in five minutes. Neighbors report sightings without an account; you see where your pet is moving.",
};

export const viewport: Viewport = {
  themeColor: palette.paper,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="wrap site-head">
          <Link href="/" className="wordmark">
            comehome
          </Link>
        </header>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
