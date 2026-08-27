import { ArtworkCard } from "./ArtworkCard"
import { Reveal, type RevealVariant } from "@/motion/Reveal"
import { EmptyState } from "./Feedback"
import { useBootstrap } from "@/store/bootstrap"
import { cx } from "@/lib/format"
import type { Artwork } from "@/lib/types"

const DIGITS = "۰۱۲۳۴۵۶۷۸۹"
const catalogueNumber = (i: number) =>
	String(i + 1)
		.padStart(2, "0")
		.replace(/\d/g, (d) => DIGITS[Number(d)])

/**
 * GALLERY GRID
 *
 * Six real compositions (editorial, asymmetric, masonry, fullscreen, minimal,
 * large cards) defined in CSS — not one Bootstrap-style grid with a different
 * gap. Aspect ratios and reveal variants alternate on a cycle so a long scroll
 * keeps a rhythm instead of repeating the same rectangle.
 *
 * The layout is chosen by the design/admin configuration, never by the visitor.
 */

/** Rotating ratios: portrait, landscape, square, tall. */
function ratioFor(i: number) {
	const cycle = [4 / 5, 3 / 2, 1, 5 / 6]
	return cycle[i % cycle.length]
}

function variantFor(i: number, fullscreen: boolean): RevealVariant {
	if (fullscreen) return "imageReveal"
	return i % 3 === 2 ? "imageReveal" : "fadeUp"
}

export function GalleryGrid({
	artworks,
	layout,
	className,
	numbered = true,
}: {
	artworks: Artwork[]
	layout?: string | null
	className?: string
	numbered?: boolean
}) {
	const { site, theme } = useBootstrap()
	const resolved =
		layout ||
		theme?.galleryLayout ||
		site?.default_gallery_layout ||
		"editorial"
	const fullscreen = resolved === "fullscreen"

	if (!artworks?.length) {
		return (
			<EmptyState
				title="هنوز اثری منتشر نشده است"
				body="به‌محض انتشار آثار جدید، همین‌جا نمایش داده می‌شوند."
			/>
		)
	}

	return (
		<div className={cx("gal", `gal-${resolved}`, className)}>
			{artworks.map((artwork, i) => (
				<Reveal
					key={artwork.id ?? artwork.slug}
					variant={variantFor(i, fullscreen)}
					index={i % 3}
				>
					<ArtworkCard
						artwork={artwork}
						priority={i < 2}
						span={resolved === "editorial" ? null : artwork.layout_span}
						ratio={fullscreen ? 16 / 10 : ratioFor(i)}
						indexLabel={numbered ? catalogueNumber(i) : undefined}
					/>
				</Reveal>
			))}
		</div>
	)
}
