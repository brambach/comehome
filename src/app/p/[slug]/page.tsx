import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckGlyph } from "@/components/Glyph";
import { PetMap } from "@/components/PetMap";
import { corridor } from "@/lib/corridor";
import { getPublicPet, getPublicSightings } from "@/lib/public";
import { ago, formatDay, formatWhen } from "@/lib/time";
import styles from "./pet.module.css";

export const dynamic = "force-dynamic";

const SPECIES_LABEL = { dog: "dog", cat: "cat", other: "pet" } as const;

export async function generateMetadata(props: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const pet = await getPublicPet(slug);
  if (!pet) return { title: "Not found" };
  const title =
    pet.status === "found" ? `${pet.name} is home` : `Lost ${SPECIES_LABEL[pet.species]}: ${pet.name}`;
  const description =
    pet.status === "found"
      ? `${pet.name} has been found. Thank you, Tahoe.`
      : `Last seen ${formatWhen(pet.lastSeenAt)} near Tahoe and Truckee. Seen ${pet.name}? Report it in 30 seconds, no account.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", url: `/p/${pet.slug}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PetPage(props: PageProps<"/p/[slug]">) {
  const { slug } = await props.params;
  const pet = await getPublicPet(slug);
  if (!pet) notFound();
  const sightings = await getPublicSightings(pet.id);
  const [hero, ...rest] = pet.photos;
  const found = pet.status === "found";
  const latest = sightings.at(-1);
  const trail = corridor(sightings, {
    origin: { lat: pet.lastLat, lng: pet.lastLng, at: pet.lastSeenAt },
  });
  const recent = [...sightings].reverse().slice(0, 12);

  return (
    <>
      {found ? (
        <div className="found-banner" role="status" data-testid="found-banner">
          <div className="wrap">
            <CheckGlyph />
            <strong>{pet.name} is home.</strong>
            <p>Found {pet.foundAt ? formatDay(pet.foundAt) : ""}. Thank you to everyone who looked.</p>
          </div>
        </div>
      ) : null}

      <article className={`wrap ${styles.layout}`}>
        <div className={styles.photos}>
          {hero ? (
            <figure className={`print ${styles.hero}`}>
              <Image
                src={hero.url}
                alt={`Photo of ${pet.name}`}
                width={hero.width}
                height={hero.height}
                sizes="(min-width: 860px) 480px, 100vw"
                priority
              />
            </figure>
          ) : null}
          {rest.length ? (
            <ul className={styles.more}>
              {rest.map((p) => (
                <li key={p.url} className="print">
                  <Image src={p.url} alt={`Another photo of ${pet.name}`} width={p.width} height={p.height} sizes="160px" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className={styles.info}>
          <p className="eyebrow">
            {found ? "Found" : `Lost ${SPECIES_LABEL[pet.species]}`} · Tahoe &amp; Truckee
          </p>
          <h1 className={`display enter-statement ${styles.name}`}>{pet.name}</h1>
          <p className={styles.lastSeen}>
            Last seen <strong>{ago(pet.lastSeenAt)}</strong>
            <span className="muted num"> · {formatWhen(pet.lastSeenAt)}</span>
          </p>
          {latest ? (
            <p className={styles.lastSeen} data-testid="latest-sighting">
              Latest sighting <strong>{ago(latest.seenAt)}</strong>
              <span className="muted num"> · {sightings.length} reported</span>
            </p>
          ) : null}

          {found ? null : (
            <div className={styles.cta}>
              <Link href={`/p/${pet.slug}/seen`} className="btn btn-signal btn-block">
                I saw this pet
              </Link>
              <p className="muted">No account. Takes 30 seconds. Please don&apos;t chase.</p>
            </div>
          )}

          {pet.description ? <p className={styles.description}>{pet.description}</p> : null}
        </div>
      </article>

      <section className={`wrap ${styles.section}`} aria-labelledby="where">
        <h2 id="where">{sightings.length ? "Where they've been seen" : "Where they were last seen"}</h2>
        <PetMap
          data={trail}
          label={`Map of where ${pet.name} was last seen${sightings.length ? ` and ${sightings.length} sightings since` : ""}.`}
        />
        {recent.length ? (
          <ol className={styles.sightings} data-testid="sighting-list">
            {recent.map((s) => (
              <li key={s.id}>
                <p>
                  <strong>{ago(s.seenAt)}</strong> <span className="muted num">{formatWhen(s.seenAt)}</span>
                </p>
                {s.note ? <p className={styles.note}>{s.note}</p> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">
            No sightings yet. If you&apos;re nearby, look under decks, in garages and along creeks:
            scared pets hide close and move at dawn and dusk.
          </p>
        )}
      </section>

      <footer className={`wrap ${styles.foot}`}>
        <p className="muted">
          Made with comehome. Owner contact stays private; sightings go straight to them.
        </p>
      </footer>
    </>
  );
}
