"use client";

import { useState } from "react";

export function CopyField({ label, value, testId }: { label: string; value: string; testId?: string }) {
  const [copied, setCopied] = useState(false);
  const id = `copy-${testId ?? label.replace(/\W+/g, "-")}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      (document.getElementById(id) as HTMLInputElement | null)?.select();
    }
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input id={id} readOnly value={value} data-testid={testId} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn-quiet" onClick={copy} aria-live="polite">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
