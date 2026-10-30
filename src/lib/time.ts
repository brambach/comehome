const TZ = "America/Los_Angeles";

const dayTime = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const shortDay = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" });

/** "Sat, Oct 12, 4:10 PM" in Tahoe time, regardless of where the server runs. */
export function formatWhen(d: Date): string {
  return dayTime.format(d);
}

export function formatDay(d: Date): string {
  return shortDay.format(d);
}

/** "3 hours ago", "2 days ago". Coarse on purpose: it's read in a hurry. */
export function ago(d: Date, now: Date = new Date()): string {
  const mins = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

const timeOnly = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });

/** "5:52 PM" in Tahoe time. */
export function formatTime(d: Date): string {
  return timeOnly.format(d);
}

/** "40 min ago", "3 hr ago", "2 days ago": for labels on the map, where room is tight. */
export function shortAgo(d: Date, now: Date = new Date()): string {
  const mins = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}
