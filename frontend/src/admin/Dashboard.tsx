import { Link } from "react-router-dom"
import { useApi } from "@/hooks/useApi"
import { AdminHeader, AdminPanel } from "./Layout"
import { EmptyState, ErrorState, Spinner } from "@/components/Feedback"
import { formatDate, toPersianDigits } from "@/lib/format"

/** Real numbers only — everything here comes from `GET /dashboard/stats/`. */
type Stats = {
	counts: {
		artworks: number
		artworksPublished: number
		artworksDraft: number
		collections: number
		exhibitions: number
		media: number
		messagesNew: number
	}
	views: {
		total: number
		last7: number
		last30: number
		uniqueLast30: number
		daily: Array<{ day: string; total: number }>
		topPaths: Array<{ path: string; total: number }>
	}
	latestArtworks: Array<{
		id: number
		title: string
		slug: string
		status: string
	}>
	mostViewed: Array<{
		id: number
		title: string
		slug: string
		view_count: number
	}>
	recentlyEdited: Array<{ id: number; title: string; updated_at: string }>
}

const STATUS_LABEL: Record<string, string> = {
	published: "منتشرشده",
	draft: "پیش‌نویس",
	archived: "بایگانی",
}

function Metric({
	label,
	value,
	hint,
}: {
	label: string
	value: number
	hint?: string
}) {
	return (
		<div className="border-s-2 border-line ps-4">
			<p className="eyebrow">{label}</p>
			<p className="mt-2 font-display text-[2rem] leading-none">
				{toPersianDigits(value ?? 0)}
			</p>
			{hint ? <p className="t-caption mt-1 text-muted">{hint}</p> : null}
		</div>
	)
}

function List({
	title,
	empty,
	rows,
}: {
	title: string
	empty: string
	rows: Array<{ key: number; label: string; meta: string; to?: string }>
}) {
	return (
		<AdminPanel title={title}>
			{rows.length ? (
				<ul className="divide-y divide-line">
					{rows.map((row) => (
						<li
							key={row.key}
							className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
						>
							{row.to ? (
								<Link to={row.to} className="t-body">
									<span className="link-u">{row.label}</span>
								</Link>
							) : (
								<span className="t-body">{row.label}</span>
							)}
							<span className="t-caption whitespace-nowrap text-muted">
								{row.meta}
							</span>
						</li>
					))}
				</ul>
			) : (
				<p className="t-small text-muted">{empty}</p>
			)}
		</AdminPanel>
	)
}

export default function Dashboard() {
	const { data, loading, error, refetch } = useApi<Stats>(
		"/dashboard/stats/",
		undefined,
		true,
	)

	if (loading) {
		return (
			<>
				<AdminHeader title="داشبورد" />
				<AdminPanel>
					<Spinner label="دریافت آمار…" />
				</AdminPanel>
			</>
		)
	}

	if (error || !data) {
		return (
			<>
				<AdminHeader title="داشبورد" />
				<ErrorState
					title="آمار دریافت نشد"
					body={error || undefined}
					onRetry={() => void refetch()}
				/>
			</>
		)
	}

	const daily = data.views?.daily ?? []
	const max = Math.max(1, ...daily.map((day) => day.total))
	const hasContent = (data.counts?.artworks ?? 0) > 0

	return (
		<>
			<AdminHeader
				title="داشبورد"
				subtitle="خلاصه‌ی وضعیت محتوا و بازدید"
				action={
					<Link to="/admin-panel/artworks/new" className="btn btn-accent">
						افزودن اثر
					</Link>
				}
			/>

			{!hasContent ? (
				<div className="mb-8">
					<EmptyState
						title="هنوز اثری ثبت نشده"
						body="با افزودن اولین اثر، صفحه‌ی آثار و صفحه‌ی اول سایت پر می‌شوند."
						action={
							<Link to="/admin-panel/artworks/new" className="btn btn-primary">
								افزودن اثر
							</Link>
						}
					/>
				</div>
			) : null}

			<AdminPanel title="محتوا">
				<div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-4">
					<Metric
						label="آثار منتشرشده"
						value={data.counts.artworksPublished}
						hint={`${toPersianDigits(data.counts.artworksDraft)} پیش‌نویس`}
					/>
					<Metric label="مجموعه‌ها" value={data.counts.collections} />
					<Metric label="نمایشگاه‌ها" value={data.counts.exhibitions} />
					<Metric label="فایل‌های رسانه" value={data.counts.media} />
				</div>
			</AdminPanel>

			<AdminPanel
				title="بازدید"
				description="شمارش بازدیدهای ثبت‌شده‌ی سایت"
			>
				<div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-4">
					<Metric label="۷ روز اخیر" value={data.views.last7} />
					<Metric label="۳۰ روز اخیر" value={data.views.last30} />
					<Metric label="بازدیدکننده‌ی یکتا" value={data.views.uniqueLast30} />
					<Metric label="مجموع کل" value={data.views.total} />
				</div>
				{daily.length ? (
					<div className="mt-8 flex h-28 items-end gap-[3px]" dir="ltr">
						{daily.map((day) => (
							<div
								key={day.day}
								title={`${day.day}: ${day.total}`}
								className="flex-1 bg-accent/70"
								style={{
									height: `${Math.max(2, (day.total / max) * 100)}%`,
								}}
							/>
						))}
					</div>
				) : (
					<p className="t-small mt-6 text-muted">
						هنوز بازدیدی ثبت نشده است.
					</p>
				)}
			</AdminPanel>

			<div className="grid gap-0 lg:grid-cols-3 lg:gap-6">
				<List
					title="تازه‌ترین آثار"
					empty="اثری ثبت نشده است."
					rows={(data.latestArtworks ?? []).map((item) => ({
						key: item.id,
						label: item.title,
						meta: STATUS_LABEL[item.status] ?? item.status,
						to: `/admin-panel/artworks/${item.id}`,
					}))}
				/>
				<List
					title="پربازدیدترین"
					empty="بازدیدی ثبت نشده است."
					rows={(data.mostViewed ?? []).map((item) => ({
						key: item.id,
						label: item.title,
						meta: `${toPersianDigits(item.view_count)} بازدید`,
						to: `/admin-panel/artworks/${item.id}`,
					}))}
				/>
				<List
					title="آخرین تغییرات"
					empty="تغییری ثبت نشده است."
					rows={(data.recentlyEdited ?? []).map((item) => ({
						key: item.id,
						label: item.title,
						meta: formatDate(item.updated_at),
						to: `/admin-panel/artworks/${item.id}`,
					}))}
				/>
			</div>

			{data.counts.messagesNew > 0 ? (
				<AdminPanel title="پیام‌های خوانده‌نشده">
					<p className="t-body">
						{toPersianDigits(data.counts.messagesNew)} پیام تازه در صندوق تماس
						منتطر بررسی است.
					</p>
					<Link to="/admin-panel/messages" className="btn btn-ghost mt-5">
						دیدن پیام‌ها
					</Link>
				</AdminPanel>
			) : null}
		</>
	)
}
