import { Link } from "react-router-dom"
import { useBootstrap } from "@/store/bootstrap"
import { resolveBranding } from "@/lib/branding"
import { SeasonMark } from "./SeasonMark"
import { Reveal } from "@/motion/Reveal"
import { toPersianDigits } from "@/lib/format"

/**
 * FOOTER
 *
 * An editorial colophon: brand block, an indexed nav column, and studio
 * contact details. All content is data-driven (Site Settings + navigation +
 * social links), so it stays correct when the brand changes.
 */
export function Footer() {
	const { site, artist, nav, data } = useBootstrap()
	const brand = resolveBranding(site, artist?.name)
	const items = nav?.footer?.length ? nav.footer : nav?.header || []
	const socials = data?.socials || []
	const year = new Date().getFullYear()

	return (
		<footer className="hairline mt-[var(--section-space)]">
			<Reveal className="container-x section-y-sm">
				<div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr]">
					{/* Brand */}
					<div>
						{brand.logoMarkUrl ? (
							<img
								src={brand.logoMarkUrl}
								alt={brand.siteName}
								className="h-8 w-auto object-contain"
							/>
						) : (
							<p className="font-display text-2xl">{brand.artistName}</p>
						)}
						{brand.tagline ? (
							<p className="t-small mt-4 max-w-xs text-muted">
								{brand.tagline}
							</p>
						) : null}
						{/* The season the site is currently dressed for. */}
						<SeasonMark className="mt-6" />
					</div>

					{/* Indexed navigation */}
					<nav aria-label="منوی پایین صفحه">
						<p className="eyebrow">فهرست</p>
						<ul className="mt-5 space-y-3">
							{items.map((item, i) => (
								<li key={item.id} className="flex items-baseline gap-3">
									<span className="t-index">
										{toPersianDigits(String(i + 1).padStart(2, "0"))}
									</span>
									<Link to={item.url} className="t-nav">
										<span className="link-u">{item.label}</span>
									</Link>
								</li>
							))}
						</ul>
					</nav>

					{/* Studio */}
					<div>
						<p className="eyebrow">استودیو</p>
						<ul className="t-small mt-5 space-y-3 text-muted">
							{site?.email ? (
								<li>
									<a href={`mailto:${site.email}`} dir="ltr">
										<span className="link-u">{site.email}</span>
									</a>
								</li>
							) : null}
							{site?.phone ? (
								<li>
									<a href={`tel:${site.phone}`} dir="ltr">
										<span className="link-u">
											{toPersianDigits(site.phone)}
										</span>
									</a>
								</li>
							) : null}
							{site?.address ? <li>{site.address}</li> : null}
						</ul>

						{socials.length ? (
							<ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
								{socials.map((social) => (
									<li key={social.id}>
										<a
											href={social.url}
											target="_blank"
											rel="noreferrer"
											className="t-caption"
										>
											<span className="link-u">{social.label}</span>
										</a>
									</li>
								))}
							</ul>
						) : null}
					</div>
				</div>

				<div className="hairline mt-14 flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
					<p className="t-caption">
						© {toPersianDigits(year)} — {brand.siteName}. تمامی حقوق محفوظ
						است.
					</p>
					<p className="t-caption">
						{brand.artistName}
						{artist?.role ? ` · ${artist.role}` : ""}
					</p>
				</div>
			</Reveal>
		</footer>
	)
}
