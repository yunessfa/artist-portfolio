import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useBootstrap } from "@/store/bootstrap";
import { SmartImage } from "@/components/SmartImage";
import { PageHero } from "@/components/PageHero";
import { PageSkeleton } from "@/components/Feedback";
import { SeasonMark } from "@/components/SeasonMark";
import { Reveal } from "@/motion/Reveal";
import { useParallax } from "@/motion/useParallax";
import { applySeo } from "@/lib/seo";
import { toPersianDigits } from "@/lib/format";
import type { Artist } from "@/lib/types";

type AboutBundle = {
  artist: Artist;
  mediums: Array<{ id: number; label: string }>;
  stats: Array<{ id: number; value: string; suffix: string; label: string }>;
  education: Array<{
    id: number;
    year: string;
    degree: string;
    institution: string;
    city: string;
  }>;
  awards: Array<{ id: number; year: string; title: string; issuer: string }>;
  publications: Array<{
    id: number;
    year: string;
    title: string;
    publisher: string;
    url: string;
  }>;
  timeline: Array<{ id: number; year: string; title: string; body: string }>;
};

/** Hairline index list used for education, awards and publications. */
function IndexList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    id: number;
    primary: string;
    secondary?: string;
    year?: string;
    url?: string;
  }>;
}) {
  if (!rows.length) return null;
  return (
    <section>
      <Reveal>
        <p className="eyebrow">{title}</p>
        <span className="rule-accent mt-4" />
      </Reveal>
      <ul className="mt-7 border-t border-line">
        {rows.map((row, i) => (
          <Reveal as="li" key={row.id} index={i}>
            <div className="list-row">
              <span className="row-year">
                {toPersianDigits(row.year || "")}
              </span>
              <div>
                <p className="t-body">
                  {row.url ? (
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      className="link-u"
                    >
                      {row.primary}
                    </a>
                  ) : (
                    row.primary
                  )}
                </p>
                {row.secondary ? (
                  <p className="t-caption mt-1 text-muted">{row.secondary}</p>
                ) : null}
              </div>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

export default function About() {
  const { site } = useBootstrap();
  const { data, loading } = useApi<AboutBundle>("/about/");
  const portraitRef = useParallax<HTMLDivElement>(50);

  useEffect(() => {
    if (!data?.artist) return;
    applySeo({
      title: `${data.artist.about_title || "درباره‌ی هنرمند"} — ${site?.site_name || ""}`,
      description: data.artist.statement || data.artist.biography,
      image: data.artist.portrait?.url || null,
    });
  }, [data?.artist, site?.site_name]);

  if (loading) return <PageSkeleton />;
  if (!data) return null;
  const { artist } = data;

  return (
    <>
      <PageHero
        eyebrow={artist.role || "درباره"}
        title={artist.about_title || artist.name}
        lead={artist.philosophy || null}
        tone="soft"
        pattern="pat-hatch"
        aside={<SeasonMark />}
      />

      {/* Portrait + biography, museum-label style. */}
      <section className="pat pat-wash">
        <div className="container-x section-y">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
            <div ref={portraitRef}>
              <Reveal variant="imageReveal">
                <div className="media media-scrim card-lift">
                  <SmartImage
                    asset={artist.portrait}
                    alt={artist.name}
                    ratio={4 / 5}
                    priority
                    sizes="(max-width: 1024px) 100vw, 42vw"
                  />
                </div>
              </Reveal>
              {data.mediums.length ? (
                <Reveal index={1}>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {data.mediums.map((medium) => (
                      <li key={medium.id} className="chip">
                        {medium.label}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ) : null}
            </div>

            <div>
              <Reveal>
                <div className="space-y-5 leading-loose text-muted">
                  {(artist.biography || "")
                    .split(/\n{2,}/)
                    .filter(Boolean)
                    .map((para, i) => (
                      <p key={i} className="t-body">
                        {para}
                      </p>
                    ))}
                </div>
              </Reveal>

              {artist.statement ? (
                <Reveal index={1}>
                  <blockquote className="pull-quote quote-mark mt-10">
                    <p className="eyebrow">بیانیه‌ی هنرمند</p>
                    <p className="t-body-lg mt-4 leading-loose">
                      {artist.statement}
                    </p>
                  </blockquote>
                </Reveal>
              ) : null}

              {data.stats.length ? (
                <Reveal index={2}>
                  <dl className="mt-12 grid grid-cols-2 gap-px border border-line bg-[var(--line)] sm:grid-cols-4">
                    {data.stats.map((stat) => (
                      <div
                        key={stat.id}
                        className="bg-surface p-5 transition-colors duration-base hover:bg-[var(--accent-soft)]"
                      >
                        <dt className="t-caption text-muted">{stat.label}</dt>
                        <dd className="numeral mt-2">
                          {toPersianDigits(stat.value)}
                          {stat.suffix ? (
                            <span className="t-small"> {stat.suffix}</span>
                          ) : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Reveal>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Career path as a vertical timeline over the dark band. */}
      {data.timeline.length ? (
        <section className="band-dark pat pat-rules">
          <div className="container-x section-y">
            <Reveal>
              <p className="eyebrow">مسیر کاری</p>
              <h2 className="t-h2 mt-4">خط زمانی کارگاه</h2>
              <span className="rule-accent mt-5" />
            </Reveal>
            <ol className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
              {data.timeline.map((entry, i) => (
                <Reveal as="li" key={entry.id} index={i}>
                  <div className="border-t border-[var(--ink-line)] pt-6">
                    <span className="numeral" aria-hidden="true">
                      {toPersianDigits(entry.year)}
                    </span>
                    <h3 className="t-h3 mt-4">{entry.title}</h3>
                    <p className="t-small mt-3 leading-loose">{entry.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* Education / awards / publications as three hairline indexes. */}
      <section className="pat pat-dots">
        <div className="container-x section-y grid gap-14 lg:grid-cols-2">
          <IndexList
            title="تحصیلات"
            rows={data.education.map((row) => ({
              id: row.id,
              year: row.year,
              primary: row.degree,
              secondary: [row.institution, row.city]
                .filter(Boolean)
                .join(" · "),
            }))}
          />
          <IndexList
            title="جوایز و اقامت‌ها"
            rows={data.awards.map((row) => ({
              id: row.id,
              year: row.year,
              primary: row.title,
              secondary: row.issuer,
            }))}
          />
          <IndexList
            title="انتشارات و مطبوعات"
            rows={data.publications.map((row) => ({
              id: row.id,
              year: row.year,
              primary: row.title,
              secondary: row.publisher,
              url: row.url,
            }))}
          />
        </div>
      </section>

      <section className="band-soft pat pat-hatch">
        <div className="container-x section-y-sm">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Reveal>
              <p className="eyebrow">ادامه‌ی مسیر</p>
              <h2 className="t-h3 mt-3">رزومه‌ی کامل و فهرست حضورها</h2>
            </Reveal>
            <Reveal index={1} className="flex flex-wrap gap-3">
              <Link to="/resume" className="btn btn-accent">
                رزومه‌ی هنری
              </Link>
              <Link to="/exhibitions" className="btn btn-ghost">
                نمایشگاه‌ها
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
