"use client";

import { useRouter } from "next/navigation";
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
  report,
}: {
  slug: string;
  name: string;
  centerLat: number;
  centerLng: number;
  /** A sighting that started as a text: its token and the photo they already sent. */
  report?: { token: string; photoUrl: string | null };
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const when = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (when.current && !when.current.value) when.current.value = localDateTimeValue();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = new FormData(e.currentTarget);
    if (!raw.get("lat")) {
      setErrors({ lat: `Tap the map where you saw ${name}, or use your location.` });
      return;
    }
    const body = new FormData();
    for (const key of ["lat", "lng", "note", "contact", "website"]) body.set(key, String(raw.get(key) ?? ""));
    if (report) body.set("report", report.token);
    body.set("seenAt", localValueToIso(String(raw.get("seenAt") ?? "")));
    const photo = raw.get("photo");
    setBusy(true);
    setErrors({});
    if (photo instanceof File && photo.size > 0) body.set("photo", await shrinkImage(photo), "photo.jpg");
    const res = await postForm<{ id?: string }>(`/api/pets/${slug}/sightings`, body);
    if (res.ok && res.id) {
      // Back to the page, where their pin drops onto the trail.
      router.push(`/p/${slug}?seen=${res.id}#trail`);
      return;
    }
    setBusy(false);
    if (!res.ok) setErrors(res.errors);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="stack" style={{ ["--space" as string]: "26px" }}>
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

      {report?.photoUrl ? (
        <figure className="field">
          <p className="label">Your photo</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- already stripped and stored; a plain preview */}
          <img src={report.photoUrl} alt="The photo you texted" className="print" style={{ maxWidth: 240 }} />
        </figure>
      ) : (
      <PhotoInput
        name="photo"
        label={
          <>
            Photo <span className="optional">(optional)</span>
          </>
        }
        error={errors.photo}
      />
      )}

      <div className="field">
        <label htmlFor="s-note">
          Anything else? <span className="optional">(optional)</span>
        </label>
        <p className="hint" id="d-note">
          Shown on the page, so other searchers can use it.
        </p>
        <textarea
          id="s-note"
          name="note"
          maxLength={500}
          aria-describedby="d-note"
          placeholder="Heading toward the lake, limping a little…"
        />
      </div>

      {report ? null : (
      <div className="field">
        <label htmlFor="s-contact">
          Your phone or email <span className="optional">(optional)</span>
        </label>
        <p className="hint" id="d-contact">
          Only the owner sees it, in case they want to ask a question.
        </p>
        <input id="s-contact" name="contact" autoComplete="tel" maxLength={200} aria-describedby="d-contact" />
      </div>
      )}

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
