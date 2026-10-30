import type { Storage } from "./index";

/** Demo storage: uploads live in this server's memory and vanish with it. */
const files = new Map<string, Buffer>();

export function memoryStorage(): Storage {
  return {
    async put(key, data) {
      files.set(key, data);
      if (files.size > 200) files.delete(files.keys().next().value!);
      return { url: `/uploads/${key}` };
    },
  };
}

export function readMemoryUpload(key: string): Buffer | null {
  return files.get(key) ?? null;
}
