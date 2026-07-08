import type { MetadataRoute } from "next";

/**
 * Defense-in-depth alongside the per-page `robots: { index: false }` metadata
 * on /status/[id] (whose URL doubles as a bearer token — see
 * docs/RESPONSIBLE_AI.md). A crawler that ignores page-level meta but respects
 * robots.txt still won't be pointed at it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: ["/status"],
    },
  };
}
