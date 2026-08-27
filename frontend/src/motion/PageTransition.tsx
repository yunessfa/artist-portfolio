import { useEffect, useRef, type ReactNode } from "react"
import { useLocation } from "react-router-dom"
import { DUR, EASE, ScrollTrigger, gsap, motionDisabled } from "./gsap"

/**
 * PAGE TRANSITION
 *
 * Deliberately incoming-only: no exit animation, so navigation never feels
 * delayed. The new view fades and rises 14px over ~0.45s, then ScrollTrigger is
 * refreshed because the document height just changed.
 */
export function PageTransition({ children }: { children: ReactNode }) {
	const ref = useRef<HTMLDivElement | null>(null)
	const { pathname } = useLocation()

	useEffect(() => {
		const el = ref.current
		if (!el) return

		// Every navigation starts at the top of the new page.
		window.scrollTo({ top: 0, behavior: "auto" })

		if (motionDisabled()) {
			ScrollTrigger.refresh()
			return
		}

		const tween = gsap.fromTo(
			el,
			{ opacity: 0, y: 14 },
			{
				opacity: 1,
				y: 0,
				duration: DUR.base,
				ease: EASE.out,
				onComplete: () => {
					gsap.set(el, { clearProps: "transform,opacity" })
					ScrollTrigger.refresh()
				},
			},
		)

		return () => {
			tween.kill()
		}
	}, [pathname])

	return <div ref={ref}>{children}</div>
}
