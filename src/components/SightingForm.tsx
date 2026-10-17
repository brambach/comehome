"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { localDateTimeValue, localValueToIso, postForm, shrinkImage } from "./clientImage";
import { PhotoInput } from "./PhotoInput";
import { PointPicker } from "./PointPicker";

type Errors = Record<string, string>;

export function SightingForm({
  slug,
  name,
  centerLat,
  centerLng,
}: {
  slug: string;
  name: string;
  centerLat: number;
  centerLng: number;
}) {
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const when = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (when.current && !when.current.value) when.current.value = localDateTimeValue();
  }, [formKey]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = new FormData(e.currentTarget);
    if (!raw.get("lat")) {
      setErrors({ lat: `Tap the map where you saw ${name}, or use your location.` });
      return;
    }
    const body = new FormData();
    for (const key of ["lat", "lng", "note", "contact", "website"]) body.set(key, String(raw.get(key) ?? ""));
    body.set("seenAt", localValueToIso(String(raw.get("seenAt") ?? "")));
    const photo = raw.get("photo");
    setBusy(true);
    setErrors({});
    if (photo instanceof File && photo.size > 0) body.set("photo", await shrinkImage(photo), "photo.jpg");
    const res = await postForm<{ id?: string }>(`/api/pets/${slug}/sightings`, body);
    setBusy(false);
    if (res.ok) setSent(true);
    else setErrors(res.errors);
  }

  if (sent) {
    return (
      <div className="stack card enter-utility" role="status" data-testid="sighting-sent">
        <h2>Thank you. {name}&apos;s owner has it.</h2>
        <p className="muted">
          It&apos;s on the map now. If you see {name} again, report it again: each sighting sharpens
          the trail.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/p/${slug}`} className="btn">
            Back to {name}&apos;s page
          </Link>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
              setSent(false);
              setFormKey((k) => k + 1);
            }}
          >
            Report another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form key={formKey} onSubmit={onSubmit} noValidate className="stack" style={{ ["--space" as string]: "26px" }}>
      {errors.form ? (
        <p className="notice notice-error" role="alert">
          {errors.form}
        </p>
      ) : null}

      <PointPicker
        label={`Where did you see ${name}?`}
        centerLat={centerLat}
        centerLng={centerLng}
        error={errors.lat ?? errors.lng}
      />

      <div className="field">
        <label htmlFor="s-when">When</label>
        <p className="hint" id="d-when">
          Leave it if it just happened.
        </p>
        <input id="s-when" ref={when} type="datetime-local" name="seenAt" required aria-describedby="d-when" />
        {errors.seenAt ? <p className="field-error">{errors.seenAt}</p> : null}
      </div>

      <PhotoInput
        name="photo"
        label={
          <>
            Photo <span className="optional">(optional)</span>
          </>
        }
        error={errors.photo}
      />

      <div className="field">
        <label htmlFor="s-note">
          Anything else? <span className="optional">(optional)</span>
        </label>
        <textarea
          id="s-note"
          name="note"
          maxLength={500}
          placeholder="Heading toward the lake, limping a little…"
        />
      </div>

      <div className="field">
        <label htmlFor="s-contact">
          Your phone or email <span className="optional">(optional)</span>
        </label>
        <p className="hint" id="d-contact">
          Only the owner sees it, in case they want to ask a question.
        </p>
        <input id="s-contact" name="contact" autoComplete="tel" maxLength={200} aria-describedby="d-contact" />
      </div>

      <div className="hp" aria-hidden="true">
        <label htmlFor="s-website">Website</label>
        <input id="s-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" className="btn btn-block" disabled={busy}>
        {busy ? "Sending…" : "Send to the owner"}
      </button>
    </form>
  );
}
