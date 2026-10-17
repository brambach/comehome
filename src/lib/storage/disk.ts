import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Storage } from "./index";

/** Dev storage: files under .data/uploads, served by src/app/uploads/[...key]/route.ts. */
export const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

export function diskStorage(): Storage {
  return {
    async put(key, data) {
      const file = resolveKey(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, data);
      return { url: `/uploads/${key}` };
    },
  };
}

export function resolveKey(key: string): string {
  const file = path.resolve(UPLOAD_DIR, key);
  if (!file.startsWith(UPLOAD_DIR + path.sep)) throw new Error("bad key");
  return file;
}

export async function readUpload(key: string): Promise<Buffer | null> {
  try {
    return await readFile(resolveKey(key));
  } catch {
    return null;
  }
}
