type SeoInput = {
  title?: string;
  description?: string;
  image?: string | null;
  url?: string;
  type?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | null;
};

function upsertMeta(
  selector: string,
  attr: string,
  name: string,
  content: string,
) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

const JSON_LD_ID = "ap-jsonld";

/** Imperative head management – no extra dependency needed for this scale. */
export function applySeo(input: SeoInput): void {
  const url = input.url || window.location.href;
  if (input.title) document.title = input.title;
  if (input.description)
    upsertMeta(
      'meta[name="description"]',
      "name",
      "description",
      input.description,
    );

  upsertMeta(
    'meta[property="og:title"]',
    "property",
    "og:title",
    input.title || document.title,
  );
  upsertMeta(
    'meta[property="og:description"]',
    "property",
    "og:description",
    input.description || "",
  );
  upsertMeta(
    'meta[property="og:type"]',
    "property",
    "og:type",
    input.type || "website",
  );
  upsertMeta('meta[property="og:url"]', "property", "og:url", url);
  if (input.image)
    upsertMeta(
      'meta[property="og:image"]',
      "property",
      "og:image",
      absolute(input.image),
    );

  upsertMeta(
    'meta[name="twitter:card"]',
    "name",
    "twitter:card",
    input.image ? "summary_large_image" : "summary",
  );
  upsertMeta(
    'meta[name="twitter:title"]',
    "name",
    "twitter:title",
    input.title || document.title,
  );
  if (input.description)
    upsertMeta(
      'meta[name="twitter:description"]',
      "name",
      "twitter:description",
      input.description,
    );
  if (input.image)
    upsertMeta(
      'meta[name="twitter:image"]',
      "name",
      "twitter:image",
      absolute(input.image),
    );

  let canonical = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;

  const robots = input.noindex ? "noindex, nofollow" : "index, follow";
  upsertMeta('meta[name="robots"]', "name", "robots", robots);

  document.getElementById(JSON_LD_ID)?.remove();
  if (input.jsonLd) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = JSON_LD_ID;
    script.textContent = JSON.stringify(input.jsonLd);
    document.head.appendChild(script);
  }
}

function absolute(src: string): string {
  if (/^https?:/i.test(src)) return src;
  return `${window.location.origin}${src.startsWith("/") ? "" : "/"}${src}`;
}

/** Schema.org VisualArtwork payload for artwork detail pages. */
export function visualArtworkJsonLd(opts: {
  name: string;
  description?: string;
  image?: string | null;
  artist?: string;
  dateCreated?: string;
  medium?: string;
  material?: string;
  width?: string;
  url?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: opts.name,
    description: opts.description || undefined,
    image: opts.image ? absolute(opts.image) : undefined,
    artform: opts.medium || undefined,
    artMedium: opts.material || undefined,
    dateCreated: opts.dateCreated || undefined,
    url: opts.url || window.location.href,
    creator: opts.artist ? { "@type": "Person", name: opts.artist } : undefined,
  };
}
