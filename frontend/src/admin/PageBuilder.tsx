import { useEffect, useState } from "react"
import { useApi } from "@/hooks/useApi"
import { AdminHeader, AdminPanel } from "./Layout"
import { SortableList } from "./SortableList"
import { EmptyState, ErrorState, Spinner } from "@/components/Feedback"
import { api, ApiError } from "@/lib/api"
import type { Page, PageSection, Paginated } from "@/lib/types"

/**
 * SITE BUILDER
 *
 * Real operations only:
 *  - `GET /pages/` + `GET /pages/{slug}/` load pages and their sections
 *  - `GET /pages/section-catalog/` lists the section types the backend renders
 *  - `POST /page-sections/` adds a section, `reorder/` sorts, `toggle/` enables
 *  - `PATCH /page-sections/{id}/` saves content, `DELETE` removes
 */

type CatalogItem = { value?: string; key?: string; label?: string }

function catalogEntries(data: unknown): Array<{ value: string; label: string }> {
	const list = Array.isArray(data)
		? data
		: ((data as { results?: unknown[] } | null)?.results ?? [])
	return list
		.map((raw) => {
			if (typeof raw === "string") return { value: raw, label: raw }
			const item = raw as CatalogItem
			const value = item.value || item.key || ""
			return { value, label: item.label || value }
		})
		.filter((item) => item.value)
}

export default function PageBuilder() {
	const pagesQuery = useApi<Paginated<Page> | Page[]>(
		"/pages/",
		{ page_size: 50 },
		true,
	)
	const list = Array.isArray(pagesQuery.data)
		? pagesQuery.data
		: (pagesQuery.data?.results ?? [])

	const [slug, setSlug] = useState("")
	const pageQuery = useApi<Page>(slug ? `/pages/${slug}/` : null, undefined, true)
	const catalogQuery = useApi<unknown>("/pages/section-catalog/", undefined, true)
	const catalog = catalogEntries(catalogQuery.data)

	const [editing, setEditing] = useState<PageSection | null>(null)
	const [busy, setBusy] = useState(false)
	const [message, setMessage] = useState<string | null>(null)

	useEffect(() => {
		if (!slug && list.length) setSlug(list[0].slug)
	}, [list, slug])

	const act = async (fn: () => Promise<unknown>) => {
		setBusy(true)
		setMessage(null)
		try {
			await fn()
			await pageQuery.refetch()
		} catch (err) {
			setMessage(
				err instanceof ApiError
					? err.fieldLines.join(" ")
					: "انجام عملیات ناموفق بود.",
			)
		} finally {
			setBusy(false)
		}
	}

	const page = pageQuery.data
	const sections = (page?.sections || [])
		.slice()
		.sort((a, b) => a.order - b.order)
	const previewPath = page ? (page.slug === "home" ? "/" : `/${page.slug}`) : "/"

	if (pagesQuery.loading) {
		return (
			<>
				<AdminHeader title="صفحه‌ساز" />
				<AdminPanel>
					<Spinner label="دریافت صفحه‌ها…" />
				</AdminPanel>
			</>
		)
	}

	if (pagesQuery.error) {
		return (
			<>
				<AdminHeader title="صفحه‌ساز" />
				<ErrorState
					title="صفحه‌ها دریافت نشدند"
					body={pagesQuery.error}
					onRetry={() => void pagesQuery.refetch()}
				/>
			</>
		)
	}

	return (
		<>
			<AdminHeader
				title="صفحه‌ساز"
				subtitle="افزودن، ترتیب، فعال‌سازی و ویرایش بخش‌های هر صفحه"
				action={
					<a
						href={previewPath}
						target="_blank"
						rel="noreferrer"
						className="btn btn-ghost"
					>
						پیش‌نمایش صفحه ↗
					</a>
				}
			/>

			{message ? (
				<p className="t-small mb-5 text-accent" role="alert">
					{message}
				</p>
			) : null}

			<AdminPanel title="انتخاب صفحه">
				<div className="flex flex-wrap items-end gap-5">
					<div>
						<label className="field-label" htmlFor="page-select">
							صفحه
						</label>
						<select
							id="page-select"
							className="field max-w-xs"
							value={slug}
							onChange={(event) => {
								setEditing(null)
								setSlug(event.target.value)
							}}
						>
							{list.map((item) => (
								<option key={item.slug} value={item.slug}>
									{item.title}
								</option>
							))}
						</select>
					</div>

					{catalog.length ? (
						<form
							className="flex flex-wrap items-end gap-4"
							onSubmit={(event) => {
								event.preventDefault()
								if (!page) return
								const values = new FormData(event.currentTarget)
								void act(() =>
									api.admin.post("/page-sections/", {
										page: page.id,
										section_type: values.get("section_type"),
										is_enabled: true,
										order: sections.length + 1,
									}),
								)
							}}
						>
							<div>
								<label className="field-label" htmlFor="section-type">
									بخش تازه
								</label>
								<select
									id="section-type"
									name="section_type"
									className="field max-w-xs"
								>
									{catalog.map((item) => (
										<option key={item.value} value={item.value}>
											{item.label}
										</option>
									))}
								</select>
							</div>
							<button
								type="submit"
								className="btn btn-accent"
								disabled={busy || !page}
							>
								افزودن بخش
							</button>
						</form>
					) : null}
				</div>
			</AdminPanel>

			<AdminPanel
				title="بخش‌های صفحه"
				description="ترتیب بخش‌ها همان ترتیب نمایش در سایت است."
			>
				{pageQuery.loading ? (
					<Spinner label="دریافت بخش‌ها…" />
				) : pageQuery.error ? (
					<ErrorState
						title="بخش‌ها دریافت نشدند"
						body={pageQuery.error}
						onRetry={() => void pageQuery.refetch()}
					/>
				) : !sections.length ? (
					<EmptyState
						title="این صفحه بخشی ندارد"
						body="از فهرست بالا یک بخش انتخاب کنید و به صفحه اضافه کنید."
					/>
				) : (
					<div
						className={busy ? "pointer-events-none opacity-60" : undefined}
						aria-busy={busy}
					>
						<SortableList
							items={sections}
							onReorder={(ids) =>
								void act(() =>
									api.admin.post("/page-sections/reorder/", { order: ids }),
								)
							}
							renderItem={(section) => (
								<div className="flex flex-wrap items-center gap-4">
									<div className="min-w-44 flex-1">
										<p className="t-body">
											{section.heading || section.section_type}
										</p>
										<p className="t-caption text-muted" dir="ltr">
											{section.section_type}
										</p>
									</div>
									<span className="t-caption text-muted">
										{section.is_enabled ? "فعال" : "غیرفعال"}
									</span>
									<button
										type="button"
										className="btn btn-ghost"
										onClick={() =>
											void act(() =>
												api.admin.post(
													`/page-sections/${section.id}/toggle/`,
													{},
												),
											)
										}
									>
										{section.is_enabled ? "غیرفعال کن" : "فعال کن"}
									</button>
									<button
										type="button"
										className="btn btn-ghost"
										onClick={() => setEditing(section)}
									>
										ویرایش
									</button>
									<button
										type="button"
										className="btn btn-ghost"
										onClick={() => {
											if (window.confirm("این بخش حذف شود؟")) {
												setEditing(null)
												void act(() =>
													api.admin.delete(`/page-sections/${section.id}/`),
												)
											}
										}}
									>
										حذف
									</button>
								</div>
							)}
						/>
					</div>
				)}
			</AdminPanel>

			{editing ? (
				<AdminPanel title={`ویرایش بخش: ${editing.section_type}`}>
					<form
						onSubmit={(event) => {
							event.preventDefault()
							const form = new FormData(event.currentTarget)
							void act(async () => {
								await api.admin.patch(`/page-sections/${editing.id}/`, {
									eyebrow: form.get("eyebrow"),
									heading: form.get("heading"),
									subheading: form.get("subheading"),
									body: form.get("body"),
									background: form.get("background"),
									spacing: form.get("spacing"),
								})
								setEditing(null)
							})
						}}
					>
						<div className="grid gap-6 sm:grid-cols-2">
							<div>
								<label className="field-label" htmlFor="sec-eyebrow">
									روتیتر
								</label>
								<input
									id="sec-eyebrow"
									name="eyebrow"
									className="field"
									defaultValue={editing.eyebrow}
								/>
							</div>
							<div>
								<label className="field-label" htmlFor="sec-heading">
									عنوان
								</label>
								<input
									id="sec-heading"
									name="heading"
									className="field"
									defaultValue={editing.heading}
								/>
							</div>
							<div>
								<label className="field-label" htmlFor="sec-subheading">
									زیرعنوان
								</label>
								<input
									id="sec-subheading"
									name="subheading"
									className="field"
									defaultValue={editing.subheading}
								/>
							</div>
							<div>
								<label className="field-label" htmlFor="sec-background">
									پس‌زمینه
								</label>
								<select
									id="sec-background"
									name="background"
									className="field"
									defaultValue={editing.background}
								>
									<option value="default">پیش‌فرض</option>
									<option value="surface">روشن</option>
									<option value="surface2">کرمی</option>
									<option value="accent">تأکیدی</option>
								</select>
							</div>
							<div>
								<label className="field-label" htmlFor="sec-spacing">
									فاصله‌گذاری
								</label>
								<select
									id="sec-spacing"
									name="spacing"
									className="field"
									defaultValue={editing.spacing}
								>
									<option value="compact">فشرده</option>
									<option value="normal">معمول</option>
									<option value="spacious">باز</option>
								</select>
							</div>
						</div>

						<div className="mt-6">
							<label className="field-label" htmlFor="sec-body">
								متن
							</label>
							<textarea
								id="sec-body"
								name="body"
								className="field min-h-36"
								defaultValue={editing.body}
							/>
						</div>

						<div className="mt-7 flex flex-wrap gap-4">
							<button type="submit" className="btn btn-primary" disabled={busy}>
								{busy ? "در حال ذخیره…" : "ذخیره"}
							</button>
							<button
								type="button"
								className="btn btn-ghost"
								onClick={() => setEditing(null)}
							>
								انصراف
							</button>
						</div>
					</form>
				</AdminPanel>
			) : null}
		</>
	)
}
