import { useEffect, useRef, useState } from "react"
import { Link, NavLink } from "react-router-dom"
import { useBootstrap } from "@/store/bootstrap"
import { MobileMenu } from "./MobileMenu"
import { resolveBranding } from "@/lib/branding"
import { cx } from "@/lib/format"

/**
 * HEADER
 *
 * A hairline bar, not a card: transparent over the hero, then a blurred paper
 * surface with a single bottom rule once the page scrolls. Branding (logo or
 * wordmark) comes from Site Settings — nothing here is hardcoded, and there is
 * no theme, font or palette switcher for visitors.
 */
export function Header() {
	const { site, artist, nav } = useBootstrap()
	const [scrolled, setScrolled] = useState(false)
	const [menuOpen, setMenuOpen] = useState(false)
	const headerRef = useRef<HTMLElement | null>(null)
	const brand = resolveBranding(site, artist?.name)
	const items = nav?.header || []
	// The avatar prefers the uploaded logo mark, then the logo, then the artist
	// portrait, so the header is never an empty square.
	const avatarUrl =
		brand.logoMarkUrl || brand.logoUrl || artist?.portrait?.url || ""
	const initials = brand.artistName.trim().charAt(0) || "ا"

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 24)
		onScroll()
		window.addEventListener("scroll", onScroll, { passive: true })
		return () => window.removeEventListener("scroll", onScroll)
	}, [])

	return (
		<>
			<header
				ref={headerRef}
				className={cx(
					"fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-base",
					scrolled
						? "border-b border-line bg-bg/85 backdrop-blur-[10px]"
						: "border-b border-transparent bg-transparent",
				)}
			>
				<div className="container-x flex h-[var(--header-h)] items-center justify-between gap-6">
					{/* Brand: round avatar (logo, or the artist portrait as fallback)
					    with the artist name beside it. */}
					<Link
						to="/"
						className="group flex items-center gap-3.5"
						aria-label={brand.siteName}
					>
						{avatarUrl ? (
							<span className="brand-avatar">
								<img
									src={avatarUrl}
									alt={brand.artistName}
									width={46}
									height={46}
									loading="eager"
								/>
							</span>
						) : (
							<span className="brand-avatar brand-avatar-fallback" aria-hidden="true">
								{initials}
							</span>
						)}
						<span className="flex flex-col leading-tight">
							<span className="font-display text-[1.02rem] tracking-[0.02em]">
								{brand.artistName}
							</span>
							{artist?.role ? (
								<span className="t-caption text-muted hidden sm:block">
									{artist.role}
								</span>
							) : null}
						</span>
					</Link>

					{/* Desktop navigation */}
					<nav
						className="hidden items-center gap-8 lg:flex"
						aria-label="منوی اصلی"
					>
						{items.map((item) => (
							<NavLink
								key={item.id}
								to={item.url}
								target={item.open_in_new_tab ? "_blank" : undefined}
								rel={item.open_in_new_tab ? "noreferrer" : undefined}
								className={({ isActive }) =>
									cx(
										"t-nav transition-colors duration-fast",
										isActive ? "text-ink" : "text-muted hover:text-ink",
									)
								}
							>
								<span className="link-u">{item.label}</span>
							</NavLink>
						))}
						<Link to="/contact" className="btn btn-ghost h-10 min-h-0">
							تماس
						</Link>
					</nav>

					{/* Mobile trigger — 44px touch target */}
					<button
						type="button"
						className="-me-2 flex h-11 w-11 items-center justify-center lg:hidden"
						aria-label="باز کردن منو"
						aria-expanded={menuOpen}
						aria-controls="mobile-menu"
						onClick={() => setMenuOpen(true)}
					>
						<span className="relative block h-[9px] w-6" aria-hidden="true">
							<span className="absolute inset-x-0 top-0 h-[1.5px] bg-ink" />
							<span className="absolute inset-x-0 bottom-0 h-[1.5px] bg-ink" />
						</span>
					</button>
				</div>
			</header>

			<MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
		</>
	)
}
