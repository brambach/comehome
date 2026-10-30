/**
 * Shrinks a phone photo before upload so it gets through on one bar of
 * signal (and under serverless body limits). The server still runs
 * stripExif on whatever arrives; this is about bytes, not privacy.
 */
export async function shrinkImage(file: File, maxEdge = 1600): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // unsupported format in this browser: let the server try
  }
}

/** "2026-10-17T09:30" for a datetime-local input, in the browser's zone. */
export function localDateTimeValue(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localValueToIso(value: string): string {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export type ApiResult<T> = ({ ok: true } & T) | { ok: false; errors: Record<string, string> };

export async function postForm<T>(url: string, body: FormData): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, { method: "POST", body });
    const json = await res.json().catch(() => null);
    if (json) return json;
    return { ok: false, errors: { form: "Something went wrong on our end. Try again." } };
  } catch {
    return { ok: false, errors: { form: "No connection. Your answers are still here; try again when you have signal." } };
  }
}
