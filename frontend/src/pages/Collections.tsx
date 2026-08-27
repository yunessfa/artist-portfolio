import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useBootstrap } from "@/store/bootstrap";
import { SmartImage } from "@/components/SmartImage";
import { HeroCount, PageHero } from "@/components/PageHero";
import { EmptyState, GridSkeleton } from "@/components/Feedback";
import { Reveal } from "@/motion/Reveal";
import { applySeo } from "@/lib/seo";
import { cx, toPersianDigits } from "@/lib/format";
import type { Collection, Paginated } from "@/lib/types";

export default function Collections() {
  const { site } = useBootstrap();
  const { data, loading } = useApi<Paginated<Collection>>("/collections/", {
    page_size: 24,
  });

  useEffect(() => {
    applySeo({
      title: `مجموعه‌ها — ${site?.site_name || ""}`,
      description: site?.default_seo_description || site?.description,
    });
  }, [site]);

  const collections = data?.results || [];

  return (
    <>
      <PageHero
        eyebrow="دوره‌های کاری"
        title="مجموعه‌ها"
        lead="هر مجموعه یک فصل از کار است؛ مجموعه‌ای از آثار که در یک دوره، با یک متریال یا حول یک پرسش شکل گرفته‌اند."
        tone="paper"
        pattern="pat-arcs"
        aside={
          data ? (
            <HeroCount
              value={toPersianDigits(data.count)}
              label="مجموعه‌ی منتشرشده"
            />
          ) : null
        }
      />

      <div className="section-y">
        {loading ? (
          <div className="container-x">
            <GridSkeleton count={4} />
          </div>
        ) : collections.length ? (
          <div className="container-x space-y-[clamp(4rem,8vw,7rem)]">
            {collections.map((collection, i) => (
              <Reveal key={collection.id} index={i % 2}>
                <article>
                  <Link
                    to={`/collections/${collection.slug}`}
                    className="group grid items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14"
                  >
                    <div
                      className={cx(
                        "media media-hover card-lift media-scrim",
                        i % 2 === 1 && "lg:order-2",
                      )}
                    >
                      <SmartImage
                        asset={collection.cover}
                        alt={collection.title}
                        ratio={4 / 3}
                        sizes="(max-width: 1024px) 100vw, 52vw"
                        priority={i === 0}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-4">
                        <span className="numeral" aria-hidden="true">
                          {toPersianDigits(String(i + 1).padStart(2, "0"))}
                        </span>
                        <span className="rule-accent" />
                      </div>
                      <h2 className="t-h2 mt-5">
                        <span className="link-u">{collection.title}</span>
                      </h2>
                      {collection.subtitle ? (
                        <p className="t-small mt-3 text-muted">
                          {collection.subtitle}
                        </p>
                      ) : null}
                      {collection.description ? (
                        <p className="t-body mt-5 max-w-xl leading-loose text-muted">
                          {collection.description}
                        </p>
                      ) : null}
                      <div className="mt-7 flex flex-wrap items-center gap-2">
                        {collection.year ? (
                          <span className="chip">
                            {toPersianDigits(collection.year)}
                          </span>
                        ) : null}
                        <span className="chip">
                          {toPersianDigits(collection.artwork_count)} اثر
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="container-x">
            <EmptyState
              title="مجموعه‌ای منتشر نشده است"
              body="از پنل مدیریت می‌توانید مجموعه‌ی تازه بسازید و آثار را به آن اضافه کنید."
            />
          </div>
        )}
      </div>

      <section className="band-soft pat pat-hatch">
        <div className="container-x section-y-sm">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Reveal>
              <p className="eyebrow">آرشیو</p>
              <h2 className="t-h3 mt-3">دیدن همه‌ی آثار به ترتیب زمانی</h2>
            </Reveal>
            <Reveal index={1}>
              <Link to="/artworks" className="btn btn-accent">
                آرشیو آثار
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
