import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyField } from "@/components/CopyField";
import { editUrl } from "@/lib/notify";
import { getOwnedPet, getOwnerSightings } from "@/lib/pets";
import { petUrl } from "@/lib/site";
import { ago, formatWhen } from "@/lib/time";
import { saveDetails, toggleFound, toggleSighting } from "./actions";
import styles from "./edit.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage page",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function EditPage(props: PageProps<"/p/[slug]/edit">) {
  const { slug } = await props.params;
  const search = await props.searchParams;
  const token = typeof search.t === "string" ? search.t : null;
  const pet = await getOwnedPet(slug, token);
  if (!pet || !token) notFound();
  const sightings = (await getOwnerSightings(pet.id)).reverse();
  const found = pet.status === "found";
  const auth = (
    <>
      <input type="hidden" name="slug" value={pet.slug} />
      <input type="hidden" name="t" value={token} />
    </>
  );

  return (
    <div className="wrap narrow">
      <div className="stack" style={{ paddingBlock: "16px 64px", ["--space" as string]: "32px" }}>
        <header className="stack" style={{ ["--space" as string]: "8px" }}>
          <p className="eyebrow">Your page</p>
          <h1 className="display enter-statement" style={{ fontSize: "clamp(3rem, 15vw, 5rem)" }}>
            {pet.name}
          </h1>
          {search.new ? (
            <p className="notice" role="status" data-testid="created-notice">
              The page is live. Bookmark this screen: it&apos;s your private link, and we emailed it to{" "}
              {pet.ownerEmail} too.
            </p>
          ) : null}
        </header>

        <section className="stack card" style={{ ["--space" as string]: "14px" }}>
          <h2>Share it</h2>
          <CopyField label="Public link" value={petUrl(pet.slug)} testId="public-link" />
          <div className={styles.actions}>
            <Link href={`/p/${pet.slug}`} className="btn btn-quiet" data-testid="open-public">
              Open the page
            </Link>
            <a href={`/p/${pet.slug}/flyer.pdf`} className="btn btn-quiet">
              Download flyer (PDF)
            </a>
          </div>
          <p className="hint muted">
            Post the link to Tahoe and Truckee Facebook groups and Nextdoor. The preview shows {pet.name}
            &apos;s photo.
          </p>
        </section>

        <section className="stack" style={{ ["--space" as string]: "14px" }} id="sightings">
          <h2>
            Sightings <span className="muted num">({sightings.length})</span>
          </h2>
          {sightings.length === 0 ? (
            <p className="muted">None yet. You&apos;ll get an email the moment someone reports one.</p>
          ) : (
            <ol className={styles.sightings}>
              {sightings.map((s) => (
                <li key={s.id} className={s.hidden ? styles.hidden : undefined} data-testid="owner-sighting">
                  <div>
                    <p>
                      <strong>{ago(s.seenAt)}</strong>{" "}
                      <span className="muted num">{formatWhen(s.seenAt)}</span>
                      {s.hidden ? <span className={styles.tag}>Hidden</span> : null}
                    </p>
                    {s.note ? <p>{s.note}</p> : null}
                    <p className="muted num">
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=17/${s.lat}/${s.lng}`}
                      >
                        {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                      </a>
                      {s.reporterContact ? ` · Contact: ${s.reporterContact}` : " · No contact left"}
                    </p>
                    {s.photoUrl ? (
                      <a href={s.photoUrl} className={styles.photoLink}>
                        See their photo
                      </a>
                    ) : null}
                  </div>
                  <form action={toggleSighting}>
                    {auth}
                    <input type="hidden" name="sightingId" value={s.id} />
                    <input type="hidden" name="hidden" value={s.hidden ? "0" : "1"} />
                    <button type="submit" className="link-btn">
                      {s.hidden ? "Show" : "Hide"}
                    </button>
                  </form>
                </li>
              ))}
            </ol>
          )}
          <p className="hint muted">Hidden reports disappear from the public map and corridor.</p>
        </section>

        <section className="stack card" style={{ ["--space" as string]: "14px" }}>
          <h2>{found ? `${pet.name} is home` : `Found ${pet.name}?`}</h2>
          <p className="muted">
            {found
              ? "The page shows a found banner and the sighting form is closed."
              : "Marking found shows a banner on the page and closes the sighting form."}
          </p>
          <form action={toggleFound}>
            {auth}
            <input type="hidden" name="found" value={found ? "0" : "1"} />
            <button type="submit" className={found ? "btn btn-quiet" : "btn btn-block"} data-testid="toggle-found">
              {found ? "Reopen the search" : `Mark ${pet.name} found`}
            </button>
          </form>
        </section>

        <section className="stack" style={{ ["--space" as string]: "14px" }} id="details">
          <h2>Details</h2>
          {search.saved ? <p className="notice" role="status">Saved.</p> : null}
          {search.invalid ? (
            <p className="notice notice-error" role="alert">
              A name is required, and descriptions max out at 600 characters.
            </p>
          ) : null}
          <form action={saveDetails} className="stack" style={{ ["--space" as string]: "16px" }}>
            {auth}
            <div className="field">
              <label htmlFor="e-name">Name</label>
              <input id="e-name" name="name" defaultValue={pet.name} maxLength={40} required />
            </div>
            <div className="field">
              <label htmlFor="e-description">Description</label>
              <textarea id="e-description" name="description" defaultValue={pet.description} maxLength={600} />
            </div>
            <button type="submit" className="btn btn-quiet">
              Save details
            </button>
          </form>
        </section>

        <section className="stack" style={{ ["--space" as string]: "10px" }}>
          <h2>Your private link</h2>
          <CopyField label="Edit link (don't share)" value={editUrl(pet.slug, token)} testId="edit-link" />
        </section>
      </div>
    </div>
  );
}
