"use client";

import { useEffect, useState } from "react";
import styles from "./PhotoInput.module.css";

/** File input with thumbnails. The parent reads files from the input by name on submit. */
export function PhotoInput({
  name,
  label,
  hint,
  multiple = false,
  max = 1,
  required = false,
  error,
}: {
  name: string;
  label: React.ReactNode;
  hint?: string;
  multiple?: boolean;
  max?: number;
  required?: boolean;
  error?: string;
}) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [tooMany, setTooMany] = useState(false);

  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setTooMany(files.length > max);
    setPreviews(files.slice(0, max).map((f) => URL.createObjectURL(f)));
  }

  return (
    <div className="field">
      <label htmlFor={`f-${name}`}>{label}</label>
      {hint ? <p className="hint">{hint}</p> : null}
      <input
        id={`f-${name}`}
        type="file"
        name={name}
        accept="image/*"
        multiple={multiple}
        required={required}
        onChange={onChange}
      />
      {previews.length ? (
        <ul className={styles.thumbs}>
          {previews.map((src) => (
            <li key={src}>
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img src={src} alt="" />
            </li>
          ))}
        </ul>
      ) : null}
      {tooMany ? <p className="field-error">Only the first {max} will be used.</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
