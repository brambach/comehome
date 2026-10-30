import Image from "next/image";
import Link from "next/link";
import { areaName } from "@/lib/geo";
import type { OpenPet } from "@/lib/public";
import { ago } from "@/lib/time";
import styles from "./OpenPets.module.css";

const KIND = { dog: "dog", cat: "cat", other: "pet" } as const;

/** The town board: who's missing right now, newest activity first. Quiet rows, the photo does the work. */
export function OpenPets({ pets }: { pets: OpenPet[] }) {
  return (
    <ul className={styles.list} data-testid="open-pets">
      {pets.map((p) => (
        <li key={p.id}>
          <Link href={`/p/${p.slug}`} className={styles.row}>
            <span className={`print ${styles.photo}`}>
              {p.photo ? <Image src={p.photo.url} alt="" width={p.photo.width} height={p.photo.height} sizes="96px" /> : null}
            </span>
            <span className={styles.text}>
              <span className={styles.name}>{p.name}</span>
              <span className={styles.meta}>
                Lost {KIND[p.species]} · {areaName(p.lastLat, p.lastLng).short}
              </span>
              <span className={`${styles.meta} num`}>
                {p.sightingCount
                  ? `Seen ${ago(p.latestSeenAt)} · ${p.sightingCount} sighting${p.sightingCount === 1 ? "" : "s"}`
                  : `Last seen ${ago(p.lastSeenAt)}`}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
