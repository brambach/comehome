/** Public origin for links that leave the browser: QR codes, emails, OG tags. */
export function siteUrl(): string {
  const url = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "localhost:3000";
  const withScheme = /^https?:\/\//.test(url) ? url : `https://${url}`;
  return withScheme.replace(/^https:\/\/localhost/, "http://localhost").replace(/\/+$/, "");
}

export function petUrl(slug: string): string {
  return `${siteUrl()}/p/${slug}`;
}

/** Short form printed under the QR code, without the scheme. */
export function shortPetUrl(slug: string): string {
  return petUrl(slug).replace(/^https?:\/\//, "");
}
