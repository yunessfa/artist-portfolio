import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useBootstrap } from "@/store/bootstrap";
import { SmartImage } from "@/components/SmartImage";
import { Lightbox } from "@/components/Lightbox";
import { ArtworkCard } from "@/components/ArtworkCard";
import { ErrorState, PageSkeleton } from "@/components/Feedback";
import { Reveal } from "@/motion/Reveal";
import { useParallax } from "@/motion/useParallax";
import { applySeo, visualArtworkJsonLd } from "@/lib/seo";
import { formatPrice, toPersianDigits } from "@/lib/format";
import type { Artwork } from "@/lib/types";

export default function ArtworkDetail() {
  const { slug } = useParams();
  const { artist, site } = useBootstrap();
  const {
    data: artwork,
    loading,
    error,
  } = useApi<Artwork>(slug ? `/artworks/${slug}/` : null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const heroRef = useParallax<HTMLDivElement>(60);

  useEffect(() => {
    if (!artwork) return;
    applySeo({
      title: artwork.seo_title || `${artwork.title} — ${site?.site_name || ""}`,
      description: artwork.seo_description || artwork.excerpt,
      image: artwork.cover?.url || null,
      type: "article",
      noindex: artwork.noindex,
      jsonLd: visualArtworkJsonLd({
        name: artwork.title,
        description: artwork.excerpt || artwork.description,
        image: artwork.cover?.url || null,
        artist: artist?.name,
        dateCreated: artwork.year,
        medium: artwork.technique,
        material: artwork.material,
        width: artwork.dimensions,
      }),
    });
  }, [artist?.name, artwork, site?.site_name]);

  if (loading) return <PageSkeleton />;
  if (error || !artwork) {
    return <ErrorState title="این اثر پیدا نشد" body={error || undefined} />;
  }

  const images = [
    ...(artwork.cover
      ? [{ asset: artwork.cover, caption: artwork.title }]
      : []),
    ...(artwork.images || []).map((image) => ({
      asset: image.image,
      caption: image.caption,
    })),
  ];

  const details: Array<[string, string]> = [
    ["سال خلق", toPersianDigits(artwork.year)],
    ["تکنیک", artwork.technique],
    ["متریال", artwork.material],
    ["ابعاد", toPersianDigits(artwork.dimensions)],
    ["دسته‌بندی", artwork.category?.label || ""],
    ["وضعیت اثر", artwork.availability_label],
  ];

  const sculpture = artwork.sculpture_detail;
  if (sculpture) {
    details.push(
      ["ابعاد مجسمه", toPersianDigits(sculpture.dimensions_display || "")],
      [
        "وزن",
        sculpture.weight_kg
          ? `${toPersianDigits(sculpture.weight_kg)} کیلوگرم`
          : "",
      ],
      ["ادیشن", sculpture.edition || ""],
      ["پاتینا", sculpture.patina || ""],
      ["محل نگهداری", sculpture.location || ""],
    );
  }

  const showPrice = site?.show_prices && artwork.show_price && artwork.price;

  return (
    <article className="pb-[var(--section-space)]">
      <div className="relative overflow-hidden pt-[var(--header-h)]">
        <div ref={heroRef}>
          <button
            type="button"
            className="block w-full"
            onClick={() => artwork.allow_zoom && setLightbox(0)}
            style={{ cursor: artwork.allow_zoom ? "zoom-in" : "default" }}
            aria-label="نمایش بزرگ تصویر"
          >
            <SmartImage
              asset={artwork.cover}
              alt={artwork.cover?.alt_text || artwork.title}
              priority
              ratio={16 / 10}
              sizes="100vw"
            />
          </button>
        </div>
      </div>

      <div className="container-x mt-16 grid gap-16 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <Reveal>
            <p className="eyebrow">
              {artwork.collection?.title || artwork.category?.label}
            </p>
            <h1 className="t-h1 mt-4">{artwork.title}</h1>
            {artwork.title_en ? (
              <p className="mt-2 text-sm text-muted" dir="ltr">
                {artwork.title_en}
              </p>
            ) : null}
          </Reveal>

          {artwork.description ? (
            <Reveal index={1}>
              <div className="mt-10 space-y-4 leading-loose text-muted">
                {artwork.description.split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </Reveal>
          ) : null}

          {artwork.concept ? (
            <Reveal index={2}>
              <div className="card mt-10 p-7">
                <p className="eyebrow">روایت اثر</p>
                <p className="mt-4 leading-loose">{artwork.concept}</p>
              </div>
            </Reveal>
          ) : null}

          {artwork.artist_note ? (
            <Reveal index={3}>
              <p className="mt-8 leading-loose text-muted">
                {artwork.artist_note}
              </p>
            </Reveal>
          ) : null}

          {images.length > 1 ? (
            <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
              {images.slice(1).map((image, i) => (
                <Reveal key={i} index={i}>
                  <button
                    type="button"
                    className="media media-hover w-full"
                    style={{ cursor: "zoom-in" }}
                    onClick={() => setLightbox(i + 1)}
                    aria-label={`نمایش جزئیات ${i + 1}`}
                  >
                    <SmartImage asset={image.asset} ratio={1} />
                  </button>
                </Reveal>
              ))}
            </div>
          ) : null}
        </div>

        <aside>
          <Reveal variant="slideReveal">
            <dl className="card divide-y divide-line p-2">
              {details
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-4 px-4 py-3 text-sm"
                  >
                    <dt className="text-muted">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              {showPrice ? (
                <div className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-muted">قیمت</dt>
                  <dd style={{ color: "var(--accent)" }}>
                    {formatPrice(artwork.price, artwork.price_currency)}
                  </dd>
                </div>
              ) : null}
            </dl>
            <Link
              to="/contact"
              className="btn btn-primary mt-6 w-full justify-center"
            >
              پرسش درباره‌ی این اثر
            </Link>
          </Reveal>
        </aside>
      </div>

      {artwork.related_artworks?.length ? (
        <section className="container-x mt-[var(--section-space)]">
          <h2 className="text-2xl">آثار مرتبط</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {artwork.related_artworks.map((item, i) => (
              <Reveal key={item.id} index={i}>
                <ArtworkCard artwork={item} span={false} />
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      <nav className="container-x mt-20 flex justify-between gap-6 border-t border-line pt-8 text-sm">
        {artwork.prev ? (
          <Link
            to={`/artworks/${artwork.prev.slug}`}
            className="text-muted hover:text-ink"
          >
            › {artwork.prev.title}
          </Link>
        ) : (
          <span />
        )}
        {artwork.next ? (
          <Link
            to={`/artworks/${artwork.next.slug}`}
            className="text-muted hover:text-ink"
          >
            {artwork.next.title} ‹
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <Lightbox
        items={images}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
        allowZoom={artwork.allow_zoom}
      />
    </article>
  );
}
