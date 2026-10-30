"use server";

import { redirect } from "next/navigation";
import { confirmWatcher, stopWatcher, validStop, watcherById, watcherByToken } from "@/lib/neighbors";

export async function confirmAlerts(form: FormData) {
  const token = String(form.get("t") ?? "");
  const w = await watcherByToken(token);
  if (!w) redirect("/neighbors");
  await confirmWatcher(w);
  redirect(`/neighbors/you?t=${encodeURIComponent(token)}&on=1`);
}

export async function stopAlertsWithToken(form: FormData) {
  const token = String(form.get("t") ?? "");
  const w = await watcherByToken(token);
  if (!w) redirect("/neighbors");
  await stopWatcher(w);
  redirect(`/neighbors/you?t=${encodeURIComponent(token)}`);
}

export async function stopAlertsSigned(form: FormData) {
  const id = String(form.get("w") ?? "");
  const sig = String(form.get("s") ?? "");
  const w = /^[0-9a-f-]{36}$/.test(id) && validStop(id, sig) ? await watcherById(id) : null;
  if (!w) redirect("/neighbors");
  await stopWatcher(w);
  redirect(`/neighbors/stop?w=${id}&s=${encodeURIComponent(sig)}&done=1`);
}
