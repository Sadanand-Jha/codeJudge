import type { Metadata } from "next";

/**
 * Single source of truth for site-level SEO values.
 *
 * Canonical origin is https://www.quizsupport.com (bare-domain requests are
 * 301-redirected to www in next.config.ts). Keep every canonical URL built
 * from here so the site never emits mixed-host canonicals.
 */
export const SITE_URL = "https://www.quizsupport.com";
export const SITE_NAME = "QuizSupport";
export const DEFAULT_OG_IMAGE = "/og-image.png";
export const DEFAULT_DESCRIPTION =
  "QuizSupport is an online quiz platform — create quizzes, share an access code, and get instant results on any device.";

export function canonicalUrl(path: string): string {
  if (path === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

interface PublicPageMetadataInput {
  title: string;
  description: string;
  /** Route path beginning with "/" (e.g. "/about"). */
  path: string;
  /** Set when the title should bypass the "%s | QuizSupport" template. */
  absoluteTitle?: boolean;
}

/**
 * Builds complete metadata for a public, indexable page: canonical URL,
 * Open Graph and Twitter cards. The full openGraph object is returned because
 * Next.js shallow-merges metadata — a page that defines `openGraph` replaces
 * the root layout's object entirely.
 */
export function buildPublicPageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: PublicPageMetadataInput): Metadata {
  const url = canonicalUrl(path);
  const socialTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      url,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

/**
 * Site-wide structured data (WebSite + Organization). No sameAs entries are
 * included because no official social profiles exist yet — add real profile
 * URLs when they do.
 */
export function buildSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/logo.png`,
      },
    ],
  };
}

/**
 * Serializes JSON-LD for inline injection. Escaping "<" prevents a "</script>"
 * sequence inside any string value from breaking out of the script tag.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
