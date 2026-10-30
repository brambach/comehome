"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { localDateTimeValue, localValueToIso, postForm, shrinkImage } from "./clientImage";
import { PhotoInput } from "./PhotoInput";
import { PointPicker } from "./PointPicker";

type Errors = Record<string, string>;

export function CreatePetForm({ neighbors }: { neighbors: number }) {
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const when = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (when.current && !when.current.value) when.current.value = localDateTimeValue();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const raw = new FormData(form);
    const body = new FormData();
    for (const key of ["name", "species", "description", "lat", "lng", "ownerEmail", "website"]) {
      body.set(key, String(raw.get(key) ?? ""));
    }
    body.set("lastSeenAt", localValueToIso(String(raw.get("lastSeenAt") ?? "")));
    body.set("alertNeighbors", raw.get("alertNeighbors") ? "1" : "0");

    const local: Errors = {};
    if (!raw.get("lat")) local.lat = "Drop a pin where you last saw them.";
    const files = raw.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) local.photos = "Add at least one photo.";
    if (Object.keys(local).length) {
      setErrors(local);
      focusFirstError(form);
      return;
    }

    setBusy(true);
    setErrors({});
    for (const file of files.slice(0, 3)) body.append("photos", await shrinkImage(file), "photo.jpg");
    const res = await postForm<{ slug: string | null; token: string }>("/api/pets", body);
    if (res.ok && res.slug) {
      router.push(`/p/${res.slug}/edit?t=${encodeURIComponent(res.token)}&new=1`);
      return;
    }
    setBusy(false);
    if (!res.ok) {
      setErrors(res.errors);
      focusFirstError(form);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="stack" style={{ ["--space" as string]: "28px" }}>
      {errors.form ? (
        <p className="notice notice-error" role="alert">
          {errors.form}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="f-name">Pet&apos;s name</label>
        <input id="f-name" name="name" autoComplete="off" maxLength={40} required aria-invalid={!!errors.name} />
        {errors.name ? <p className="field-error">{errors.name}</p> : null}
      </div>

      <fieldset className="field">
        <legend>Species</legend>
        <div className="choices">
          {(["dog", "cat", "other"] as const).map((s) => (
            <label key={s} className="choice">
              <input type="radio" name="species" value={s} required />
              <span>{s[0].toUpperCase() + s.slice(1)}</span>
            </label>
          ))}
        </div>
        {errors.species ? <p className="field-error">{errors.species}</p> : null}
      </fieldset>

      <PhotoInput
        name="photos"
        label="Photos"
        hint="One to three. Clear, recent, face and full body if you have them."
        multiple
        max={3}
        error={errors.photos}
      />

      <div className="field">
        <label htmlFor="f-description">
          Description <span className="optional">(optional)</span>
        </label>
        <p className="hint" id="d-description">
          Color, size, collar, microchip. Will they come if called, or should people not chase?
        </p>
        <textarea id="f-description" name="description" maxLength={600} aria-describedby="d-description" />
      </div>

      <PointPicker
        label="Where did you last see them?"
        hint="Tap the map, or use your location if you're there now."
        error={errors.lat ?? errors.lng}
      />

      <div className="field">
        <label htmlFor="f-when">When</label>
        <input id="f-when" ref={when} type="datetime-local" name="lastSeenAt" required />
        {errors.lastSeenAt ? <p className="field-error">{errors.lastSeenAt}</p> : null}
      </div>

      <div className="field">
        <label htmlFor="f-email">Your email</label>
        <p className="hint" id="d-email">
          Private. We send your edit link here, and an email for every sighting.
        </p>
        <input
          id="f-email"
          type="email"
          name="ownerEmail"
          autoComplete="email"
          inputMode="email"
          required
          aria-describedby="d-email"
          aria-invalid={!!errors.ownerEmail}
        />
        {errors.ownerEmail ? <p className="field-error">{errors.ownerEmail}</p> : null}
      </div>

      <label className="check" htmlFor="f-alert">
        <input id="f-alert" type="checkbox" name="alertNeighbors" defaultChecked />
        <span>
          <strong>Alert neighbors near where you lost them</strong>
          <span className="hint">
            {neighbors > 0
              ? `${neighbors} people around Tahoe get comehome alerts. The ones whose area covers your pin get one text or email with the photo and the page link. Never your email.`
              : "People who signed up for alerts near your pin get one text or email with the photo and the page link. Never your email."}
          </span>
        </span>
      </label>

      <div className="hp" aria-hidden="true">
        <label htmlFor="f-website">Website</label>
        <input id="f-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" className="btn btn-block" disabled={busy}>
        {busy ? "Publishing…" : "Publish the page"}
      </button>
    </form>
  );
}

function focusFirstError(form: HTMLFormElement) {
  requestAnimationFrame(() => {
    const el = form.querySelector<HTMLElement>(".field-error, [role=alert]");
    el?.scrollIntoView({ block: "center" });
  });
}
