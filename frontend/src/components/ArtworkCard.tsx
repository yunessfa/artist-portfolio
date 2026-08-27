import { Link } from "react-router-dom"
import { SmartImage } from "./SmartImage"
import { useBootstrap } from "@/store/bootstrap"
import { cx, formatPrice, toPersianDigits } from "@/lib/format"
import type { Artwork } from "@/lib/types"

/**
 * ARTWORK CARD
 *
 * Modelled on a museum catalogue entry rather than a web "card": no box, no
 * shadow, no rounded frame. The image sits on paper, and beneath it a hairline
 * carries the index, title, year and the technique · dimensions line. Hover is
 * a single slow 2.5% image scale plus the title underline — nothing else moves.
 */

const SPAN_CLASS: Record<string, string> = {
	normal: "",
	wide: "lg:col-span-2",
	tall: "lg:row-span-2",
	large: "lg:col-span-2 lg:row-span-2",
}

export function ArtworkCard({
	artwork,
	className,
	priority,
	span,
	ratio,
	indexLabel,
}: {
	artwork: Artwork
	className?: string
	priority?: boolean
	span?: string | null
	ratio?: number
	/** Catalogue number, e.g. "۰۳". */
	indexLabel?: string
}) {
	const { site } = useBootstrap()
	const showPrice = site?.show_prices && artwork.show_price && artwork.price
	const meta = [artwork.technique, artwork.dimensions].filter(Boolean)

	return (
		<article
			className={cx(
				"group",
				span ? SPAN_CLASS[span] || "" : "",
				className,
			)}
		>
			<Link to={`/artworks/${artwork.slug}`} className="block">
				<div className="media media-hover card-lift media-scrim">
					<SmartImage
						asset={artwork.cover}
						alt={artwork.cover?.alt_text || artwork.title}
						ratio={ratio || 4 / 5}
						priority={priority}
						sizes="(max-width: 720px) 100vw, (max-width: 1024px) 50vw, 33vw"
					/>
				</div>

				<div className="hairline mt-5 pt-4">
					<div className="flex items-baseline gap-3">
						{indexLabel ? (
							<span className="t-index shrink-0">{indexLabel}</span>
						) : null}
						<h3 className="t-h3">
							<span className="link-u">{artwork.title}</span>
						</h3>
						{artwork.year ? (
							<span className="t-caption ms-auto shrink-0">
								{toPersianDigits(artwork.year)}
							</span>
						) : null}
					</div>

					{meta.length ? (
						<p className="t-caption mt-2">
							{meta.map((part, i) => (
								<span key={i}>
									{i > 0 ? " · " : ""}
									{toPersianDigits(String(part))}
								</span>
							))}
						</p>
					) : null}

					{showPrice ? (
						<p className="t-caption mt-2 text-ink2">
							{formatPrice(artwork.price)}
						</p>
					) : null}
				</div>
			</Link>
		</article>
	)
}
