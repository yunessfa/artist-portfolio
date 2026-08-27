import { useState } from "react"
import { useApi } from "@/hooks/useApi"
import { AdminHeader, AdminPanel } from "./Layout"
import { EmptyState, ErrorState, Spinner } from "@/components/Feedback"
import { api } from "@/lib/api"
import { formatDate, toPersianDigits } from "@/lib/format"
import type { Paginated } from "@/lib/types"

type Message = {
	id: number
	name: string
	email: string
	phone: string
	subject: string
	message: string
	is_read?: boolean
	created_at: string
}

type Filter = "all" | "unread"

export default function Messages() {
	const [filter, setFilter] = useState<Filter>("all")
	const [busyId, setBusyId] = useState<number | null>(null)
	const [actionError, setActionError] = useState<string | null>(null)
	const { data, loading, error, refetch } = useApi<Paginated<Message>>(
		"/contact-messages/",
		{ page_size: 50 },
		true,
	)

	const all = data?.results ?? []
	const rows = filter === "unread" ? all.filter((row) => !row.is_read) : all
	const unread = all.filter((row) => !row.is_read).length

	const act = async (id: number, fn: () => Promise<unknown>) => {
		setBusyId(id)
		setActionError(null)
		try {
			await fn()
			await refetch()
		} catch {
			setActionError("انجام عملیات ناموفق بود. دوباره تلاش کنید.")
		} finally {
			setBusyId(null)
		}
	}

	return (
		<>
			<AdminHeader
				title="پیام‌ها"
				subtitle={
					unread
						? `${toPersianDigits(unread)} پیام خوانده‌نشده`
						: "پیام‌های دریافتی از فرم تماس"
				}
			/>

			<div className="mb-6 flex flex-wrap gap-3">
				{(
					[
						["all", "همه"],
						["unread", "خوانده‌نشده"],
					] as Array<[Filter, string]>
				).map(([value, label]) => (
					<button
						key={value}
						type="button"
						className="btn btn-ghost"
						aria-pressed={filter === value}
						style={
							filter === value
								? {
										borderColor: "var(--text)",
										backgroundColor: "var(--surface-2)",
									}
								: undefined
						}
						onClick={() => setFilter(value)}
					>
						{label}
					</button>
				))}
			</div>

			{actionError ? (
				<p className="t-small mb-5 text-accent" role="alert">
					{actionError}
				</p>
			) : null}

			{loading ? (
				<AdminPanel>
					<Spinner label="دریافت پیام‌ها…" />
				</AdminPanel>
			) : error ? (
				<ErrorState
					title="پیام‌ها دریافت نشدند"
					body={error}
					onRetry={() => void refetch()}
				/>
			) : !rows.length ? (
				<EmptyState
					title={filter === "unread" ? "پیام خوانده‌نشده‌ای نیست" : "پیامی وجود ندارد"}
					body="پیام‌های فرم تماس به‌محض دریافت در اینجا نمایش داده می‌شوند."
				/>
			) : (
				<ul className="space-y-5">
					{rows.map((row) => (
						<li
							key={row.id}
							className="card-flat p-6 sm:p-7"
							aria-busy={busyId === row.id}
							style={
								busyId === row.id ? { opacity: 0.6 } : undefined
							}
						>
							<div className="flex flex-wrap items-baseline justify-between gap-4">
								<div>
									<p className="eyebrow">
										{row.is_read ? "خوانده‌شده" : "جدید"}
									</p>
									<h2 className="t-h3 mt-2 font-display">
										{row.subject || "بدون موضوع"}
									</h2>
								</div>
								<span className="t-caption text-muted">
									{formatDate(row.created_at)}
								</span>
							</div>

							<p className="t-caption mt-3 text-muted" dir="ltr">
								{row.name} · {row.email}
								{row.phone ? ` · ${toPersianDigits(row.phone)}` : ""}
							</p>

							<p className="t-body mt-5 whitespace-pre-line">{row.message}</p>

							<div className="mt-6 flex flex-wrap gap-4">
								<a href={`mailto:${row.email}`} className="btn btn-ghost">
									پاسخ با ایمیل
								</a>
								<button
									type="button"
									className="btn btn-ghost"
									disabled={busyId === row.id}
									onClick={() =>
										void act(row.id, () =>
											api.admin.patch(`/contact-messages/${row.id}/`, {
												is_read: !row.is_read,
											}),
										)
									}
								>
									{row.is_read ? "علامت خوانده‌نشده" : "خوانده شد"}
								</button>
								<button
									type="button"
									className="btn btn-ghost"
									disabled={busyId === row.id}
									onClick={() => {
										if (window.confirm("این پیام حذف شود؟")) {
											void act(row.id, () =>
												api.admin.delete(`/contact-messages/${row.id}/`),
											)
										}
									}}
								>
									حذف
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</>
	)
}
