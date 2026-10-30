import type { Text, Texter } from "./index";

/** Dev and test texter: logs and keeps the last messages for assertions. */
export const sentTexts: Text[] = [];

export function consoleTexter(): Texter {
  return {
    async send(text) {
      sentTexts.push(text);
      if (sentTexts.length > 50) sentTexts.shift();
      if (process.env.NODE_ENV !== "test") console.log(`\n[sms] to=${text.to}\n${text.body}\n`);
    },
  };
}
