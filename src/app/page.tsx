import { getImageProps } from "next/image";
import Link from "next/link";
import { OpenPets } from "@/components/OpenPets";
import { networkSize } from "@/lib/neighbors";
import { getOpenPets } from "@/lib/public";
import boots from "../../assets/images/boots.jpg";
import styles from "./home.module.css";

const BOOTS_ALT = "Boots, a black-and-white tuxedo cat, asleep and curled up on a cream blanket.";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [open, neighbors] = await Promise.all([getOpenPets(), networkSize()]);
  // getImageProps, not <Image>: a plain <img> keeps the home page free of client JS.
  const { props: bootsImg } = getImageProps({
    src: boots,
    alt: BOOTS_ALT,
    sizes: "(min-width: 760px) 280px, 220px",
  });

  return (
    <div className="wrap">
      <section className={styles.hero}>
        <p className="eyebrow">Incline Village · Lake Tahoe</p>
        <h1 className={`display enter-statement ${styles.title}`}>
          Bring them
          <br />
          home.
        </h1>
        <p className="lede">
          When a pet goes missing around Lake Tahoe, the first hour matters most. comehome gets the
          neighbors nearby looking, turns what they see into a trail, and shows you where to stand at dusk.
        </p>
        <div className={styles.actions}>
          <Link href="/new" className="btn">
            Make a page for my pet
          </Link>
          <Link href="/neighbors" className="btn btn-quiet">
            Get alerts near me
          </Link>
        </div>
      </section>

      {open.length ? (
        <section className={styles.board} aria-labelledby="missing">
          <div className={styles.boardHead}>
            <h2 id="missing">Missing right now</h2>
            {open.length > 4 ? <Link href="/lost">All {open.length}</Link> : null}
          </div>
          <OpenPets pets={open.slice(0, 4)} />
        </section>
      ) : null}

      <ol className={styles.steps}>
        <li>
          <span className={styles.num}>1</span>
          <div>
            <h2>Drop a pin</h2>
            <p className="muted">Where and when you last saw them, plus a photo or three.</p>
          </div>
        </li>
        <li>
          <span className={styles.num}>2</span>
          <div>
            <h2>Neighbors hear in minutes</h2>
            <p className="muted">
              {neighbors >= 10 ? `${neighbors} people` : "People"} who signed up get one text or email if your
              pin is near them. Print the flyer too: it has a QR code and a number to text a photo to.
            </p>
          </div>
        </li>
        <li>
          <span className={styles.num}>3</span>
          <div>
            <h2>Watch the trail</h2>
            <p className="muted">
              Each sighting draws onto the map, with a careful guess at where they&apos;re heading next.
            </p>
          </div>
        </li>
      </ol>

      <section className={styles.why} aria-labelledby="why">
        <figure className={`print ${styles.whyPhoto}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- optimized srcset from getImageProps */}
          <img {...bootsImg} alt={BOOTS_ALT} />
        </figure>
        <div className={styles.whyText}>
          <h2 id="why">Why I built this</h2>
          <p>
            Boots is my family&apos;s cat, a black-and-white tuxedo. She went missing in Incline Village
            for 51 days.
          </p>
          <p>
            My parents put up flyers and went door to door, and she did come home. comehome is the
            thing that does the knocking for the next family, and gets everyone&apos;s sightings onto one
            map.
          </p>
          <p className="muted">Bryce</p>
        </div>
      </section>

      <div className={`muted ${styles.foot}`}>
        <p>
          Starting in Incline Village, Crystal Bay, Kings Beach and Tahoe Vista. Pages work anywhere
          around Lake Tahoe and Truckee.
        </p>
        <p>No accounts. Your email stays private and is used only to tell you about sightings.</p>
        <p>
          Shelters and vets: every open page is in a <Link href="/lost">live list and feed</Link>.
        </p>
      </div>
    </div>
  );
}
