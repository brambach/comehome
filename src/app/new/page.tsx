import type { Metadata } from "next";
import { CreatePetForm } from "@/components/CreatePetForm";
import { networkSize } from "@/lib/neighbors";

export const metadata: Metadata = { title: "Make a page" };

export const dynamic = "force-dynamic";

export default async function NewPetPage() {
  const neighbors = await networkSize();
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
        <CreatePetForm neighbors={neighbors} />
      </div>
    </div>
  );
}
