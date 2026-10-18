import { readFile } from "node:fs/promises";
import path from "node:path";

// Copies of the @fontsource files the site uses, kept in the repo so the OG
// image and the flyer can read them at runtime. Paths stay literal so the
// bundler traces just these files (next.config.ts also includes them).
export const FONT_FILES = {
  serif400: path.join(process.cwd(), "assets/fonts/instrument-serif-latin-400-normal.woff"),
  sans400: path.join(process.cwd(), "assets/fonts/instrument-sans-latin-400-normal.woff"),
  sans600: path.join(process.cwd(), "assets/fonts/instrument-sans-latin-600-normal.woff"),
};

export async function loadFonts() {
  const [serif400, sans400, sans600] = await Promise.all([
    readFile(path.join(process.cwd(), "assets/fonts/instrument-serif-latin-400-normal.woff")),
    readFile(path.join(process.cwd(), "assets/fonts/instrument-sans-latin-400-normal.woff")),
    readFile(path.join(process.cwd(), "assets/fonts/instrument-sans-latin-600-normal.woff")),
  ]);
  return { serif400, sans400, sans600 };
}
