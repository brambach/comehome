import type { Metadata } from "next";
import { NeighborForm } from "@/components/NeighborForm";
import { networkSize } from "@/lib/neighbors";
import { textingEnabled } from "@/lib/sms";

export const metadata: Metadata = {
  title: "Get alerts near you",
  description: "One text or email when a pet goes missing near your street, around Lake Tahoe. Nothing else.",
};
export const dynamic = "force-dynamic";

export default async function NeighborsPage() {
  const size = await networkSize();
  return (
    <div className="wrap narrow">
      <div className="stack" style={{ paddingBlock: "16px 64px", ["--space" as string]: "24px" }}>
        <div className="stack" style={{ ["--space" as string]: "12px" }}>
          <h1 className="display enter-statement" style={{ fontSize: "clamp(2.75rem, 12vw, 4.5rem)" }}>
            Be the eyes on your street.
          </h1>
          <p className="lede">
            When a pet goes missing near you, you get one message with a photo and where they were last seen. If
            they&apos;re seen near you later, you hear that too.
          </p>
          <ul className="muted stack" style={{ ["--space" as string]: "6px", paddingLeft: "1.1em" }}>
            <li>Three alerts a day at most, usually none.</li>
            <li>Your address is never shown, not even to owners.</li>
            <li>You hear when they&apos;re home.</li>
          </ul>
          {size >= 10 ? <p className="muted num">{size} people around Tahoe are already on.</p> : null}
        </div>
        <NeighborForm texting={textingEnabled()} />
      </div>
    </div>
  );
}
