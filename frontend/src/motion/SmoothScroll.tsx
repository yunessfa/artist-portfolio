import { useEffect, type ReactNode } from "react"
import Lenis from "lenis"
import {
	ScrollTrigger,
	configureScrollTrigger,
	gsap,
	markMotionState,
	motionDisabled,
	refreshAfterLoad,
} from "./gsap"

/**
 * SMOOTH SCROLL
 *
 * Lenis is wired into the GSAP ticker so ScrollTrigger and the smoothed scroll
 * position never disagree. Touch smoothing is off on purpose: native momentum
 * on phones is better than any JS approximation, and it keeps mobile fast.
 */

let lenis: Lenis | null = null

export function getLenis() {
	return lenis
}

export function SmoothScroll({ children }: { children: ReactNode }) {
	useEffect(() => {
		markMotionState()
		configureScrollTrigger()
		refreshAfterLoad()

		if (motionDisabled()) return

		const instance = new Lenis({
			lerp: 0.1,
			wheelMultiplier: 1,
			smoothWheel: true,
			syncTouch: false,
		})
		lenis = instance

		instance.on("scroll", ScrollTrigger.update)
		const tick = (time: number) => instance.raf(time * 1000)
		gsap.ticker.add(tick)
		gsap.ticker.lagSmoothing(0)

		return () => {
			gsap.ticker.remove(tick)
			instance.destroy()
			lenis = null
		}
	}, [])

	return <>{children}</>
}
