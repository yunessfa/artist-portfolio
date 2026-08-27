import { useEffect, useRef } from "react"
import { useBootstrap } from "@/store/bootstrap"
import { DUR, EASE, gsap, motionDisabled, registerGsap } from "@/motion/gsap"

/**
 * INTRO LOADER
 *
 * One hairline that fills while the bootstrap request is in flight, then
 * completes and fades. No spinning logo, no fake progress percentage, and it is
 * skipped entirely when motion is reduced or the admin turns it off.
 */
export function IntroLoader() {
	const { loading, site } = useBootstrap()
	const rootRef = useRef<HTMLDivElement | null>(null)
	const barRef = useRef<HTMLDivElement | null>(null)
	const enabled = site?.enable_intro_loader !== false

	useEffect(() => {
		const root = rootRef.current
		const bar = barRef.current
		if (!root || !bar || !enabled || motionDisabled()) return
		registerGsap()
		const ctx = gsap.context(() => {
			gsap.fromTo(
				bar,
				{ scaleX: 0.04 },
				{ scaleX: 0.7, duration: 1.1, ease: EASE.out },
			)
		}, root)
		return () => ctx.revert()
	}, [enabled])

	useEffect(() => {
		const root = rootRef.current
		const bar = barRef.current
		if (!root || !bar || loading) return
		if (!enabled || motionDisabled()) {
			root.style.display = "none"
			return
		}
		const tl = gsap.timeline()
		tl.to(bar, { scaleX: 1, duration: DUR.base, ease: EASE.out }).to(
			root,
			{
				opacity: 0,
				duration: DUR.base,
				ease: EASE.inOut,
				onComplete: () => {
					root.style.display = "none"
				},
			},
			"+=0.05",
		)
		return () => {
			tl.kill()
		}
	}, [enabled, loading])

	if (!enabled) return null

	return (
		<div
			ref={rootRef}
			className="fixed inset-0 z-[80] flex items-end bg-bg"
			aria-hidden="true"
		>
			<div className="container-x pb-16">
				<div className="h-px w-[min(60vw,420px)] bg-line">
					<div
						ref={barRef}
						className="h-px w-full origin-[100%_50%] bg-ink"
					/>
				</div>
			</div>
		</div>
	)
}
