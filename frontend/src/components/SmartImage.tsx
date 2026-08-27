import { useState } from "react";
import type { MediaAsset } from "@/lib/types";
import { cx } from "@/lib/format";

type Props = {
  asset: MediaAsset | null | undefined;
  alt?: string;
  className?: string;
  sizes?: string;
  /** Hero images must not be lazy: they are the LCP element. */
  priority?: boolean;
  ratio?: number | null;
  objectFit?: "cover" | "contain";
};

/**
 * Renders the AVIF/WebP variant set produced by the backend, with an LQIP
 * background and a fixed aspect ratio box so there is no layout shift
 * (requirement #25).
 */
export function SmartImage({
  asset,
  alt,
  className,
  sizes = "(max-width: 720px) 100vw, (max-width: 1200px) 50vw, 33vw",
  priority = false,
  ratio,
  objectFit = "cover",
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const aspect = ratio ?? asset?.aspect_ratio ?? 4 / 5;

  if (!asset) {
    return (
      <div
        className={cx("bg-surface2", className)}
        style={{ aspectRatio: String(aspect) }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={cx("relative overflow-hidden", className)}
      style={{
        aspectRatio: String(aspect),
        backgroundColor: asset.dominant_color || "var(--surface-2)",
        backgroundImage: asset.placeholder
          ? `url(${asset.placeholder})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <picture>
        {asset.sources?.map((source) => (
          <source
            key={source.type}
            type={source.type}
            srcSet={source.srcset}
            sizes={sizes}
          />
        ))}
        <img
          src={asset.url}
          srcSet={asset.srcset || undefined}
          sizes={sizes}
          alt={alt ?? asset.alt_text ?? ""}
          width={asset.width ?? undefined}
          height={asset.height ?? undefined}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          className="h-full w-full"
          style={{
            objectFit,
            opacity: loaded ? 1 : 0,
            transition: "opacity .8s var(--ease)",
          }}
        />
      </picture>
    </div>
  );
}
