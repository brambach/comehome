import { consoleMailer } from "./console";
import { resendMailer } from "./resend";

export type Mail = { to: string; subject: string; text: string; html: string };

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

export function mailer(): Mailer {
  return process.env.MAIL_DRIVER === "resend" ? resendMailer() : consoleMailer();
}
