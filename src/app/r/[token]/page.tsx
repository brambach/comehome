import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SightingForm } from "@/components/SightingForm";
import { getOpenPets, getPublicPet, getPublicPetById } from "@/lib/public";
import { ago } from "@/lib/time";
import { textReportByToken } from "@/lib/textReports";
import styles from "./report.module.css";

export const metadata: Metadata = { title: "Finish your sighting", robots: { index: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

/** Where a texted sighting lands: drop the pin, the photo is already attached. */
export default async function TextReportPage(props: PageProps<"/r/[token]">) {
  const { token } = await props.params;
  const search = await props.searchParams;
  const report = await textReportByToken(token);

  if (!report) {
    return (
      <Shell title="That link doesn't work.">
        <p className="lede">Text the photo again and we&apos;ll send a fresh one.</p>
      </Shell>
    );
  }

  const chosen = report.petId ?? null;
  const pick = typeof search.pet === "string" ? search.pet : null;
  const pet = chosen
    ? await getPublicPetById(chosen)
    : pick
      ? await getPublicPet(pick)
      : null;

  if (report.sightingId && pet) {
    return (
      <Shell title="Already on the map.">
        <p className="lede">Thank you. {pet.name}&apos;s owner has it.</p>
        <Link href={`/p/${pet.slug}`} className="btn">
          See {pet.name}&apos;s trail
        </Link>
      </Shell>
    );
  }

  if (!pet || pet.status !== "lost") {
    const open = await getOpenPets();
    return (
      <Shell title="Which pet did you see?">
        <p className="lede">Tap the one that matches. Your photo comes along.</p>
        {open.length ? (
          <ul className={styles.pick}>
            {open.map((p) => (
              <li key={p.id}>
                <Link href={`/r/${token}?pet=${p.slug}`} className={styles.pickRow}>
                  {p.photo ? (
                    <Image src={p.photo.url} alt="" width={64} height={64} className={styles.thumb} />
                  ) : (
                    <span className={styles.thumb} />
                  )}
                  <span>
                    <strong>{p.name}</strong>
                    <span className="muted"> · last seen {ago(p.lastSeenAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No pets are listed as missing right now. Thanks for keeping an eye out.</p>
        )}
      </Shell>
    );
  }

  return (
    <Shell title={`You saw ${pet.name}?`}>
      <p className="lede">Drop a pin where it was. Your photo is already attached, and your number only goes to the owner.</p>
      <SightingForm
        slug={pet.slug}
        name={pet.name}
        centerLat={pet.lastLat}
        centerLng={pet.lastLng}
        report={{ token, photoUrl: report.photoUrl }}
      />
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="wrap narrow">
      <div className="stack" style={{ paddingBlock: "16px 64px", ["--space" as string]: "22px" }}>
        <h1 className="display enter-statement" style={{ fontSize: "clamp(2.75rem, 13vw, 4.5rem)" }}>
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}
