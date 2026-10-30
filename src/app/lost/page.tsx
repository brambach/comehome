import type { Metadata } from "next";
import Link from "next/link";
import { OpenPets } from "@/components/OpenPets";
import { getOpenPets, getRecentlyFound } from "@/lib/public";
import { formatDay } from "@/lib/time";

export const metadata: Metadata = {
  title: "Missing right now",
  description: "Every pet missing around Lake Tahoe and Truckee on comehome, newest activity first.",
};
export const dynamic = "force-dynamic";

export default async function LostPage() {
  const [open, home] = await Promise.all([getOpenPets(), getRecentlyFound()]);
  return (
    <div className="wrap">
      <div className="stack" style={{ paddingBlock: "16px 64px", ["--space" as string]: "28px" }}>
        <h1 className="display enter-statement" style={{ fontSize: "clamp(3rem, 14vw, 6rem)" }}>
          Missing right now
        </h1>
        {open.length ? (
          <OpenPets pets={open} />
        ) : (
          <p className="lede">Nobody&apos;s missing on comehome right now.</p>
        )}
        {home.length ? (
          <section className="stack" style={{ ["--space" as string]: "10px" }} aria-labelledby="home">
            <h2 id="home">Home lately</h2>
            <p className="muted">
              {home.map((p, i) => (
                <span key={p.slug}>
                  {i ? ", " : ""}
                  <Link href={`/p/${p.slug}`}>{p.name}</Link>
                  {p.foundAt ? ` (${formatDay(p.foundAt)})` : ""}
                </span>
              ))}
            </p>
          </section>
        ) : null}
        <section className="stack" style={{ ["--space" as string]: "8px" }} aria-labelledby="feed">
          <h2 id="feed">For shelters, vets and rescues</h2>
          <p className="muted" style={{ maxWidth: "var(--measure)" }}>
            This list is a live feed too. Add <a href="/feed.xml">/feed.xml</a> to any feed reader, or pull{" "}
            <a href="/feed.json">/feed.json</a> into your own system. Locations are rounded to about 100 m and owner
            contact is never in it.
          </p>
        </section>
      </div>
    </div>
  );
}
