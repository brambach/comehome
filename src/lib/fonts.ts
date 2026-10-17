import { readFile } from "node:fs/promises";
import path from "node:path";

// Copies of the @fontsource files the site uses, kept in the repo so the OG
// image and the flyer can read them at runtime. Paths stay literal so the
// bundler traces just these files (next.config.ts also includes them).
export const FONT_FILES = {
  fraunces600: path.join(process.cwd(), "assets/fonts/fraunces-latin-600-normal.woff"),
  hanken400: path.join(process.cwd(), "assets/fonts/hanken-grotesk-latin-400-normal.woff"),
  hanken700: path.join(process.cwd(), "assets/fonts/hanken-grotesk-latin-700-normal.woff"),
};

export async function loadFonts() {
  const [fraunces600, hanken400, hanken700] = await Promise.all([
    readFile(path.join(process.cwd(), "assets/fonts/fraunces-latin-600-normal.woff")),
    readFile(path.join(process.cwd(), "assets/fonts/hanken-grotesk-latin-400-normal.woff")),
    readFile(path.join(process.cwd(), "assets/fonts/hanken-grotesk-latin-700-normal.woff")),
  ]);
  return { fraunces600, hanken400, hanken700 };
}
