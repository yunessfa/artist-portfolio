import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type {
  Artwork,
  Collection,
  Exhibition,
  Paginated,
  PageSection,
} from "@/lib/types";
import { useBootstrap } from "@/store/bootstrap";
import { useApi } from "@/hooks/useApi";
import { Reveal } from "@/motion/Reveal";
import { useParallax, usePointerParallax } from "@/motion/useParallax";
import { SmartImage } from "@/components/SmartImage";
import { GalleryGrid } from "@/components/GalleryGrid";
import { SeasonMark } from "@/components/SeasonMark";
import { cx, toPersianDigits } from "@/lib/format";

/*
 * Section colour rhythm. Every option maps to a real band in the design
 * system, so a page reads as paper → warm tint → ink → paper instead of one
 * endless white sheet.
 */
const BG_CLASS: Record<string, string> = {
  default: "",
  surface: "bg-surface",
  surface2: "band",
  accent: "band-dark",
};

const SPACING: Record<string, string> = {
  compact: "py-14",
  normal: "section-y",
  spacious: "py-[calc(var(--section-space)*1.5)]",
};

function setting<T>(section: PageSection, key: string, fallback: T): T {
  const value = (section.settings || {})[key];
  return (
    value === undefined || value === null || value === "" ? fallback : value
  ) as T;
}

function Shell({
  section,
  children,
  id,
  pattern,
}: {
  section: PageSection;
  children: ReactNode;
  id?: string;
  /** Decorative gradient pattern class, e.g. "pat-dots". */
  pattern?: string;
}) {
  return (
    <section
      id={id || section.section_type}
      className={cx(
        BG_CLASS[section.background] ?? "",
        SPACING[section.spacing],
        pattern ? `pat ${pattern}` : "",
      )}
    >
      <div className="container-x">{children}</div>
    </section>
  );
}

function Head({ section }: { section: PageSection }) {
  if (!section.eyebrow && !section.heading && !section.subheading) return null;
  return (
    <header className="mb-12 max-w-2xl">
      {section.eyebrow ? (
        <Reveal variant="fadeIn">
          <p className="eyebrow">{section.eyebrow}</p>
        </Reveal>
      ) : null}
      {section.heading ? (
        <Reveal>
          <span className="rule-accent mb-5 mt-4" aria-hidden="true" />
          <h2 className="t-h2">{section.heading}</h2>
        </Reveal>
      ) : null}
      {section.subheading ? (
        <Reveal index={1}>
          <p className="mt-4 text-muted">{section.subheading}</p>
        </Reveal>
      ) : null}
    </header>
  );
}

function Paragraphs({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <div className="space-y-4 leading-loose text-muted">
      {text
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((para, i) => (
          <p key={i}>{para}</p>
        ))}
    </div>
  );
}

/** Hero: scroll- and pointer-driven depth, never a self-running loop (#4). */
function Hero({ section }: { section: PageSection }) {
  const { artist } = useBootstrap();
  const glowRef = useParallax<HTMLDivElement>(90);
  const pointerRef = usePointerParallax<HTMLDivElement>(10);
  const lines = setting<string[]>(section, "lines", artist?.hero_lines || []);
  const headline = lines.length
    ? lines
    : [section.heading || artist?.name || ""];
  const image = section.image || artist?.portrait || null;
  const ctaLabel = setting(
    section,
    "cta_label",
    artist?.hero_cta_label || "دیدن آثار",
  );
  const ctaUrl = setting(
    section,
    "cta_url",
    artist?.hero_cta_url || "/artworks",
  );

  return (
    <section className="glow-hero relative flex min-h-[92vh] items-center overflow-hidden pt-[var(--header-h)]">
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div
          className="absolute -end-[18%] top-[12%] h-[52vmax] w-[52vmax] rounded-full blur-[100px] opacity-70"
          style={{ background: "var(--grad-accent)" }}
        />
        <div
          className="absolute -start-[14%] bottom-[6%] h-[34vmax] w-[34vmax] rounded-full blur-[110px] opacity-50"
          style={{ background: "var(--season-glow)" }}
        />
      </div>

      <div className="container-x grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <Reveal variant="fadeIn">
            <span className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">{section.eyebrow || artist?.role}</p>
              <SeasonMark />
            </span>
          </Reveal>
          <h1 className="t-display mt-6">
            {headline.map((line, i) => (
              <Reveal
                key={i}
                variant="textSplit"
                index={i}
                as="span"
                className="block"
              >
                {line}
              </Reveal>
            ))}
          </h1>
          {section.body || artist?.hero_caption ? (
            <Reveal index={3}>
              <p className="mt-8 max-w-md text-muted">
                {section.body || artist?.hero_caption}
              </p>
            </Reveal>
          ) : null}
          <Reveal index={4}>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to={ctaUrl} className="btn btn-primary">
                {ctaLabel}
              </Link>
              <Link to="/contact" className="btn btn-ghost">
                گفتوگو درباره‌ی سفارش
              </Link>
            </div>
          </Reveal>
        </div>

        <div ref={pointerRef}>
          <Reveal variant="imageReveal">
            <div className="media">
              <SmartImage
                asset={image}
                priority
                ratio={4 / 5}
                sizes="(max-width: 1024px) 90vw, 45vw"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Stats({ section }: { section: PageSection }) {
  const { data } = useBootstrap();
  const stats = data?.stats || [];
  if (!stats.length) return null;
  return (
    <Shell section={section} pattern="pat-dots">
      <Head section={section} />
      <div className="grid gap-px overflow-hidden rounded-[var(--radius)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Reveal
            key={stat.id}
            index={i}
            className="bg-surface p-8 transition-colors duration-base hover:bg-[var(--accent-soft)]"
          >
            <p className="numeral">
              {toPersianDigits(stat.value)}
              <span className="text-[0.5em]">{stat.suffix}</span>
            </p>
            <p className="t-small mt-3 text-muted">{stat.label}</p>
          </Reveal>
        ))}
      </div>
    </Shell>
  );
}

function FeaturedWorks({ section }: { section: PageSection }) {
  const { data } = useBootstrap();
  const artworks = (data?.featured || []).slice(
    0,
    Number(setting(section, "limit", 6)),
  );
  if (!artworks.length) return null;
  return (
    <Shell section={section} id="works">
      <Head section={section} />
      <GalleryGrid
        artworks={artworks}
        layout={setting(section, "layout", undefined as never)}
      />
      <Reveal className="mt-14 text-center">
        <Link to="/artworks" className="btn btn-ghost">
          تمام آثار
        </Link>
      </Reveal>
    </Shell>
  );
}

function Gallery({ section }: { section: PageSection }) {
  const { data } = useApi<Paginated<Artwork>>("/artworks/", {
    page_size: Number(setting(section, "limit", 9)),
    category: setting<string | undefined>(section, "category", undefined),
  });
  const artworks = data?.results || [];
  if (!artworks.length) return null;
  return (
    <Shell section={section}>
      <Head section={section} />
      <GalleryGrid
        artworks={artworks}
        layout={setting(section, "layout", undefined as never)}
      />
    </Shell>
  );
}

function Collections({ section }: { section: PageSection }) {
  const { data } = useApi<Paginated<Collection>>("/collections/", {
    page_size: 6,
  });
  const collections = data?.results || [];
  if (!collections.length) return null;
  return (
    <Shell section={section} id="collections">
      <Head section={section} />
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection, i) => (
          <Reveal key={collection.id} index={i}>
            <Link to={`/collections/${collection.slug}`}>
              <div className="overflow-hidden">
                <SmartImage asset={collection.cover} ratio={3 / 4} />
              </div>
              <h3 className="mt-4 font-display text-xl">{collection.title}</h3>
              <p className="mt-1 text-sm text-muted">
                {collection.subtitle ||
                  `${toPersianDigits(collection.artwork_count)} اثر`}
              </p>
            </Link>
          </Reveal>
        ))}
      </div>
    </Shell>
  );
}

function Spotlight({ section }: { section: PageSection }) {
  const { artist } = useBootstrap();
  const quote = section.body || artist?.spotlight_quote;
  const meta = section.subheading || artist?.spotlight_meta;
  if (!quote) return null;
  return (
    <Shell section={section} pattern="pat-wash">
      <Reveal variant="clipReveal">
        <blockquote className="quote-mark relative mx-auto max-w-3xl text-center font-display text-[clamp(1.6rem,3.4vw,2.6rem)] leading-[1.5]">
          «{quote}»
        </blockquote>
      </Reveal>
      {meta ? (
        <Reveal index={1}>
          <p className="mt-6 text-center text-sm text-muted">{meta}</p>
        </Reveal>
      ) : null}
    </Shell>
  );
}

function About({ section }: { section: PageSection }) {
  const { artist } = useBootstrap();
  const imageRef = useParallax<HTMLDivElement>(40);
  const image =
    section.image || artist?.studio_image || artist?.portrait || null;
  return (
    <Shell section={section} id="about">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div ref={imageRef}>
          <Reveal variant="imageReveal">
            <div className="media">
              <SmartImage asset={image} ratio={4 / 5} />
            </div>
          </Reveal>
        </div>
        <div>
          <Head section={section} />
          <Reveal index={1}>
            <Paragraphs text={section.body || artist?.biography} />
          </Reveal>
          <Reveal index={2}>
            <Link to="/about" className="btn btn-ghost mt-8">
              درباره‌ی هنرمند
            </Link>
          </Reveal>
        </div>
      </div>
    </Shell>
  );
}

function Timeline({ section }: { section: PageSection }) {
  type Entry = { id: number; year: string; title: string; body: string };
  const { data } = useApi<Paginated<Entry>>("/timeline/", { page_size: 40 });
  const entries = data?.results || [];
  if (!entries.length) return null;
  return (
    <Shell section={section}>
      <Head section={section} />
      <ol className="space-y-10 border-s border-line ps-8">
        {entries.map((entry, i) => (
          <Reveal as="li" key={entry.id} index={i} className="relative">
            <span
              className="absolute -start-[37px] top-2 h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--accent)" }}
              aria-hidden="true"
            />
            <p className="eyebrow">{toPersianDigits(entry.year)}</p>
            <h3 className="mt-2 font-display text-xl">{entry.title}</h3>
            <p className="mt-2 text-sm leading-loose text-muted">
              {entry.body}
            </p>
          </Reveal>
        ))}
      </ol>
    </Shell>
  );
}

function Exhibitions({ section }: { section: PageSection }) {
  const { data } = useApi<Paginated<Exhibition>>("/exhibitions/", {
    page_size: 5,
  });
  const items = data?.results || [];
  if (!items.length) return null;
  const [lead, ...rest] = items;
  return (
    <Shell section={section} id="exhibitions" pattern="pat-rules">
      <Head section={section} />

      {/* Lead exhibition: a real poster, not a text row. */}
      <Reveal variant="imageReveal">
        <Link
          to={`/exhibitions#exh-${lead.slug}`}
          className="group grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-stretch"
        >
          <div className="media media-hover card-lift media-scrim">
            <SmartImage
              asset={lead.cover}
              alt={lead.title}
              ratio={16 / 11}
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
          </div>
          <div className="flex flex-col justify-center gap-4 lg:ps-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">{lead.state_label}</span>
              <span className="chip">{toPersianDigits(lead.year_label)}</span>
              {lead.kind_label ? (
                <span className="chip">{lead.kind_label}</span>
              ) : null}
            </div>
            <h3 className="t-h2">
              <span className="link-u">{lead.title}</span>
            </h3>
            <p className="t-small text-muted">{lead.location_display}</p>
            {lead.description ? (
              <p className="t-body max-w-xl text-muted">{lead.description}</p>
            ) : null}
            {lead.curator ? (
              <p className="t-caption text-muted">
                کـوراتور: {lead.curator}
              </p>
            ) : null}
          </div>
        </Link>
      </Reveal>

      {/* The rest as an editorial schedule with big year numerals. */}
      {rest.length ? (
        <ul className="mt-16 border-t border-line">
          {rest.map((item, i) => (
            <Reveal
              as="li"
              key={item.id}
              index={i}
              className="group border-b border-line"
            >
              <Link
                to={`/exhibitions#exh-${item.slug}`}
                className="grid items-center gap-5 py-7 sm:grid-cols-[auto_1fr_auto]"
              >
                <span className="numeral shrink-0" aria-hidden="true">
                  {toPersianDigits(item.year_label)}
                </span>
                <span className="min-w-0">
                  <span className="t-h3 block">
                    <span className="link-u">{item.title}</span>
                  </span>
                  <span className="t-caption mt-1 block text-muted">
                    {item.location_display}
                    {item.kind_label ? ` · ${item.kind_label}` : ""}
                  </span>
                </span>
                <span className="chip shrink-0">{item.state_label}</span>
              </Link>
            </Reveal>
          ))}
        </ul>
      ) : null}
      <Reveal className="mt-10">
        <Link to="/exhibitions" className="btn btn-ghost">
          همه‌ی نمایشگاه‌ها
        </Link>
      </Reveal>
    </Shell>
  );
}

function Services({ section }: { section: PageSection }) {
  type Service = {
    id: number;
    title: string;
    description: string;
    icon: string;
    cta_label: string;
    cta_url: string;
  };
  const { data } = useApi<Paginated<Service>>("/services/", { page_size: 12 });
  const items = data?.results || [];
  if (!items.length) return null;
  return (
    <Shell section={section} pattern="pat-hatch">
      <Head section={section} />
      {/* Numbered steps: each card is a stage of the process, not a clone. */}
      <div className="grid gap-7 md:grid-cols-3">
        {items.map((item, i) => (
          <Reveal key={item.id} index={i} className="group h-full">
            <div
              className={cx(
                "card card-lift relative flex h-full flex-col overflow-hidden p-8",
                i % 3 === 1 ? "md:mt-10" : "",
              )}
            >
              <span
                className="pointer-events-none absolute -top-6 end-4 font-display text-[5.5rem] leading-none text-[var(--accent)] opacity-[0.09]"
                aria-hidden="true"
              >
                {toPersianDigits(String(i + 1))}
              </span>
              <span
                className="h-11 w-11 shrink-0 rounded-full text-center text-[1.35rem] leading-[2.75rem]"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                }}
                aria-hidden="true"
              >
                {item.icon || "◈"}
              </span>
              <h3 className="t-h3 mt-6">{item.title}</h3>
              <span className="rule-accent mt-4" aria-hidden="true" />
              <p className="t-small mt-4 leading-loose text-muted">
                {item.description}
              </p>
              {item.cta_url ? (
                <Link
                  to={item.cta_url}
                  className="t-small mt-auto pt-6 text-accent"
                >
                  <span className="link-u">{item.cta_label || "بیشتر"}</span>
                </Link>
              ) : null}
            </div>
          </Reveal>
        ))}
      </div>
    </Shell>
  );
}

function Testimonials({ section }: { section: PageSection }) {
  type Testimonial = {
    id: number;
    text: string;
    author: string;
    source: string;
  };
  const { data } = useApi<Paginated<Testimonial>>("/testimonials/", {
    page_size: 12,
  });
  const items = data?.results || [];
  if (!items.length) return null;
  return (
    <Shell section={section} pattern="pat-wash">
      <Head section={section} />
      {/* Staggered quote cards with an oversized quote mark. */}
      <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <Reveal key={item.id} index={i} className="group h-full">
            <figure
              className={cx(
                "card card-lift quote-mark relative flex h-full flex-col p-8",
                i % 3 === 1 ? "lg:mt-12" : "",
                i % 3 === 2 ? "lg:mt-6" : "",
              )}
            >
              <blockquote className="t-body leading-loose">
                «{item.text}»
              </blockquote>
              <figcaption className="mt-auto pt-7">
                <span className="rule-accent mb-4" aria-hidden="true" />
                <span className="t-small block">{item.author}</span>
                {item.source ? (
                  <span className="t-caption block text-muted">
                    {item.source}
                  </span>
                ) : null}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Shell>
  );
}

function Cta({ section }: { section: PageSection }) {
  return (
    <Shell section={section} pattern="pat-wash">
      <div className="flex flex-col items-center gap-6 text-center">
        <Reveal variant="fadeIn">
          <SeasonMark />
        </Reveal>
        <Reveal>
          <span className="rule-accent mx-auto" aria-hidden="true" />
          <h2 className="mt-6 max-w-2xl text-3xl md:text-4xl">
            {section.heading}
          </h2>
        </Reveal>
        {section.body ? (
          <Reveal index={1}>
            <p className="max-w-xl text-muted">{section.body}</p>
          </Reveal>
        ) : null}
        <Reveal index={2}>
          <Link
            to={setting(section, "cta_url", "/contact")}
            className="btn btn-primary"
          >
            {setting(section, "cta_label", "تماس با من")}
          </Link>
        </Reveal>
      </div>
    </Shell>
  );
}

function Contact({ section }: { section: PageSection }) {
  const { site, data } = useBootstrap();
  return (
    <Shell section={section} id="contact">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <Head section={section} />
          <Reveal index={1}>
            <ul className="space-y-3 text-sm">
              {site?.email ? (
                <li>
                  <span className="text-muted">ایمیل: </span>
                  <a href={`mailto:${site.email}`}>{site.email}</a>
                </li>
              ) : null}
              {site?.phone ? (
                <li>
                  <span className="text-muted">تلفن: </span>
                  {toPersianDigits(site.phone)}
                </li>
              ) : null}
              {site?.address ? (
                <li>
                  <span className="text-muted">نشانی: </span>
                  {site.address}
                </li>
              ) : null}
            </ul>
          </Reveal>
          <Reveal index={2}>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              {(data?.socials || []).map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {social.label || social.platform}
                </a>
              ))}
            </div>
          </Reveal>
        </div>
        <Reveal index={1}>
          <div className="card p-7">
            <Paragraphs text={section.body || site?.studio_note} />
            <Link to="/contact" className="btn btn-primary mt-6">
              فرم تماس
            </Link>
          </div>
        </Reveal>
      </div>
    </Shell>
  );
}

function RichText({ section }: { section: PageSection }) {
  return (
    <Shell section={section}>
      <Head section={section} />
      <Reveal>
        <div className="max-w-2xl">
          <Paragraphs text={section.body} />
        </div>
      </Reveal>
    </Shell>
  );
}

/** Full-bleed band: scale interpolation driven purely by scroll progress. */
function ImageBand({ section }: { section: PageSection }) {
  const bandRef = useParallax<HTMLDivElement>(40, { scale: true });
  return (
    <section className="relative overflow-hidden">
      <div ref={bandRef}>
        <SmartImage
          asset={section.image}
          ratio={21 / 9}
          sizes="100vw"
          className="w-full"
        />
      </div>
      {section.heading ? (
        <div className="container-x absolute inset-0 flex items-center">
          <Reveal variant="clipReveal">
            <h2 className="max-w-xl text-3xl text-white drop-shadow-lg md:text-5xl">
              {section.heading}
            </h2>
          </Reveal>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Maps a PageSection row to a component. Unknown types render nothing instead
 * of crashing, so adding a section type server-side can never break a deployed
 * frontend.
 */
export function SectionRenderer({ section }: { section: PageSection }) {
  if (!section.is_enabled) return null;
  switch (section.section_type) {
    case "hero":
      return <Hero section={section} />;
    case "stats":
      return <Stats section={section} />;
    case "featured_works":
      return <FeaturedWorks section={section} />;
    case "gallery":
      return <Gallery section={section} />;
    case "collections":
      return <Collections section={section} />;
    case "spotlight":
    case "quote":
      return <Spotlight section={section} />;
    case "about":
      return <About section={section} />;
    case "timeline":
      return <Timeline section={section} />;
    case "exhibitions":
      return <Exhibitions section={section} />;
    case "services":
      return <Services section={section} />;
    case "testimonials":
      return <Testimonials section={section} />;
    case "cta":
      return <Cta section={section} />;
    case "contact":
      return <Contact section={section} />;
    case "rich_text":
      return <RichText section={section} />;
    case "image_band":
      return <ImageBand section={section} />;
    default:
      return null;
  }
}
