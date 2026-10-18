import { getImageProps } from "next/image";
import Link from "next/link";
import boots from "../../assets/images/boots.jpg";
import styles from "./home.module.css";

const BOOTS_ALT = "Boots, a black-and-white tuxedo cat, asleep and curled up on a cream blanket.";

export default function Home() {
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
          One page for your lost pet, ready to share in five minutes. Neighbors report sightings
          without an account, and you see where your pet is heading.
        </p>
        <Link href="/new" className="btn btn-block">
          Make a page for my pet
        </Link>
      </section>

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
            <h2>Share the link</h2>
            <p className="muted">
              Post it to Facebook groups and Nextdoor, and print the QR flyer.
            </p>
          </div>
        </li>
        <li>
          <span className={styles.num}>3</span>
          <div>
            <h2>Watch the trail</h2>
            <p className="muted">
              Each sighting lands on the map as a corridor, so you know where to search next.
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
            for about 50 days.
          </p>
          <p>
            My parents put up flyers and went through neighborhoods knocking on doors. That&apos;s why I
            built comehome: so the next family has one link to share, and every sighting lands on one
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
      </div>
    </div>
  );
}
