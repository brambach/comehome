import type { Metadata } from "next";
import Link from "next/link";
import { CheckGlyph } from "@/components/Glyph";
import { formatDistance } from "@/lib/geo";
import { watcherByToken } from "@/lib/neighbors";
import { confirmAlerts, stopAlertsWithToken } from "../actions";

export const metadata: Metadata = { title: "Your alerts", robots: { index: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function YourAlerts(props: PageProps<"/neighbors/you">) {
  const search = await props.searchParams;
  const token = typeof search.t === "string" ? search.t : "";
  const w = await watcherByToken(token);

  if (!w) {
    return (
      <Shell title="That link has expired.">
        <p className="lede">Sign up again with the same email and we&apos;ll send a fresh one.</p>
        <Link href="/neighbors" className="btn">
          Get alerts near me
        </Link>
      </Shell>
    );
  }

  const on = w.confirmedAt && !w.stoppedAt;
  const reach = `within ${formatDistance(w.radiusM)} of your pin`;
  return (
    <Shell title={on ? "You're on." : w.stoppedAt ? "Alerts are off." : "One tap and you're on."}>
      {on ? (
        <p className="lede" data-testid="alerts-on" style={{ display: "flex", gap: 10, alignItems: "start" }}>
          <CheckGlyph size={24} />
          <span>
            You&apos;ll hear when a pet goes missing {reach}
            {w.phone ? ", by text and email" : ", by email"}. Thank you.
          </span>
        </p>
      ) : (
        <p className="lede">Alerts for pets lost {reach}, sent to {w.email}.</p>
      )}
      {on ? (
        <form action={stopAlertsWithToken}>
          <input type="hidden" name="t" value={token} />
          <button type="submit" className="btn btn-quiet">
            Stop alerts
          </button>
        </form>
      ) : (
        <form action={confirmAlerts}>
          <input type="hidden" name="t" value={token} />
          <button type="submit" className="btn btn-block" data-testid="confirm-alerts">
            {w.stoppedAt ? "Turn alerts back on" : "Yes, alert me"}
          </button>
        </form>
      )}
      <p className="muted">
        To move your pin or change the distance, <Link href="/neighbors">sign up again</Link> with the same email.
      </p>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="wrap narrow">
      <div className="stack" style={{ paddingBlock: "16px 64px", ["--space" as string]: "22px" }}>
        <h1 className="display enter-statement" style={{ fontSize: "clamp(2.75rem, 12vw, 4.5rem)" }}>
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}
