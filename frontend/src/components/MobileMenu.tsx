import { useEffect, useRef } from "react"
import { Link, useLocation } from "react-router-dom"
import { useBootstrap } from "@/store/bootstrap"
import { DUR, EASE, gsap, motionDisabled, registerGsap } from "@/motion/gsap"

const DIGITS = "۰۱۲۳۴۵۶۷۸۹"
const index = (i: number) =>
	String(i + 1)
		.padStart(2, "0")
		.replace(/\d/g, (d) => DIGITS[Number(d)])

/**
 * MOBILE MENU
 *
 * Designed for the phone, not scaled down from the desktop bar: a full-height
 * paper curtain that wipes in with a clip-path, then the links rise in
 * sequence. It is a real dialog — Escape closes it, focus returns to the
 * trigger, and background scrolling is locked while it is open.
 */
export function MobileMenu({
	open,
	onClose,
}: {
	open: boolean
	onClose: () => void
}) {
	const { nav, site, data } = useBootstrap()
	const panelRef = useRef<HTMLDivElement | null>(null)
	const restoreRef = useRef<HTMLElement | null>(null)
	const { pathname } = useLocation()
	const items = nav?.mobile?.length ? nav.mobile : nav?.header || []
	const socials = data?.socials || []

	// Close on navigation.
	useEffect(() => {
		if (open) onClose()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pathname])

	// Escape + scroll lock + focus management.
	useEffect(() => {
		if (!open) return
		restoreRef.current = document.activeElement as HTMLElement | null
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose()
		}
		document.addEventListener("keydown", onKey)
		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = "hidden"
		panelRef.current?.querySelector<HTMLElement>("a,button")?.focus()
		return () => {
			document.removeEventListener("keydown", onKey)
			document.body.style.overflow = previousOverflow
			restoreRef.current?.focus?.()
		}
	}, [open, onClose])

	// Curtain + staggered items.
	useEffect(() => {
		const panel = panelRef.current
		if (!panel || !open) return
		if (motionDisabled()) {
			gsap.set(panel, { clipPath: "inset(0 0 0% 0)", opacity: 1 })
			return
		}
		registerGsap()
		const ctx = gsap.context(() => {
			const tl = gsap.timeline()
			tl.fromTo(
				panel,
				{ clipPath: "inset(0 0 100% 0)" },
				{
					clipPath: "inset(0 0 0% 0)",
					duration: DUR.slow,
					ease: EASE.expo,
				},
			).fromTo(
				panel.querySelectorAll("[data-menu-item]"),
				{ opacity: 0, y: 24 },
				{
					opacity: 1,
					y: 0,
					duration: DUR.base,
					ease: EASE.out,
					stagger: 0.06,
				},
				"-=0.45",
			)
		}, panel)
		return () => ctx.revert()
	}, [open])

	if (!open) return null

	return (
		<div
			id="mobile-menu"
			ref={panelRef}
			role="dialog"
			aria-modal="true"
			aria-label="منوی سایت"
			className="fixed inset-0 z-[60] flex flex-col bg-bg lg:hidden"
		>
			<div className="container-x flex h-[var(--header-h)] items-center justify-between">
				<span className="eyebrow">{site?.site_name}</span>
				<button
					type="button"
					onClick={onClose}
					className="-me-2 flex h-11 w-11 items-center justify-center text-2xl leading-none"
					aria-label="بستن منو"
				>
					×
				</button>
			</div>

			<nav className="container-x flex-1 overflow-y-auto pb-10 pt-6">
				<ul>
					{items.map((item, i) => (
						<li key={item.id} data-menu-item className="hairline">
							<Link
								to={item.url}
								onClick={onClose}
								className="flex items-baseline gap-4 py-5"
							>
								<span className="t-index">{index(i)}</span>
								<span className="t-h2">{item.label}</span>
							</Link>
						</li>
					))}
				</ul>

				<div data-menu-item className="mt-10 space-y-3">
					{site?.email ? (
						<a
							href={`mailto:${site.email}`}
							className="t-small block text-muted"
							dir="ltr"
						>
							{site.email}
						</a>
					) : null}
					{socials.length ? (
						<ul className="flex flex-wrap gap-x-5 gap-y-2">
							{socials.map((social) => (
								<li key={social.id}>
									<a
										href={social.url}
										target="_blank"
										rel="noreferrer"
										className="t-caption"
									>
										{social.label}
									</a>
								</li>
							))}
						</ul>
					) : null}
				</div>
			</nav>
		</div>
	)
}
