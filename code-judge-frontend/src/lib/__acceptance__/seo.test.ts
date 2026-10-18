/**
 * SEO regression tests: canonical-host consistency, robots.txt / sitemap
 * contracts, structured-data safety, focus-mode reachability, and noindex
 * coverage for private routes.
 *
 * Run:  npx tsx src/lib/__acceptance__/seo.test.ts
 * (pure TS — run from the project root so source-file assertions resolve)
 */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import robots from "../../app/robots";
import sitemap from "../../app/sitemap";
import { FOCUS_HOME_REDIRECT_PREFIXES, isHomeRedirectPath, isPathAllowed } from "../../config/focusMode";
import {
  SITE_URL,
  canonicalUrl,
  buildPublicPageMetadata,
  buildSiteJsonLd,
  serializeJsonLd,
} from "../seo/site";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`✓ ${name}`);
};

const readSource = (relativePath: string): string => {
  const full = `src/${relativePath}`;
  assert.ok(existsSync(full), `expected source file ${full} to exist`);
  return readFileSync(full, "utf8");
};

// ──────────────────────────────────────────────────────────────────────────
// 1. Canonical host + public page metadata
// ──────────────────────────────────────────────────────────────────────────

test("canonical URLs always use the https://www.quizsupport.com origin", () => {
  assert.equal(SITE_URL, "https://www.quizsupport.com");
  assert.equal(canonicalUrl("/"), "https://www.quizsupport.com/");
  assert.equal(canonicalUrl("/about"), "https://www.quizsupport.com/about");
  assert.equal(canonicalUrl("docs"), "https://www.quizsupport.com/docs");
});

test("public page metadata carries canonical, Open Graph and Twitter cards", () => {
  const meta = buildPublicPageMetadata({
    title: "About QuizSupport",
    description: "QuizSupport is an online quiz platform.",
    path: "/about",
  });
  const og = meta.openGraph as { title?: unknown; url?: unknown; images?: unknown } | null;
  const twitter = meta.twitter as { card?: unknown; title?: unknown } | null;

  assert.equal(meta.alternates?.canonical, "https://www.quizsupport.com/about");
  assert.equal(og?.url, "https://www.quizsupport.com/about");
  assert.equal(og?.title, "About QuizSupport | QuizSupport");
  assert.deepEqual(og?.images, ["/og-image.png"]);
  assert.equal(twitter?.card, "summary_large_image");
});

test("an absolute title bypasses the title template for social cards", () => {
  const meta = buildPublicPageMetadata({
    title: "QuizSupport – Online Quizzes for Students & Teachers",
    description: "desc",
    path: "/",
    absoluteTitle: true,
  });
  const og = meta.openGraph as { title?: unknown } | null;
  assert.deepEqual(meta.title, {
    absolute: "QuizSupport – Online Quizzes for Students & Teachers",
  });
  assert.equal(og?.title, "QuizSupport – Online Quizzes for Students & Teachers");
});

// ──────────────────────────────────────────────────────────────────────────
// 2. Sitemap contract
// ──────────────────────────────────────────────────────────────────────────

test("sitemap lists only reachable public pages on the canonical host", () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);
  assert.deepEqual(urls, [
    "https://www.quizsupport.com/",
    "https://www.quizsupport.com/about",
    "https://www.quizsupport.com/contact",
    "https://www.quizsupport.com/privacy",
    "https://www.quizsupport.com/docs",
    "https://www.quizsupport.com/meet-the-developer",
  ]);
  for (const entry of entries) {
    assert.ok(
      entry.url.startsWith("https://www.quizsupport.com"),
      `sitemap URL must use the canonical host: ${entry.url}`
    );
    assert.ok(
      !("lastModified" in entry),
      "sitemap must not emit fabricated lastModified dates"
    );
  }
});

test("sitemap excludes auth-gated and private routes", () => {
  const urls = sitemap().map((entry) => entry.url);
  for (const privatePath of [
    "/quiz",
    "/quiz/join",
    "/quiz/attempts",
    "/login",
    "/register",
    "/forgot-password",
    "/creator",
    "/platform",
  ]) {
    assert.ok(
      !urls.some((url) => url.includes(privatePath)),
      `sitemap must not include ${privatePath}`
    );
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 3. robots.txt contract
// ──────────────────────────────────────────────────────────────────────────

test("robots.txt points at the www sitemap and disallows private areas", () => {
  const result = robots();
  assert.equal(result.sitemap, "https://www.quizsupport.com/sitemap.xml");

  const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
  const first = rules[0];
  const rawDisallow = Array.isArray(first.disallow) ? first.disallow : [first.disallow];
  const disallow = rawDisallow.filter((value): value is string => typeof value === "string");

  for (const path of [
    "/api/",
    "/creator",
    "/platform",
    "/dashboard",
    "/profile",
    "/settings",
    "/inbox",
    "/quiz/attempts",
  ]) {
    assert.ok(disallow.includes(path), `robots.txt should disallow ${path}`);
  }

  // Auth pages must stay crawlable so their noindex meta tag can be read.
  for (const path of ["/login", "/register", "/forgot-password"]) {
    assert.ok(
      !disallow.includes(path),
      `robots.txt must not disallow ${path} — the noindex meta must remain reachable`
    );
  }

  for (const path of ["/", "/about", "/docs", "/meet-the-developer"]) {
    assert.ok(!disallow.includes(path), `robots.txt must not disallow public path ${path}`);
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 4. Structured data
// ──────────────────────────────────────────────────────────────────────────

test("site JSON-LD describes WebSite + Organization with a real logo URL", () => {
  const ld = JSON.parse(serializeJsonLd(buildSiteJsonLd())) as {
    "@context": string;
    "@graph": Array<Record<string, unknown>>;
  };
  assert.equal(ld["@context"], "https://schema.org");
  assert.deepEqual(
    ld["@graph"].map((node) => node["@type"]),
    ["WebSite", "Organization"]
  );
  const organization = ld["@graph"].find((node) => node["@type"] === "Organization");
  assert.equal(organization?.["logo"], "https://www.quizsupport.com/logo.png");
  assert.equal(organization?.["url"], "https://www.quizsupport.com/");
});

test("JSON-LD serialization escapes script breakouts", () => {
  const serialized = serializeJsonLd({ evil: '</script><script>alert("x")</script>' });
  assert.ok(!serialized.includes("</script>"), "must not emit a raw closing script tag");
  assert.ok(serialized.includes("\\u003c"), "must escape < characters");
});

// ──────────────────────────────────────────────────────────────────────────
// 5. Focus-mode reachability (client allowlist must match the proxy)
// ──────────────────────────────────────────────────────────────────────────

test("focus-mode client allowlist keeps every indexable public page reachable", () => {
  for (const path of [
    "/",
    "/about",
    "/contact",
    "/privacy",
    "/docs",
    "/meet-the-developer",
    "/robots.txt",
    "/sitemap.xml",
    "/quiz/join",
  ]) {
    assert.equal(isPathAllowed(path), true, `expected ${path} to be allowed in focus mode`);
  }
  for (const path of ["/problems", "/feed", "/dashboard", "/leaderboard", "/pricing"]) {
    assert.equal(isPathAllowed(path), false, `expected ${path} to be blocked in focus mode`);
  }
});

test("blocked marketing pages redirect to the homepage, not the quiz hub", () => {
  assert.deepEqual(FOCUS_HOME_REDIRECT_PREFIXES, ["/pricing"]);
  assert.equal(isHomeRedirectPath("/pricing"), true, "expected /pricing to redirect home");
  assert.equal(isHomeRedirectPath("/pricing#credits"), false, "only pathnames are checked");
  assert.equal(isHomeRedirectPath("/quiz"), false, "quiz routes keep the quiz-hub flow");

  const urls = sitemap().map((entry) => entry.url);
  assert.ok(
    !urls.some((url) => url.includes("/pricing")),
    "blocked pages must not be listed in the sitemap"
  );

  const proxySource = readFileSync("proxy.ts", "utf8");
  assert.ok(
    proxySource.includes('FOCUS_HOME_REDIRECT_PREFIXES = ["/pricing"]'),
    "proxy.ts must mirror the home-redirect list"
  );
});

// ──────────────────────────────────────────────────────────────────────────
// 6. Source-level guarantees that cannot be checked through runtime imports
// ──────────────────────────────────────────────────────────────────────────

test("private route groups export noindex robots metadata", () => {
  assert.match(readSource("app/(auth)/layout.tsx"), /index: false/);
  assert.match(readSource("app/(app)/quiz/layout.tsx"), /index: false/);
  assert.match(readSource("app/(app)/quiz/join/layout.tsx"), /index: false/);
  assert.match(readSource("app/creator/layout.tsx"), /index: false/);
  assert.match(readSource("app/(dashboard)/layout.tsx"), /index: false/);
});

test("root layout no longer imposes a site-wide canonical", () => {
  const rootLayout = readSource("app/layout.tsx");
  assert.ok(
    !/alternates:\s*\{\s*canonical/.test(rootLayout),
    "root layout must not set alternates.canonical — it is inherited by every route"
  );
});

test("every public page declares its own canonical via buildPublicPageMetadata", () => {
  const pages: Array<[string, string]> = [
    ["app/page.tsx", "/"],
    ["app/about/page.tsx", "/about"],
    ["app/contact/page.tsx", "/contact"],
    ["app/privacy/page.tsx", "/privacy"],
    ["app/pricing/layout.tsx", "/pricing"],
    ["app/docs/page.tsx", "/docs"],
    ["app/meet-the-developer/page.tsx", "/meet-the-developer"],
  ];
  for (const [file, path] of pages) {
    const source = readSource(file);
    assert.match(source, /buildPublicPageMetadata\(/, `${file} should use buildPublicPageMetadata`);
    assert.ok(source.includes(`path: "${path}"`), `${file} should canonicalize ${path}`);
  }
});

test("proxy sends X-Robots-Tag noindex headers for private prefixes", () => {
  const proxySource = readFileSync("proxy.ts", "utf8");
  assert.match(proxySource, /X-Robots-Tag/);
  assert.match(proxySource, /"noindex, nofollow"/);
  assert.match(proxySource, /"noindex, follow"/);
});

console.log(`\n${passed} SEO regression tests passed.`);
