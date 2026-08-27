import type { MediaAsset } from "./types"

/**
 * BRANDING — one place, one source of truth.
 *
 * Nothing about the brand is hardcoded in components: names, logo, favicon,
 * titles and social image all come from the Site Settings record and flow
 * through this module. This is also the only code that touches <head>.
 */

export type BrandingSource = {
	site_name?: string | null
	site_name_en?: string | null
	tagline?: string | null
	description?: string | null
	logo?: MediaAsset | string | null
	logo_detail?: MediaAsset | string | null
	logo_mark?: MediaAsset | string | null
	logo_mark_detail?: MediaAsset | string | null
	favicon?: MediaAsset | string | null
	favicon_detail?: MediaAsset | string | null
	og_image?: MediaAsset | string | null
	default_og_image_detail?: MediaAsset | string | null
	meta_title?: string | null
	default_seo_title?: string | null
	meta_description?: string | null
	default_seo_description?: string | null
}

export type Branding = {
	siteName: string
	artistName: string
	tagline: string
	description: string
	logoUrl: string | null
	logoMarkUrl: string | null
	faviconUrl: string | null
	ogImageUrl: string | null
	metaTitle: string
	metaDescription: string
}

/** Accepts a MediaAsset object or a bare URL string. */
export function assetUrl(value: unknown): string | null {
	if (!value) return null
	if (typeof value === "string") return value || null
	const asset = value as MediaAsset & { file?: string; image?: string }
	return asset.url || asset.file || asset.image || null
}

const first = (...values: Array<unknown>): string | null => {
	for (const value of values) {
		const url = assetUrl(value)
		if (url) return url
	}
	return null
}

export function resolveBranding(
	site: BrandingSource | null | undefined,
	artistName?: string | null,
): Branding {
	const siteName = site?.site_name?.trim() || "پورتفولیوی هنرمند"
	// The admin "artist display name" always wins: it is the field the Branding
	// screen edits, so a change there must be visible on the site immediately.
	const name =
		site?.artist_display_name?.trim() || artistName?.trim() || siteName
	const tagline = site?.tagline?.trim() || ""
	const description = site?.description?.trim() || tagline
	return {
		siteName,
		artistName: name,
		tagline,
		description,
		logoUrl: first(site?.logo_detail, site?.logo),
		logoMarkUrl: first(site?.logo_mark_detail, site?.logo_mark),
		faviconUrl: first(site?.favicon_detail, site?.favicon),
		ogImageUrl: first(site?.default_og_image_detail, site?.og_image),
		metaTitle:
			site?.meta_title?.trim() || site?.default_seo_title?.trim() || siteName,
		metaDescription:
			site?.meta_description?.trim() ||
			site?.default_seo_description?.trim() ||
			description,
	}
}

function setMeta(selector: string, value: string) {
	const el = document.querySelector(selector)
	if (el) el.setAttribute("content", value)
}

/**
 * Pushes branding into <head>. Called on bootstrap and again after an admin
 * save, so the tab title and favicon update without a reload.
 */
export function applyBranding(brand: Branding): void {
	if (typeof document === "undefined") return

	document.title = brand.metaTitle
	setMeta('meta[name="description"]', brand.metaDescription)
	setMeta('meta[property="og:title"]', brand.metaTitle)
	setMeta('meta[property="og:description"]', brand.metaDescription)
	setMeta('meta[property="og:site_name"]', brand.siteName)
	setMeta('meta[name="twitter:title"]', brand.metaTitle)
	setMeta('meta[name="twitter:description"]', brand.metaDescription)
	if (brand.ogImageUrl) {
		setMeta('meta[property="og:image"]', brand.ogImageUrl)
		setMeta('meta[name="twitter:image"]', brand.ogImageUrl)
	}
	if (brand.faviconUrl) {
		let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
		if (!link) {
			link = document.createElement("link")
			link.rel = "icon"
			document.head.appendChild(link)
		}
		link.href = brand.faviconUrl
	}
}

/** `pageTitle("آثار", brand)` → "آثار — <site name>" */
export function pageTitle(part: string | null | undefined, brand: Branding) {
	const clean = part?.trim()
	return clean ? `${clean} — ${brand.siteName}` : brand.metaTitle
}
