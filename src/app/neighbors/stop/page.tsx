import type { Metadata } from "next";
import Link from "next/link";
import { validStop, watcherById } from "@/lib/neighbors";
import { stopAlertsSigned } from "../actions";

export const metadata: Metadata = { title: "Stop alerts", robots: { index: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function StopAlerts(props: PageProps<"/neighbors/stop">) {
  const search = await props.searchParams;
  const id = typeof search.w === "string" ? search.w : "";
  const sig = typeof search.s === "string" ? search.s : "";
  const ok = /^[0-9a-f-]{36}$/.test(id) && validStop(id, sig);
  const w = ok ? await watcherById(id) : null;
  const stopped = !!w?.stoppedAt;

  return (
    <div className="wrap narrow">
      <div className="stack" style={{ paddingBlock: "16px 64px", ["--space" as string]: "22px" }}>
        <h1 className="display enter-statement" style={{ fontSize: "clamp(2.75rem, 12vw, 4.5rem)" }}>
          {!w ? "That link doesn't work." : stopped ? "Alerts are off." : "Stop alerts?"}
        </h1>
        {!w ? (
          <p className="lede">
            It may have been cut off in your email app. <Link href="/neighbors">Sign up again</Link> to get a fresh one.
          </p>
        ) : stopped ? (
          <p className="lede" data-testid="alerts-stopped">
            You won&apos;t hear from comehome again. Thanks for looking out while you did.
          </p>
        ) : (
          <>
            <p className="lede">No more texts or emails to {w.email}. You can sign up again anytime.</p>
            <form action={stopAlertsSigned}>
              <input type="hidden" name="w" value={id} />
              <input type="hidden" name="s" value={sig} />
              <button type="submit" className="btn btn-block" data-testid="stop-alerts">
                Stop alerts
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
