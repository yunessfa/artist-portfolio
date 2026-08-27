import { useEffect, useRef } from "react"
import { EASE, ScrollTrigger, gsap, motionDisabled, registerGsap } from "./gsap"

/**
 * PARALLAX & POINTER DEPTH
 *
 * Every hook here returns a ref you attach directly to an element. Motion is
 * driven by GSAP (scrub-linked to scroll, or quickTo for the pointer) so React
 * never re-renders during movement.
 *
 * Amplitudes are deliberately small: depth should be felt, not noticed.
 */

/** Below this width, parallax and pinning are disabled entirely. */
export const MIN_WIDTH = 900

/**
 * Scroll parallax. `strength` is the total travel in px (split ±half around
 * the element's natural position), optionally with a very slight scale-down.
 */
export function useParallax<T extends HTMLElement>(
	strength = 60,
	options: { axis?: "y" | "x"; scale?: boolean } = {},
) {
	const ref = useRef<T | null>(null)
	const { axis = "y", scale = false } = options

	useEffect(() => {
		const el = ref.current
		if (!el) return
		if (motionDisabled() || window.innerWidth < MIN_WIDTH) return
		registerGsap()
		const half = strength / 2
		const ctx = gsap.context(() => {
			gsap.fromTo(
				el,
				{
					[axis]: -half,
					...(scale ? { scale: 1.08 } : {}),
				},
				{
					[axis]: half,
					...(scale ? { scale: 1 } : {}),
					ease: "none",
					scrollTrigger: {
						trigger: el,
						start: "top bottom",
						end: "bottom top",
						scrub: true,
						invalidateOnRefresh: true,
					},
				},
			)
		}, el)
		return () => ctx.revert()
	}, [axis, scale, strength])

	return ref
}

/**
 * Pointer-follow depth for hero art. Uses gsap.quickTo, so no React state is
 * touched on mousemove. Skipped on touch devices, where there is no hover.
 */
export function usePointerParallax<T extends HTMLElement>(strength = 14) {
	const ref = useRef<T | null>(null)

	useEffect(() => {
		const el = ref.current
		if (!el) return
		if (motionDisabled()) return
		if (window.matchMedia("(hover: none)").matches) return
		registerGsap()

		const xTo = gsap.quickTo(el, "x", { duration: 0.9, ease: EASE.out })
		const yTo = gsap.quickTo(el, "y", { duration: 0.9, ease: EASE.out })

		const onMove = (event: PointerEvent) => {
			const nx = event.clientX / window.innerWidth - 0.5
			const ny = event.clientY / window.innerHeight - 0.5
			xTo(-nx * strength)
			yTo(-ny * strength)
		}
		const onLeave = () => {
			xTo(0)
			yTo(0)
		}

		window.addEventListener("pointermove", onMove, { passive: true })
		window.addEventListener("pointerleave", onLeave)
		return () => {
			window.removeEventListener("pointermove", onMove)
			window.removeEventListener("pointerleave", onLeave)
			gsap.set(el, { x: 0, y: 0 })
		}
	}, [strength])

	return ref
}

/**
 * Magnetic hover for small controls: the element leans a few pixels toward the
 * cursor. `pull` never exceeds ~10px, so the hit area still matches the visual.
 */
export function useMagnetic<T extends HTMLElement>(pull = 8) {
	const ref = useRef<T | null>(null)

	useEffect(() => {
		const el = ref.current
		if (!el) return
		if (motionDisabled()) return
		if (window.matchMedia("(hover: none)").matches) return
		registerGsap()

		const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: EASE.out })
		const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: EASE.out })

		const onMove = (event: PointerEvent) => {
			const rect = el.getBoundingClientRect()
			const dx = (event.clientX - (rect.left + rect.width / 2)) / rect.width
			const dy = (event.clientY - (rect.top + rect.height / 2)) / rect.height
			xTo(dx * pull * 2)
			yTo(dy * pull * 2)
		}
		const reset = () => {
			xTo(0)
			yTo(0)
		}

		el.addEventListener("pointermove", onMove)
		el.addEventListener("pointerleave", reset)
		el.addEventListener("blur", reset)
		return () => {
			el.removeEventListener("pointermove", onMove)
			el.removeEventListener("pointerleave", reset)
			el.removeEventListener("blur", reset)
			gsap.set(el, { x: 0, y: 0 })
		}
	}, [pull])

	return ref
}

/**
 * Horizontal, pinned track (used for the collections rail). RTL-aware: the
 * track travels in the positive direction because the layout starts at the
 * right edge. Falls back to normal vertical stacking under MIN_WIDTH.
 */
export function useHorizontalTrack<
	W extends HTMLElement,
	T extends HTMLElement,
>() {
	const wrapRef = useRef<W | null>(null)
	const trackRef = useRef<T | null>(null)

	useEffect(() => {
		const wrap = wrapRef.current
		const track = trackRef.current
		if (!wrap || !track) return
		if (motionDisabled() || window.innerWidth < MIN_WIDTH) return
		registerGsap()

		const ctx = gsap.context(() => {
			const distance = () =>
				Math.max(0, track.scrollWidth - window.innerWidth)
			gsap.to(track, {
				x: () => distance(),
				ease: "none",
				scrollTrigger: {
					trigger: wrap,
					start: "top top",
					end: () => `+=${distance()}`,
					pin: true,
					scrub: 1,
					anticipatePin: 1,
					invalidateOnRefresh: true,
				},
			})
		}, wrap)

		return () => {
			ctx.revert()
			ScrollTrigger.refresh()
		}
	}, [])

	return { wrapRef, trackRef }
}
