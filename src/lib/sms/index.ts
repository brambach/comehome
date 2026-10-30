import { consoleTexter } from "./console";
import { twilioTexter } from "./twilio";

export type Text = { to: string; body: string };

export interface Texter {
  send(text: Text): Promise<void>;
}

export function texter(): Texter {
  return process.env.SMS_DRIVER === "twilio" ? twilioTexter() : consoleTexter();
}

/** Text alerts only go out when a number is configured; email always works. */
export function textingEnabled(): boolean {
  return process.env.SMS_DRIVER === "twilio" || process.env.NODE_ENV !== "production";
}

/** The number printed on flyers, as people dial it. Empty when texting isn't set up. */
export function textNumber(): string {
  return process.env.TEXT_NUMBER_DISPLAY ?? "";
}

/** US numbers only: comehome is a Tahoe thing. Returns E.164 or null. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
