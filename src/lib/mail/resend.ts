import { Resend } from "resend";
import type { Mailer } from "./index";

/** Prod mailer. Needs RESEND_API_KEY and a verified MAIL_FROM. */
export function resendMailer(): Mailer {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const client = new Resend(key);
  const from = process.env.MAIL_FROM ?? "comehome <alerts@example.com>";
  return {
    async send(mail) {
      const { error } = await client.emails.send({ from, ...mail });
      if (error) throw new Error(`Resend: ${error.message}`);
    },
  };
}
