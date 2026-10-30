"use client";

import { useState } from "react";
import { postForm } from "./clientImage";
import { PointPicker } from "./PointPicker";

type Errors = Record<string, string>;

const RADII = [
  { m: 800, label: "Half a mile" },
  { m: 1600, label: "1 mile" },
  { m: 3200, label: "2 miles" },
];

export function NeighborForm({ texting }: { texting: boolean }) {
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [wantsTexts, setWantsTexts] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = new FormData(e.currentTarget);
    if (!raw.get("lat")) {
      setErrors({ lat: "Drop a pin on your home or street." });
      return;
    }
    setBusy(true);
    setErrors({});
    const res = await postForm<object>("/api/neighbors", raw);
    setBusy(false);
    if (res.ok) setSentTo(String(raw.get("email")));
    else setErrors(res.errors);
  }

  if (sentTo) {
    return (
      <div className="stack card enter-utility" role="status" data-testid="neighbor-sent">
        <h2>Check your email</h2>
        <p className="muted">
          We sent a link to {sentTo}. Tap it and you&apos;re on. Nothing goes out until you do.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="stack" style={{ ["--space" as string]: "28px" }}>
      {errors.form ? (
        <p className="notice notice-error" role="alert">
          {errors.form}
        </p>
      ) : null}

      <PointPicker
        label="Your home or street"
        hint="Only used to decide which alerts reach you. Never shown to anyone."
        error={errors.lat ?? errors.lng}
      />

      <fieldset className="field">
        <legend>Tell me about pets lost within</legend>
        <div className="choices">
          {RADII.map((r) => (
            <label key={r.m} className="choice">
              <input type="radio" name="radiusM" value={r.m} defaultChecked={r.m === 1600} />
              <span>{r.label}</span>
            </label>
          ))}
        </div>
        {errors.radiusM ? <p className="field-error">{errors.radiusM}</p> : null}
      </fieldset>

      <div className="field">
        <label htmlFor="n-email">Your email</label>
        <input id="n-email" type="email" name="email" autoComplete="email" inputMode="email" required />
        {errors.email ? <p className="field-error">{errors.email}</p> : null}
      </div>

      {texting ? (
        <div className="stack" style={{ ["--space" as string]: "14px" }}>
          <label className="check" htmlFor="n-texts">
            <input
              id="n-texts"
              type="checkbox"
              name="texts"
              checked={wantsTexts}
              onChange={(e) => setWantsTexts(e.target.checked)}
            />
            <span>
              <strong>Text me too</strong>
              <span className="hint">
                Faster than email for the first hour. Up to 3 a day, usually far fewer. Reply STOP anytime.
              </span>
            </span>
          </label>
          {wantsTexts ? (
            <div className="field">
              <label htmlFor="n-phone">Mobile number</label>
              <input id="n-phone" type="tel" name="phone" autoComplete="tel" inputMode="tel" maxLength={30} />
              {errors.phone ? <p className="field-error">{errors.phone}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="hp" aria-hidden="true">
        <label htmlFor="n-website">Website</label>
        <input id="n-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" className="btn btn-block" disabled={busy}>
        {busy ? "Sending…" : "Send me the confirm link"}
      </button>
    </form>
  );
}
