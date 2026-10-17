import type { Mail, Mailer } from "./index";

/** Dev and test mailer: logs to stdout and keeps the last messages for assertions. */
export const outbox: Mail[] = [];

export function consoleMailer(): Mailer {
  return {
    async send(mail) {
      outbox.push(mail);
      if (outbox.length > 50) outbox.shift();
      if (process.env.NODE_ENV !== "test") {
        console.log(`\n[mail] to=${mail.to}\n[mail] subject=${mail.subject}\n${mail.text}\n`);
      }
    },
  };
}
