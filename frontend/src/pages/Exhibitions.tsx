import { useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { useBootstrap } from "@/store/bootstrap";
import { SmartImage } from "@/components/SmartImage";
import { HeroCount, PageHero } from "@/components/PageHero";
import { EmptyState, GridSkeleton } from "@/components/Feedback";
import { Reveal } from "@/motion/Reveal";
import { applySeo } from "@/lib/seo";
import { formatDate, toPersianDigits } from "@/lib/format";
import type { Exhibition, Paginated } from "@/lib/types";

const GROUPS: Array<{ state: string; label: string; pattern: string }> = [
  { state: "current", label: "در جریان", pattern: "pat-wash" },
  { state: "upcoming", label: "پیش‌رو", pattern: "pat-dots" },
  { state: "past", label: "گزیده‌ی گذشته", pattern: "pat-rules" },
];

/** One exhibition rendered as a poster: cover, chips, venue, dates. */
function Poster({ item, priority }: { item: Exhibition; priority?: boolean }) {
  return (
    <article id={`exh-${item.slug}`} className="scroll-mt-[120px]">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-14">
        <Reveal variant="imageReveal">
          <div className="media media-hover card-lift media-scrim">
            <SmartImage
              asset={item.cover}
              alt={item.title}
              ratio={16 / 11}
              priority={priority}
              sizes="(max-width: 1024px) 100vw, 56vw"
            />
          </div>
        </Reveal>
        <Reveal index={1}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">{item.state_label}</span>
            {item.year_label ? (
              <span className="chip">{toPersianDigits(item.year_label)}</span>
            ) : null}
            {item.kind_label ? (
              <span className="chip">{item.kind_label}</span>
            ) : null}
          </div>
          <h2 className="t-h2 mt-5">{item.title}</h2>
          <span className="rule-accent mt-5" />
          <p className="t-body mt-5 text-muted">{item.location_display}</p>
          {item.start_date ? (
            <p className="t-small mt-2 text-muted">
              {formatDate(item.start_date)}
              {item.end_date ? ` — ${formatDate(item.end_date)}` : ""}
            </p>
          ) : null}
          {item.description ? (
            <p className="t-body mt-6 max-w-xl leading-loose text-muted">
              {item.description}
            </p>
          ) : null}
          {item.curator ? (
            <p className="t-caption mt-5 text-muted">
              کوراتور: {item.curator}
            </p>
          ) : null}
          {item.external_url ? (
            <a
              href={item.external_url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost mt-7"
            >
              اطلاعات بیشتر
            </a>
          ) : null}
        </Reveal>
      </div>
    </article>
  );
}

/** A past exhibition rendered as an editorial schedule row. */
function ScheduleRow({ item, index }: { item: Exhibition; index: number }) {
  return (
    <Reveal as="li" index={index}>
      <div
        id={`exh-${item.slug}`}
        className="list-row scroll-mt-[120px] items-center sm:!grid-cols-[110px_1fr_auto]"
      >
        <span className="numeral" aria-hidden="true">
          {toPersianDigits(item.year_label)}
        </span>
        <div className="min-w-0">
          <p className="t-h3">{item.title}</p>
          <p className="t-caption mt-2 text-muted">
            {item.location_display}
            {item.kind_label ? ` · ${item.kind_label}` : ""}
          </p>
          {item.description ? (
            <p className="t-small mt-3 max-w-2xl leading-loose text-muted">
              {item.description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {item.cover ? (
            <span className="media media-hover hidden w-28 sm:block">
              <SmartImage
                asset={item.cover}
                alt={item.title}
                ratio={1}
                sizes="120px"
              />
            </span>
          ) : null}
          {item.external_url ? (
            <a
              href={item.external_url}
              target="_blank"
              rel="noreferrer"
              className="t-caption link-u text-accent"
            >
              جزئیات
            </a>
          ) : null}
        </div>
      </div>
    </Reveal>
  );
}

export default function Exhibitions() {
  const { site } = useBootstrap();
  const { data, loading, error } = useApi<Paginated<Exhibition>>(
    "/exhibitions/",
    { page_size: 60 },
  );

  useEffect(() => {
    applySeo({
      title: `نمایشگاه‌ها — ${site?.site_name || ""}`,
      description:
        "حضورهای انفرادی و گروهی، آرت‌فرها و اقامت‌های هنری.",
    });
  }, [site]);

  const items = data?.results || [];
  // The poster slot goes to what is happening now; otherwise the newest entry.
  const lead =
    items.find((item) => item.state === "current") ||
    items.find((item) => item.state === "upcoming") ||
    items[0];

  return (
    <>
      <PageHero
        eyebrow="رویدادها"
        title="نمایشگاه‌ها"
        lead="فهرست حضورهای انفرادی و گروهی؛ از نمایشگاه‌های گالری تا آرت‌فرهای بین‌المللی و دوره‌های اقامت هنری."
        tone="ink"
        pattern="pat-rules"
        aside={
          data ? (
            <HeroCount
              value={toPersianDigits(data.count)}
              label="حضور ثبت‌شده"
            />
          ) : null
        }
      />

      {loading ? (
        <div className="container-x section-y">
          <GridSkeleton count={3} />
        </div>
      ) : null}

      {!loading && !items.length ? (
        <div className="container-x section-y">
          <EmptyState
            title={error ? "فهرست نمایشگاه‌ها بارگذاری نشد" : "نمایشگاهی ثبت نشده است"}
            body={
              error ||
              "از پنل مدیریت می‌توانید نمایشگاه، تاریخ، محل و پوستر را اضافه کنید."
            }
          />
        </div>
      ) : null}

      {lead ? (
        <section className="pat pat-wash">
          <div className="container-x section-y">
            <Poster item={lead} priority />
          </div>
        </section>
      ) : null}

      {GROUPS.map((group, groupIndex) => {
        const groupItems = items.filter(
          (item) => item.state === group.state && item.id !== lead?.id,
        );
        if (!groupItems.length) return null;
        const dark = group.state === "upcoming";
        return (
          <section
            key={group.state}
            className={`pat ${group.pattern} ${
              dark ? "band-dark" : groupIndex % 2 === 0 ? "band-soft" : ""
            }`}
          >
            <div className="container-x section-y">
              <Reveal>
                <p className="eyebrow">{group.label}</p>
                <span className="rule-accent mt-5" />
              </Reveal>

              {group.state === "past" ? (
                <ul className="mt-10 border-t border-line">
                  {groupItems.map((item, i) => (
                    <ScheduleRow key={item.id} item={item} index={i} />
                  ))}
                </ul>
              ) : (
                <div className="mt-12 space-y-[clamp(3rem,6vw,5rem)]">
                  {groupItems.map((item) => (
                    <Poster key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}
