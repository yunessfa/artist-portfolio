import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

/**
 * MOTION CORE
 * ===========
 * A single registration point plus the shared duration/easing vocabulary, so
 * every animation in the app moves with the same character: slow-out, no
 * bounce, no overshoot, nothing decorative that runs forever.
 */

let registered = false

export function registerGsap() {
	if (registered) return
	gsap.registerPlugin(ScrollTrigger)
	registered = true
	if (typeof document !== "undefined") {
		document.documentElement.classList.add("gsap-ready")
	}
}

export { gsap, ScrollTrigger }

/** Durations (seconds) — mirrors --d-* in index.css. */
export const DUR = {
	fast: 0.22,
	base: 0.45,
	slow: 0.9,
	cinematic: 1.25,
} as const

export const EASE = {
	out: "power3.out",
	in: "power2.in",
	inOut: "power2.inOut",
	expo: "expo.out",
} as const

/** Stagger between siblings in a reveal group. */
export const STAGGER = 0.075

export function prefersReducedMotion(): boolean {
	if (typeof window === "undefined") return false
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** `?qa=1` disables motion so screenshots and QA passes are deterministic. */
export function isQaMode(): boolean {
	if (typeof window === "undefined") return false
	return new URLSearchParams(window.location.search).get("qa") === "1"
}

export function motionDisabled(): boolean {
	return prefersReducedMotion() || isQaMode()
}

/** Marks <html> so CSS can guarantee content is visible without JS motion. */
export function markMotionState() {
	if (typeof document === "undefined") return
	document.documentElement.classList.toggle("no-motion", motionDisabled())
	if (isQaMode()) document.documentElement.classList.add("qa")
}

export function configureScrollTrigger() {
	registerGsap()
	ScrollTrigger.config({
		// Ignore resizes caused by mobile browser chrome hiding/showing.
		ignoreMobileResize: true,
	})
}

/**
 * Images change layout after they decode, which invalidates every trigger
 * position. Refresh once the page has fully loaded, and once more after fonts
 * settle.
 */
export function refreshAfterLoad() {
	if (typeof window === "undefined") return
	const refresh = () => ScrollTrigger.refresh()
	if (document.readyState === "complete") refresh()
	else window.addEventListener("load", refresh, { once: true })
	if (document.fonts?.ready) void document.fonts.ready.then(refresh)
}

/** Cleanup helper for unmount paths: kills triggers and reverts inline styles. */
export function killAll(ctx?: gsap.Context) {
	if (ctx) {
		ctx.revert()
		return
	}
	ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
	gsap.globalTimeline.clear()
}
