import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CorridorMap, type Stop } from "@/components/CorridorMap";
import { CheckGlyph, DuskGlyph, HeadingGlyph, NeighborsGlyph, ScanGlyph } from "@/components/Glyph";
import { corridor } from "@/lib/corridor";
import { areaName, formatDistance } from "@/lib/geo";
import { likelyHeading } from "@/lib/heading";
import { neighborsAlerted } from "@/lib/neighbors";
import { countFlyerScan } from "@/lib/pets";
import { getPublicPet, getPublicSightings } from "@/lib/public";
import { textNumber } from "@/lib/sms";
import { foundStory } from "@/lib/story";
import { sunTimes } from "@/lib/sun";
import { ago, formatDay, formatTime, formatWhen, shortAgo } from "@/lib/time";
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
      : `Last seen ${formatWhen(pet.lastSeenAt)} near ${areaName(pet.lastLat, pet.lastLng).prose}. Seen ${pet.name}? Report it in 30 seconds, no account.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", url: `/p/${pet.slug}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PetPage(props: PageProps<"/p/[slug]">) {
  const { slug } = await props.params;
  const search = await props.searchParams;
  const pet = await getPublicPet(slug);
  if (!pet) notFound();
  if (search.f === "1") await countFlyerScan(pet.id).catch(() => {});

  const [sightings, alerted] = await Promise.all([getPublicSightings(pet.id), neighborsAlerted(pet.id)]);
  const [hero, ...rest] = pet.photos;
  const found = pet.status === "found";
  const latest = sightings.at(-1);
  const kind = SPECIES_LABEL[pet.species];
  const area = areaName(pet.lastLat, pet.lastLng);

  const trail = corridor(sightings, { origin: { lat: pet.lastLat, lng: pet.lastLng, at: pet.lastSeenAt } });
  const stops: Stop[] = trail.features.flatMap((f) =>
    f.geometry.type === "Point" && (f.properties.kind === "origin" || f.properties.kind === "sighting")
      ? [
          {
            id: f.properties.kind === "sighting" ? f.properties.id : "origin",
            kind: f.properties.kind,
            lng: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
            t: new Date(f.properties.seenAt).getTime(),
          },
        ]
      : [],
  );
  const hullFeature = trail.features.find((f) => f.properties.kind === "hull");
  const hull =
    hullFeature && hullFeature.geometry.type === "Polygon"
      ? (hullFeature.geometry.coordinates[0] as [number, number][])
      : hullFeature && hullFeature.geometry.type === "MultiPolygon"
        ? (hullFeature.geometry.coordinates[0][0] as [number, number][])
        : null;
  const heading = found ? null : likelyHeading(stops.map((s) => ({ lat: s.lat, lng: s.lng, at: new Date(s.t) })));
  const fresh = typeof search.seen === "string" && sightings.some((s) => s.id === search.seen) ? search.seen : undefined;

  const now = new Date();
  const sun = sunTimes(pet.lastLat, pet.lastLng, now);
  const dusk =
    sun && now < sun.sunset
      ? `Sunset tonight is ${formatTime(sun.sunset)}.`
      : (() => {
          const next = sunTimes(pet.lastLat, pet.lastLng, new Date(now.getTime() + 24 * 3600_000));
          return next ? `Sunrise tomorrow is ${formatTime(next.sunrise)}.` : null;
        })();

  const recent = [...sightings].reverse();
  const texting = textNumber();

  return (
    <>
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
          <p className={styles.label}>
            {found ? "Home" : `Lost ${kind}`} <span aria-hidden="true">·</span> {area.short}
          </p>
          {found ? (
            <div className={styles.story} role="status" data-testid="found-banner">
              <h1 className={`display enter-statement ${styles.name}`}>
                {pet.name}
                <span className={styles.isHome}> is home.</span>
              </h1>
              <p className={styles.storyLine}>
                <CheckGlyph size={22} />
                <span>
                  {foundStory({
                    lostAt: pet.lastSeenAt,
                    foundAt: pet.foundAt ?? now,
                    sightings: sightings.length,
                    trail: stops,
                  })}{" "}
                  Home {pet.foundAt ? formatDay(pet.foundAt) : "today"}.
                </span>
              </p>
              {pet.foundNote ? (
                <blockquote className={styles.note}>
                  <p>{pet.foundNote}</p>
                </blockquote>
              ) : null}
              <p className="muted">
                {alerted > 0 ? `${alerted} neighbor${alerted === 1 ? " was" : "s were"} asked to look. ` : ""}
                Thank you to everyone who did.
              </p>
            </div>
          ) : (
            <>
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

              <div className={styles.cta}>
                <Link href={`/p/${pet.slug}/seen`} className="btn btn-signal btn-block">
                  I saw this pet
                </Link>
                <p className="muted">No account. Takes 30 seconds. Please don&apos;t chase.</p>
                {texting && pet.textCode ? (
                  <p className="muted" data-testid="text-option">
                    Or text a photo to <strong className="num">{texting}</strong> with{" "}
                    <strong className="num">{pet.textCode}</strong>
                  </p>
                ) : null}
              </div>

              {pet.description ? <p className={styles.description}>{pet.description}</p> : null}

              {alerted > 0 || pet.flyerScans > 0 ? (
                <ul className={styles.signals} data-testid="signals">
                  {alerted > 0 ? (
                    <li>
                      <NeighborsGlyph /> {alerted} neighbor{alerted === 1 ? "" : "s"} alerted nearby
                    </li>
                  ) : null}
                  {pet.flyerScans > 0 ? (
                    <li>
                      <ScanGlyph /> Flyer scanned {pet.flyerScans} time{pet.flyerScans === 1 ? "" : "s"}
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </>
          )}
        </div>
      </article>

      <section className={`wrap ${styles.section}`} aria-labelledby="trail">
        <h2 id="trail">{found ? "How they got home" : sightings.length ? "The trail" : "Where they were last seen"}</h2>
        {fresh ? (
          <p className="notice" role="status" data-testid="sighting-thanks">
            Thank you. Your sighting is on the map and {pet.name}&apos;s owner has it.
          </p>
        ) : null}
        <CorridorMap
          slug={pet.slug}
          label={`Map of where ${pet.name} was last seen${sightings.length ? ` and ${sightings.length} sightings since` : ""}.`}
          stops={stops}
          hull={sightings.length ? hull : null}
          cone={heading ? (heading.cone.geometry.coordinates[0] as [number, number][]) : null}
          found={found}
          fresh={fresh}
          startLabel="Lost here"
          endLabel={latest ? shortAgo(latest.seenAt) : ""}
        />
        {!found && (heading || dusk) ? (
          <ul className={styles.hints}>
            {heading ? (
              <li data-testid="heading">
                <HeadingGlyph bearing={heading.bearing} />
                <p>
                  <strong>Likely heading {heading.toward}</strong>, within about {formatDistance(heading.reachM)}.{" "}
                  <span className="muted">
                    A guess from the direction of the last {heading.legs + 1} sightings. It doesn&apos;t know about
                    roads, water or hills.
                  </span>
                </p>
              </li>
            ) : null}
            {dusk ? (
              <li>
                <DuskGlyph />
                <p>
                  <strong>{dusk}</strong>{" "}
                  <span className="muted">Scared pets move most at dawn and dusk. That&apos;s the time to be out, quietly.</span>
                </p>
              </li>
            ) : null}
          </ul>
        ) : null}
        {recent.length ? (
          <ol className={styles.sightings} data-testid="sighting-list">
            {recent.map((s) => (
              <li key={s.id} data-sighting-t={s.seenAt.getTime()}>
                <p>
                  <strong>{ago(s.seenAt)}</strong> <span className="muted num">{formatWhen(s.seenAt)}</span>
                </p>
                {s.note ? <p className={styles.sightingNote}>{s.note}</p> : null}
              </li>
            ))}
            <li>
              <p>
                <strong>Lost</strong> <span className="muted num">{formatWhen(pet.lastSeenAt)}</span>
              </p>
            </li>
          </ol>
        ) : found ? null : (
          <p className="muted">
            No sightings yet. If you&apos;re nearby, look under decks, in garages and along creeks:
            scared pets hide close and move at dawn and dusk.
          </p>
        )}
      </section>

      {found ? null : (
        <section className={`wrap ${styles.join}`} aria-labelledby="join">
          <h2 id="join">Live around here?</h2>
          <p className="muted">
            Get one text or email when a pet goes missing near your street. Nothing else, and you can stop anytime.
          </p>
          <Link href="/neighbors" className="btn btn-quiet">
            Get alerts near me
          </Link>
        </section>
      )}

      <footer className={`wrap ${styles.foot}`}>
        <p className="muted">
          Made with <Link href="/">comehome</Link>. Owner contact stays private; sightings go straight to them.
        </p>
      </footer>
    </>
  );
}
