import type { ReactNode } from "react"

/**
 * LOADING / EMPTY / ERROR
 *
 * Every screen uses these three, so the site never shows a blank frame or a
 * bare spinner where content is expected. Skeletons mirror the real layout
 * (same ratios, same rhythm) to avoid a jump when data lands.
 */

export function Spinner({
	className,
	label,
}: {
	className?: string
	label?: string
}) {
	return (
		<div
			className={`flex items-center justify-center gap-3 py-16 ${className || ""}`}
			role="status"
			aria-live="polite"
		>
			<span
				className="inline-block h-4 w-4 animate-spin rounded-full border border-line border-t-accent"
				aria-hidden="true"
			/>
			<span className="t-caption">{label || "در حال بارگذاری…"}</span>
		</div>
	)
}

/** Full-page skeleton: eyebrow, headline, paragraph, hero frame. */
export function PageSkeleton() {
	return (
		<div
			className="container-x pb-[var(--section-space)] pt-[calc(var(--header-h)+72px)]"
			aria-busy="true"
		>
			<div className="skeleton h-3 w-24" />
			<div className="skeleton mt-6 h-12 w-[min(100%,28rem)]" />
			<div className="skeleton mt-4 h-4 w-[min(100%,20rem)]" />
			<div className="skeleton mt-12 aspect-[16/10] w-full" />
			<div className="mt-10 grid gap-6 md:grid-cols-3">
				{[0, 1, 2].map((i) => (
					<div key={i} className="skeleton h-4 w-full" />
				))}
			</div>
		</div>
	)
}

/** Grid skeleton for galleries and admin lists. */
export function GridSkeleton({ count = 6 }: { count?: number }) {
	return (
		<div
			className="grid gap-[var(--grid-gap)] sm:grid-cols-2 lg:grid-cols-3"
			aria-busy="true"
		>
			{Array.from({ length: count }).map((_, i) => (
				<div key={i}>
					<div className="skeleton aspect-[4/5] w-full" />
					<div className="skeleton mt-4 h-3 w-2/3" />
					<div className="skeleton mt-2 h-3 w-1/3" />
				</div>
			))}
		</div>
	)
}

export function EmptyState({
	title,
	body,
	action,
}: {
	title: string
	body?: string
	action?: ReactNode
}) {
	return (
		<div className="hairline py-20 text-center">
			<p className="t-h3">{title}</p>
			{body ? (
				<p className="t-small mx-auto mt-3 max-w-md text-muted">{body}</p>
			) : null}
			{action ? <div className="mt-7">{action}</div> : null}
		</div>
	)
}

export function ErrorState({
	title,
	body,
	onRetry,
}: {
	title?: string
	body?: string
	onRetry?: () => void
}) {
	return (
		<div className="container-narrow py-24 text-center" role="alert">
			<p className="eyebrow">خطا</p>
			<p className="t-h2 mt-4">{title || "محتوا بارگذاری نشد"}</p>
			<p className="t-small mt-4 text-muted">
				{body || "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید."}
			</p>
			{onRetry ? (
				<button type="button" className="btn btn-ghost mt-8" onClick={onRetry}>
					تلاش دوباره
				</button>
			) : null}
		</div>
	)
}
