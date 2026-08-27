import { useCallback, useEffect, useRef, useState } from "react"
import { SmartImage } from "./SmartImage"
import { DUR, EASE, gsap, motionDisabled } from "@/motion/gsap"
import type { MediaAsset } from "@/lib/types"

type Item = { asset: MediaAsset | null; caption?: string | null }

const MIN_ZOOM = 1
const MAX_ZOOM = 4

/**
 * LIGHTBOX
 *
 * Full keyboard control (Esc, arrows RTL-aware, +/-, 0 to reset, f for
 * fullscreen), touch swipe between works, swipe-down to close, and
 * pointer-capture drag panning while zoomed. Panning is written straight to the
 * DOM with gsap.set so dragging never triggers a React render.
 *
 * The only place in the app that changes the cursor — and only to the standard
 * `zoom-in` / `grab` shapes, scoped to the image itself. The cursor is never
 * hidden.
 */
export function Lightbox({
	items,
	index,
	onClose,
	onIndexChange,
	allowZoom = true,
}: {
	items: Item[]
	index: number
	onClose: () => void
	onIndexChange: (next: number) => void
	allowZoom?: boolean
}) {
	const rootRef = useRef<HTMLDivElement | null>(null)
	const frameRef = useRef<HTMLDivElement | null>(null)
	const [zoom, setZoom] = useState(1)
	const panRef = useRef({ x: 0, y: 0 })
	const dragRef = useRef<{ x: number; y: number } | null>(null)
	const touchRef = useRef<{ x: number; y: number } | null>(null)
	const item = items[index]
	const total = items.length

	const go = useCallback(
		(delta: number) => {
			if (!total) return
			setZoom(1)
			panRef.current = { x: 0, y: 0 }
			if (frameRef.current) {
				gsap.set(frameRef.current, { x: 0, y: 0, scale: 1 })
			}
			onIndexChange((index + delta + total) % total)
		},
		[index, onIndexChange, total],
	)

	const setZoomTo = useCallback((next: number) => {
		const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
		setZoom(clamped)
		if (clamped === 1) panRef.current = { x: 0, y: 0 }
		if (frameRef.current) {
			gsap.to(frameRef.current, {
				scale: clamped,
				x: panRef.current.x,
				y: panRef.current.y,
				duration: motionDisabled() ? 0 : DUR.fast,
				ease: EASE.out,
			})
		}
	}, [])

	// Entrance.
	useEffect(() => {
		const root = rootRef.current
		if (!root || motionDisabled()) return
		const tween = gsap.fromTo(
			root,
			{ opacity: 0 },
			{ opacity: 1, duration: DUR.base, ease: EASE.out },
		)
		const inner = gsap.fromTo(
			frameRef.current,
			{ scale: 0.965, opacity: 0 },
			{ scale: 1, opacity: 1, duration: DUR.slow, ease: EASE.expo },
		)
		return () => {
			tween.kill()
			inner.kill()
		}
	}, [])

	// Keyboard + scroll lock.
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			switch (event.key) {
				case "Escape":
					onClose()
					break
				// RTL: ArrowLeft advances, ArrowRight goes back.
				case "ArrowLeft":
					go(1)
					break
				case "ArrowRight":
					go(-1)
					break
				case "+":
				case "=":
					if (allowZoom) setZoomTo(zoom + 0.5)
					break
				case "-":
					if (allowZoom) setZoomTo(zoom - 0.5)
					break
				case "0":
					setZoomTo(1)
					break
				case "f":
				case "F":
					void toggleFullscreen()
					break
				default:
					break
			}
		}
		document.addEventListener("keydown", onKey)
		const previous = document.body.style.overflow
		document.body.style.overflow = "hidden"
		return () => {
			document.removeEventListener("keydown", onKey)
			document.body.style.overflow = previous
		}
	}, [allowZoom, go, onClose, setZoomTo, zoom])

	async function toggleFullscreen() {
		const root = rootRef.current
		if (!root) return
		if (document.fullscreenElement) await document.exitFullscreen()
		else await root.requestFullscreen?.()
	}

	// Drag to pan (pointer capture keeps the gesture even outside the element).
	const onPointerDown = (event: React.PointerEvent) => {
		if (zoom === 1) return
		dragRef.current = { x: event.clientX, y: event.clientY }
		;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
	}
	const onPointerMove = (event: React.PointerEvent) => {
		const start = dragRef.current
		if (!start || !frameRef.current) return
		const next = {
			x: panRef.current.x + (event.clientX - start.x),
			y: panRef.current.y + (event.clientY - start.y),
		}
		gsap.set(frameRef.current, { x: next.x, y: next.y })
	}
	const onPointerUp = (event: React.PointerEvent) => {
		const start = dragRef.current
		if (!start) return
		panRef.current = {
			x: panRef.current.x + (event.clientX - start.x),
			y: panRef.current.y + (event.clientY - start.y),
		}
		dragRef.current = null
	}

	// Touch: horizontal swipe changes work, downward swipe closes.
	const onTouchStart = (event: React.TouchEvent) => {
		const touch = event.touches[0]
		touchRef.current = { x: touch.clientX, y: touch.clientY }
	}
	const onTouchEnd = (event: React.TouchEvent) => {
		const start = touchRef.current
		if (!start || zoom !== 1) return
		const touch = event.changedTouches[0]
		const dx = touch.clientX - start.x
		const dy = touch.clientY - start.y
		if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) go(dx > 0 ? -1 : 1)
		else if (dy > 90) onClose()
		touchRef.current = null
	}

	if (!item) return null

	return (
		<div
			ref={rootRef}
			className="fixed inset-0 z-[90] flex flex-col bg-[var(--overlay)] backdrop-blur-[2px]"
			role="dialog"
			aria-modal="true"
			aria-label="نمایش بزرگ اثر"
		>
			{/* Top bar */}
			<div className="flex items-center justify-between px-5 py-4 text-onAccent">
				<span className="t-caption text-onAccent/80">
					{index + 1} / {total}
				</span>
				<div className="flex items-center gap-1">
					{allowZoom ? (
						<>
							<button
								type="button"
								className="h-11 w-11 text-lg"
								onClick={() => setZoomTo(zoom - 0.5)}
								aria-label="کوچک‌نمایی"
							>
								−
							</button>
							<button
								type="button"
								className="h-11 w-11 text-lg"
								onClick={() => setZoomTo(zoom + 0.5)}
								aria-label="بزرگ‌نمایی"
							>
								+
							</button>
						</>
					) : null}
					<button
						type="button"
						className="h-11 w-11"
						onClick={() => void toggleFullscreen()}
						aria-label="تمام‌صفحه"
					>
						⛶
					</button>
					<button
						type="button"
						className="h-11 w-11 text-2xl leading-none"
						onClick={onClose}
						aria-label="بستن"
					>
						×
					</button>
				</div>
			</div>

			{/* Stage */}
			<div
				className="flex flex-1 items-center justify-center overflow-hidden px-4 pb-4"
				onTouchStart={onTouchStart}
				onTouchEnd={onTouchEnd}
			>
				<div
					ref={frameRef}
					className="max-h-full max-w-[min(100%,1400px)] touch-none select-none"
					style={{
						cursor: !allowZoom
							? "default"
							: zoom > 1
								? "grab"
								: "zoom-in",
					}}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onDoubleClick={() =>
						allowZoom ? setZoomTo(zoom > 1 ? 1 : 2) : undefined
					}
				>
					<SmartImage
						asset={item.asset}
						alt={item.caption || ""}
						priority
						objectFit="contain"
					/>
				</div>
			</div>

			{/* Caption + thumbnails */}
			<div className="px-5 pb-6 text-onAccent">
				{item.caption ? (
					<p className="t-caption text-center text-onAccent/85">
						{item.caption}
					</p>
				) : null}
				{total > 1 ? (
					<div className="mt-4 flex justify-center gap-2 overflow-x-auto">
						{items.map((thumb, i) => (
							<button
								key={i}
								type="button"
								onClick={() => onIndexChange(i)}
								className={
									i === index
										? "h-12 w-12 shrink-0 opacity-100 ring-1 ring-onAccent"
										: "h-12 w-12 shrink-0 opacity-50 transition-opacity duration-fast hover:opacity-90"
								}
								aria-label={`تصویر ${i + 1}`}
								aria-current={i === index}
							>
								<SmartImage asset={thumb.asset} ratio={1} />
							</button>
						))}
					</div>
				) : null}
			</div>
		</div>
	)
}
