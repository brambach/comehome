import { put } from "@vercel/blob";
import type { Storage } from "./index";

/** Prod storage: Vercel Blob. Needs BLOB_READ_WRITE_TOKEN. */
export function blobStorage(): Storage {
  return {
    async put(key, data, contentType) {
      const res = await put(key, data, {
        access: "public",
        contentType,
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });
      return { url: res.url };
    },
  };
}
