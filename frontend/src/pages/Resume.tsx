import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useBootstrap } from "@/store/bootstrap";
import { EmptyState, PageSkeleton } from "@/components/Feedback";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/motion/Reveal";
import { applySeo } from "@/lib/seo";
import { toPersianDigits } from "@/lib/format";

type CVEntry = {
  id: number;
  section: string;
  section_label: string;
  year: string;
  title: string;
  place: string;
  description: string;
  url: string;
};

const PATTERNS = ["pat-dots", "pat-hatch", "pat-rules", "pat-wash"];

export default function Resume() {
  const { site, artist } = useBootstrap();
  const { data, loading } = useApi<CVEntry[] | Record<string, CVEntry[]>>(
    "/cv-entries/",
  );

  useEffect(() => {
    applySeo({
      title: `رزومه‌ی هنری — ${site?.site_name || ""}`,
      description:
        "تحصیلات، نمایشگاه‌ها، جوایز و انتشارات به ترتیب زمانی.",
    });
  }, [site]);

  // The endpoint may return a grouped object or a flat list; normalise both.
  const grouped: Record<string, CVEntry[]> = Array.isArray(data)
    ? data.reduce<Record<string, CVEntry[]>>((acc, entry) => {
        const key = entry.section_label || entry.section;
        acc[key] = [...(acc[key] || []), entry];
        return acc;
      }, {})
    : (data as Record<string, CVEntry[]>) || {};

  const groups = Object.entries(grouped).filter(([, rows]) => rows?.length);
  const total = groups.reduce((sum, [, rows]) => sum + rows.length, 0);

  return (
    <>
      <PageHero
        eyebrow="CV"
        title="رزومه‌ی هنری"
        lead="خلاصه‌ی مستند مسیر حرفه‌ای: تحصیلات، حضور در نمایشگاه‌ها، جوایز و انتشارات."
        tone="warm"
        pattern="pat-rules"
        aside={
          artist?.cv_file ? (
            <a href={artist.cv_file} className="btn btn-accent" download>
              دانلود نسخه‌ی PDF
            </a>
          ) : total ? (
            <div>
              <p className="numeral" aria-hidden="true">
                {toPersianDigits(total)}
              </p>
              <p className="t-caption mt-2 text-muted">ردیف ثبت‌شده</p>
            </div>
          ) : null
        }
      />

      {loading ? (
        <div className="container-x section-y">
          <PageSkeleton />
        </div>
      ) : groups.length ? (
        groups.map(([label, rows], groupIndex) => (
          <section
            key={label}
            className={`pat ${PATTERNS[groupIndex % PATTERNS.length]} ${
              groupIndex % 2 === 1 ? "band-soft" : ""
            }`}
          >
            <div className="container-x section-y-sm">
              <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
                <Reveal>
                  <div className="lg:sticky lg:top-[calc(var(--header-h)+32px)]">
                    <span className="numeral" aria-hidden="true">
                      {toPersianDigits(
                        String(groupIndex + 1).padStart(2, "0"),
                      )}
                    </span>
                    <h2 className="t-h3 mt-3">{label}</h2>
                    <span className="rule-accent mt-4" />
                    <p className="t-caption mt-4 text-muted">
                      {toPersianDigits(rows.length)} ردیف
                    </p>
                  </div>
                </Reveal>

                <ul className="border-t border-line">
                  {rows.map((row, i) => (
                    <Reveal as="li" key={row.id} index={i}>
                      <div className="list-row">
                        <span className="row-year">
                          {toPersianDigits(row.year)}
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
                                {row.title}
                              </a>
                            ) : (
                              row.title
                            )}
                          </p>
                          {row.place ? (
                            <p className="t-caption mt-1 text-muted">
                              {row.place}
                            </p>
                          ) : null}
                          {row.description ? (
                            <p className="t-small mt-3 leading-loose text-muted">
                              {row.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))
      ) : (
        <div className="container-x section-y">
          <EmptyState
            title="رزومه هنوز تکمیل نشده است"
            body="از پنل مدیریت می‌توانید ردیف‌های تحصیلات، نمایشگاه‌ها و جوایز را اضافه کنید."
          />
        </div>
      )}

      <section className="band-dark pat pat-wash">
        <div className="container-x section-y-sm text-center">
          <Reveal>
            <p className="eyebrow">همکاری</p>
            <h2 className="t-h2 mt-4">برای نمایشگاه، سفارش یا گفت‌وگو</h2>
            <Link to="/contact" className="btn btn-primary mt-8">
              تماس با استودیو
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
