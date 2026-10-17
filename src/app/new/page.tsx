import type { Metadata } from "next";
import { CreatePetForm } from "@/components/CreatePetForm";

export const metadata: Metadata = { title: "Make a page" };

export default function NewPetPage() {
  return (
    <div className="wrap narrow">
      <div className="stack" style={{ paddingBlock: "16px 64px", ["--space" as string]: "24px" }}>
        <div className="stack" style={{ ["--space" as string]: "10px" }}>
          <h1 className="display enter-statement" style={{ fontSize: "clamp(2.75rem, 12vw, 4.5rem)" }}>
            Let&apos;s find them.
          </h1>
          <p className="lede">
            Five minutes, no account. You&apos;ll get a link to share and a private link to manage
            the page.
          </p>
        </div>
        <CreatePetForm />
      </div>
    </div>
  );
}
