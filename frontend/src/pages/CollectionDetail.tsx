import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useBootstrap } from "@/store/bootstrap";
import { GalleryGrid } from "@/components/GalleryGrid";
import { SmartImage } from "@/components/SmartImage";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/Feedback";
import { Reveal } from "@/motion/Reveal";
import { applySeo } from "@/lib/seo";
import { toPersianDigits } from "@/lib/format";
import type { Collection } from "@/lib/types";

export default function CollectionDetail() {
  const { slug } = useParams();
  const { site } = useBootstrap();
  const {
    data: collection,
    loading,
    error,
  } = useApi<Collection>(slug ? `/collections/${slug}/` : null);

  useEffect(() => {
    if (!collection) return;
    applySeo({
      title:
        collection.seo_title ||
        `${collection.title} — ${site?.site_name || ""}`,
      description: collection.seo_description || collection.description,
      image: collection.cover?.url || null,
    });
  }, [collection, site?.site_name]);

  if (loading) return <PageSkeleton />;
  if (error || !collection) {
    return (
      <div className="container-x section-y pt-[calc(var(--header-h)+72px)]">
        <ErrorState title="این مجموعه پیدا نشد" body={error || undefined} />
      </div>
    );
  }

  const paragraphs = (collection.description || "")
    .split(/\n{2,}/)
    .filter(Boolean);

  return (
    <>
      {/* Full-bleed cover with a scrim, then the title over the paper band. */}
      <header className="relative">
        <div className="media media-scrim pt-[var(--header-h)]">
          <SmartImage
            asset={collection.cover}
            alt={collection.title}
            ratio={21 / 9}
            priority
            sizes="100vw"
          />
        </div>
      </header>

      <section className="pat pat-wash">
        <div className="container-x section-y">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <div>
              <Reveal>
                <p className="eyebrow">
                  مجموعه
                  {collection.year
                    ? ` · ${toPersianDigits(collection.year)}`
                    : ""}
                </p>
                <h1 className="t-h1 mt-4">{collection.title}</h1>
                <span className="rule-accent mt-6" />
              </Reveal>
              {collection.subtitle ? (
                <Reveal index={1}>
                  <p className="t-body-lg mt-6 text-muted">
                    {collection.subtitle}
                  </p>
                </Reveal>
              ) : null}
              <Reveal index={2}>
                <div className="mt-7 flex flex-wrap gap-2">
                  <span className="chip">
                    {toPersianDigits(collection.artwork_count)} اثر
                  </span>
                  {collection.year ? (
                    <span className="chip">
                      {toPersianDigits(collection.year)}
                    </span>
                  ) : null}
                </div>
              </Reveal>
            </div>

            <div>
              {paragraphs.length ? (
                <Reveal index={1}>
                  <div className="space-y-5 leading-loose text-muted">
                    {paragraphs.map((para, i) => (
                      <p key={i} className="t-body">
                        {para}
                      </p>
                    ))}
                  </div>
                </Reveal>
              ) : null}
              {collection.statement ? (
                <Reveal index={2}>
                  <blockquote className="pull-quote quote-mark mt-8">
                    <p className="eyebrow">بیانیه‌ی مجموعه</p>
                    <p className="t-body mt-4 leading-loose">
                      {collection.statement}
                    </p>
                  </blockquote>
                </Reveal>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="pat pat-dots band-soft">
        <div className="container-x section-y">
          <Reveal>
            <p className="eyebrow">آثار این مجموعه</p>
            <span className="rule-accent mt-4" />
          </Reveal>
          <div className="mt-12">
            {collection.artworks?.length ? (
              <GalleryGrid artworks={collection.artworks} />
            ) : (
              <EmptyState title="هنوز اثری در این مجموعه منتشر نشده است" />
            )}
          </div>
        </div>
      </section>

      <section className="band-dark pat pat-rules">
        <div className="container-x section-y-sm text-center">
          <Reveal>
            <p className="eyebrow">مجموعه‌های دیگر</p>
            <h2 className="t-h2 mt-4">ادامه‌ی مرور آرشیو</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/collections" className="btn btn-primary">
                همه‌ی مجموعه‌ها
              </Link>
              <Link to="/artworks" className="btn btn-ghost">
                آرشیو آثار
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
