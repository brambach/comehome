import Link from "next/link";
import styles from "./home.module.css";

export default function Home() {
  return (
    <div className="wrap">
      <section className={styles.hero}>
        <p className="eyebrow">Lake Tahoe · Truckee</p>
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

      <p className={`muted ${styles.foot}`}>
        No accounts. Your email stays private and is used only to tell you about sightings.
      </p>
    </div>
  );
}
