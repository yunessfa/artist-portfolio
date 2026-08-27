import { useEffect, useRef, type ElementType, type ReactNode } from "react"
import { DUR, EASE, STAGGER, gsap, motionDisabled, registerGsap } from "./gsap"

/**
 * Scroll reveals.
 *
 * Nine variants, all built from the same grammar: a short travel (never more
 * than 40px), a slow-out ease, and at most one mask. No bounce, no rotation,
 * no scale above 1.04 — the movement should register as "considered", not as
 * an effect.
 */
export type RevealVariant =
	| "fadeUp"
	| "fadeDown"
	| "fadeIn"
	| "maskUp"
	| "imageReveal"
	| "clipReveal"
	| "scaleReveal"
	| "slideReveal"
	| "textSplit"

type FromTo = { from: gsap.TweenVars; to: gsap.TweenVars }

const VARIANTS: Record<RevealVariant, FromTo> = {
	fadeUp: {
		from: { opacity: 0, y: 28 },
		to: { opacity: 1, y: 0, duration: DUR.slow, ease: EASE.out },
	},
	fadeDown: {
		from: { opacity: 0, y: -22 },
		to: { opacity: 1, y: 0, duration: DUR.slow, ease: EASE.out },
	},
	fadeIn: {
		from: { opacity: 0 },
		to: { opacity: 1, duration: DUR.slow, ease: EASE.out },
	},
	maskUp: {
		from: { opacity: 0, y: 40, clipPath: "inset(100% 0% 0% 0%)" },
		to: {
			opacity: 1,
			y: 0,
			clipPath: "inset(0% 0% 0% 0%)",
			duration: DUR.cinematic,
			ease: EASE.expo,
		},
	},
	imageReveal: {
		from: { opacity: 0, clipPath: "inset(0% 0% 100% 0%)", scale: 1.04 },
		to: {
			opacity: 1,
			clipPath: "inset(0% 0% 0% 0%)",
			scale: 1,
			duration: DUR.cinematic,
			ease: EASE.expo,
		},
	},
	clipReveal: {
		from: { opacity: 0, clipPath: "inset(0% 100% 0% 0%)" },
		to: {
			opacity: 1,
			clipPath: "inset(0% 0% 0% 0%)",
			duration: DUR.cinematic,
			ease: EASE.expo,
		},
	},
	scaleReveal: {
		from: { opacity: 0, scale: 0.985 },
		to: { opacity: 1, scale: 1, duration: DUR.slow, ease: EASE.out },
	},
	// Back-compat aliases used by older screens.
	slideReveal: {
		from: { opacity: 0, x: 34 },
		to: { opacity: 1, x: 0, duration: DUR.slow, ease: EASE.out },
	},
	textSplit: {
		from: { opacity: 0, y: 34, clipPath: "inset(100% 0% 0% 0%)" },
		to: {
			opacity: 1,
			y: 0,
			clipPath: "inset(0% 0% 0% 0%)",
			duration: DUR.cinematic,
			ease: EASE.expo,
		},
	},
}

export function Reveal({
	children,
	variant = "fadeUp",
	index = 0,
	delay = 0,
	as: Tag = "div",
	className,
	style,
	amount = 0.15,
	once = true,
}: {
	children: ReactNode
	variant?: RevealVariant
	/** Position in a group; multiplies the stagger. */
	index?: number
	delay?: number
	as?: ElementType
	className?: string
	style?: React.CSSProperties
	/** How much of the element must be visible before it plays (0–1). */
	amount?: number
	once?: boolean
}) {
	const ref = useRef<HTMLElement | null>(null)

	useEffect(() => {
		const el = ref.current
		if (!el) return
		if (motionDisabled()) {
			el.classList.add("is-revealed")
			return
		}
		registerGsap()
		const preset = VARIANTS[variant]
		const ctx = gsap.context(() => {
			gsap.fromTo(el, preset.from, {
				...preset.to,
				delay: delay + index * STAGGER,
				onStart: () => el.classList.add("is-revealed"),
				scrollTrigger: {
					trigger: el,
					start: `top bottom-=${Math.round(amount * 100)}%`,
					toggleActions: once
						? "play none none none"
						: "play none none reverse",
				},
			})
		}, el)
		return () => ctx.revert()
	}, [amount, delay, index, once, variant])

	return (
		<Tag
			ref={ref as never}
			data-reveal={variant}
			className={className}
			style={style}
		>
			{children}
		</Tag>
	)
}

/**
 * Word-level headline reveal. Splits on spaces only — never inside a Persian
 * word, which would break the joined script.
 */
export function RevealText({
	text,
	as: Tag = "span",
	className,
	delay = 0,
}: {
	text: string
	as?: ElementType
	className?: string
	delay?: number
}) {
	const ref = useRef<HTMLElement | null>(null)

	useEffect(() => {
		const el = ref.current
		if (!el) return
		const words = el.querySelectorAll("[data-word] > span")
		if (!words.length) return
		if (motionDisabled()) {
			gsap.set(words, { y: 0, opacity: 1 })
			return
		}
		registerGsap()
		const ctx = gsap.context(() => {
			gsap.fromTo(
				words,
				{ yPercent: 110, opacity: 0 },
				{
					yPercent: 0,
					opacity: 1,
					duration: DUR.cinematic,
					ease: EASE.expo,
					stagger: 0.055,
					delay,
					scrollTrigger: { trigger: el, start: "top bottom-=10%" },
				},
			)
		}, el)
		return () => ctx.revert()
	}, [delay, text])

	return (
		<Tag ref={ref as never} className={className}>
			{text.split(" ").map((word, i) => (
				<span
					key={`${word}-${i}`}
					data-word
					style={{
						display: "inline-block",
						overflow: "hidden",
						verticalAlign: "top",
					}}
				>
					<span style={{ display: "inline-block" }}>{word}</span>
					{i < text.split(" ").length - 1 ? "\u00a0" : null}
				</span>
			))}
		</Tag>
	)
}
