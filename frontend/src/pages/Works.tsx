import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useBootstrap } from "@/store/bootstrap";
import { GalleryGrid } from "@/components/GalleryGrid";
import { HeroCount, PageHero } from "@/components/PageHero";
import { EmptyState, GridSkeleton } from "@/components/Feedback";
import { Reveal } from "@/motion/Reveal";
import { applySeo } from "@/lib/seo";
import { toPersianDigits } from "@/lib/format";
import type { Artwork, GalleryLayout, Paginated } from "@/lib/types";

const LAYOUTS: Array<{ key: GalleryLayout; label: string }> = [
  { key: "editorial", label: "مجله‌ای" },
  { key: "masonry", label: "آجری" },
  { key: "minimal", label: "مینیمال" },
  { key: "large_cards", label: "کارت بزرگ" },
  { key: "asymmetric", label: "نامتقارن" },
  { key: "fullscreen", label: "تمام‌صفحه" },
];

export default function Works() {
  const { data: boot, site, theme } = useBootstrap();
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const search = params.get("q") || "";
  const page = Number(params.get("page") || 1);
  const pageSize = site?.artworks_per_page || 12;
  const [layout, setLayout] = useState<GalleryLayout | "">("");

  const query = useMemo(
    () => ({
      category: category || undefined,
      search: search || undefined,
      page,
      page_size: pageSize,
    }),
    [category, page, pageSize, search],
  );
  const { data, loading } = useApi<Paginated<Artwork>>("/artworks/", query);

  useEffect(() => {
    applySeo({
      title: `نمونه‌کارها — ${site?.site_name || ""}`,
      description: site?.default_seo_description || site?.description,
    });
  }, [site]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const results = data?.results || [];
  const totalPages = data ? Math.max(1, Math.ceil(data.count / pageSize)) : 1;
  const activeCategory = (boot?.categories || []).find(
    (item) => item.key === category,
  );

  return (
    <>
      <PageHero
        eyebrow="آرشیو آثار"
        title="نمونه‌کارها"
        lead={
          site?.default_seo_description ||
          site?.description ||
          "مجموعه‌ی کامل نقاشی‌ها، مجسمه‌ها و کارهای سرامیک؛ با امکان مرور بر اساس رسانه و جست‌وجوی عنوان."
        }
        tone="soft"
        pattern="pat-dots"
        aside={
          data ? (
            <HeroCount
              value={toPersianDigits(data.count)}
              label={activeCategory ? `اثر در ${activeCategory.label}` : "اثر منتشرشده"}
            />
          ) : null
        }
      />

      <div className="container-x section-y">
        {/* Filter bar: media chips on one side, search and layout on the other */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line pb-6">
          <button
            type="button"
            className="chip chip-btn"
            aria-pressed={!category}
            onClick={() => update("category", "")}
          >
            همه
          </button>
          {(boot?.categories || []).map((item) => (
            <button
              key={item.key}
              type="button"
              className="chip chip-btn"
              aria-pressed={category === item.key}
              onClick={() => update("category", item.key)}
            >
              {item.label}
            </button>
          ))}

          <div className="ms-auto flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="q">
              جستجو
            </label>
            <input
              id="q"
              className="field w-40 sm:w-52"
              placeholder="جستجوی عنوان…"
              defaultValue={search}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  update("q", (event.target as HTMLInputElement).value);
                }
              }}
            />
            <select
              className="field w-36"
              value={layout || theme?.galleryLayout || "editorial"}
              onChange={(event) =>
                setLayout(event.target.value as GalleryLayout)
              }
              aria-label="چیدمان گالری"
            >
              {LAYOUTS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {search ? (
          <p className="t-small mt-6 text-muted">
            نتایج جست‌وجو برای «{search}» —{" "}
            <button
              type="button"
              className="link-u text-accent"
              onClick={() => update("q", "")}
            >
              حذف جست‌وجو
            </button>
          </p>
        ) : null}

        <div className="mt-14">
          {loading && !results.length ? (
            <GridSkeleton count={6} />
          ) : results.length ? (
            <GalleryGrid
              artworks={results}
              layout={(layout || undefined) as never}
            />
          ) : (
            <EmptyState
              title="اثری پیدا نشد"
              body="فیلترها یا عبارت جستجو را تغییر دهید."
            />
          )}
        </div>

        {totalPages > 1 ? (
          <nav
            className="mt-[clamp(3rem,6vw,5rem)] flex flex-wrap items-center justify-center gap-2"
            aria-label="صفحه‌بندی"
          >
            <button
              type="button"
              className="pager-btn"
              disabled={page <= 1}
              onClick={() => update("page", String(page - 1))}
            >
              قبلی
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (number) => (
                <button
                  key={number}
                  type="button"
                  className="pager-btn"
                  aria-current={number === page ? "page" : undefined}
                  onClick={() => update("page", String(number))}
                >
                  {toPersianDigits(number)}
                </button>
              ),
            )}
            <button
              type="button"
              className="pager-btn"
              disabled={page >= totalPages}
              onClick={() => update("page", String(page + 1))}
            >
              بعدی
            </button>
          </nav>
        ) : null}
      </div>

      {/* Closing band so the archive does not end on an empty white edge. */}
      <section className="band-dark pat pat-rules">
        <div className="container-x section-y-sm text-center">
          <Reveal>
            <p className="eyebrow">مجموعه‌ها</p>
            <h2 className="t-h2 mt-4">آثار در قالب مجموعه‌ها</h2>
            <p className="t-small mx-auto mt-4 max-w-xl">
              هر مجموعه یک دوره‌ی کاری است؛ با بیانیه، سال و آثار مربوط به خودش.
            </p>
            <Link to="/collections" className="btn btn-ghost mt-8">
              دیدن مجموعه‌ها
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
